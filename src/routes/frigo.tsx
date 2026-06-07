import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Keyboard, Mic, Plus, X, Sparkles, Brain } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { isSpeechSupported, startVoiceRecognition } from "@/lib/voice";
import { checkGate, bumpUsage } from "@/lib/freemium";
import { getLanguage } from "@/lib/i18n";
import {
  extractFromImage,
  extractIngredients,
  generateRecipes,
} from "@/lib/ai.functions";
import { PaywallModal } from "@/components/PaywallModal";

export const Route = createFileRoute("/frigo")({
  component: Frigo,
});

type Mode = "menu" | "manual" | "voice";

function Frigo() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useLocalReactive(() => storage.getUser());
  const memory = useLocalReactive(() => storage.getMemory());
  const [mode, setMode] = useState<Mode>("menu");
  const [items, setItems] = useState<string[]>(() => storage.getSession());
  const [manualInput, setManualInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const recogRef = useRef<unknown | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const extractImg = useServerFn(extractFromImage);
  const extractTxt = useServerFn(extractIngredients);
  const genRecipes = useServerFn(generateRecipes);

  const addItem = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setItems((prev) =>
      prev.some((p) => p.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v],
    );
  };
  const addMany = (list: string[]) => {
    setItems((prev) => {
      const set = new Set(prev.map((p) => p.toLowerCase()));
      const next = [...prev];
      for (const v of list) {
        const x = v.trim();
        if (x && !set.has(x.toLowerCase())) {
          next.push(x);
          set.add(x.toLowerCase());
        }
      }
      return next;
    });
  };
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const handlePhoto = async (file: File) => {
    setBusy(true);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { ingredients } = await extractImg({ data: { imageBase64: b64, lang: getLanguage() } });
      addMany(ingredients);
      toast.success(t("frigo.detected", { count: ingredients.length }));
      setMode("menu");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const toggleRecord = () => {
    if (recording) {
      try {
        (recogRef.current as { stop?: () => void } | null)?.stop?.();
      } catch {
        /* */
      }
      setRecording(false);
      return;
    }
    if (!isSpeechSupported()) {
      toast.error(t("frigo.voiceUnsupported"));
      return;
    }
    setRecording(true);
    recogRef.current = startVoiceRecognition(
      async (transcript) => {
        setRecording(false);
        setBusy(true);
        try {
          const { ingredients } = await extractTxt({
            data: { text: transcript, lang: getLanguage() },
          });
          addMany(ingredients);
          toast.success(t("frigo.added", { count: ingredients.length }));
          setMode("menu");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erreur");
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setRecording(false);
        toast.error(t("frigo.micError", { err }));
      },
    );
  };

  const generate = async () => {
    if (!user || items.length === 0) return;
    const gate = checkGate("recipes");
    if (!gate.allowed) {
      setPaywall(true);
      return;
    }
    setGenerating(true);
    try {
      const { recettes } = await genRecipes({
        data: { ingredients: items, program: user.program, lang: getLanguage() },
      });
      const withIds = recettes.map((r, i) => ({
        ...r,
        id: `${Date.now()}-${i}`,
        program: user.program,
      }));
      storage.setRecipes(withIds);
      storage.setSession(items);
      storage.rememberIngredients(items);
      bumpUsage("recipes");
      nav({ to: "/recettes" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("recipe.generationError"));
    } finally {
      setGenerating(false);
    }
  };

  const topMem = memory.ingredients.slice(0, 6);

  return (
    <div className="px-5 pt-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">{t("frigo.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("frigo.subtitle")}</p>
      </header>

      {topMem.length > 0 && (
        <section className="fc-card mb-5 p-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
            <Brain size={16} className="text-primary" /> {t("frigo.habits")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("frigo.habitsSub")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {topMem.map((m) => (
              <button
                key={m.nom}
                onClick={() => addItem(m.nom)}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition active:scale-95"
              >
                <Plus size={12} /> {m.nom}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {t("frigo.habitsBasis", { count: memory.ingredients.length })}
          </p>
        </section>
      )}

      {mode === "menu" && (
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="fc-card flex items-center gap-4 p-4 text-left transition active:scale-[0.98] disabled:opacity-60"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
              <Camera size={20} />
            </div>
            <div>
              <div className="font-semibold">{t("frigo.photo")}</div>
              <div className="text-xs text-muted-foreground">{t("frigo.photoSub")}</div>
            </div>
          </button>
          <button
            onClick={() => setMode("manual")}
            className="fc-card flex items-center gap-4 p-4 text-left transition active:scale-[0.98]"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-sky-100 text-sky-700">
              <Keyboard size={20} />
            </div>
            <div>
              <div className="font-semibold">{t("frigo.manual")}</div>
              <div className="text-xs text-muted-foreground">{t("frigo.manualSub")}</div>
            </div>
          </button>
          <button
            onClick={() => { setMode("voice"); toggleRecord(); }}
            disabled={busy}
            className={`fc-card flex items-center gap-4 p-4 text-left transition active:scale-[0.98] disabled:opacity-60 ${
              recording ? "ring-2 ring-destructive" : ""
            }`}
          >
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${
              recording ? "bg-destructive/15 text-destructive" : "bg-violet-100 text-violet-700"
            }`}>
              <Mic size={20} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{t("frigo.voice")}</div>
              <div className="text-xs text-muted-foreground">
                {recording ? t("frigo.voiceListening") : t("frigo.voiceSub")}
              </div>
            </div>
            {recording && <span className="h-3 w-3 rounded-full bg-destructive animate-pulse-rec" />}
          </button>
        </div>
      )}

      {mode === "manual" && (
        <div className="fc-card animate-fade-up p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t("frigo.manualTitle")}</h3>
            <button onClick={() => setMode("menu")} className="text-xs text-muted-foreground">
              ← {t("common.back")}
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addItem(manualInput);
              setManualInput("");
            }}
            className="mt-3 flex gap-2"
          >
            <input
              autoFocus
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={t("frigo.placeholder")}
              className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
              <Plus size={18} />
            </button>
          </form>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handlePhoto(f);
          e.target.value = "";
        }}
      />

      {busy && (
        <div className="mt-4 fc-card animate-fade-up p-4 text-sm text-muted-foreground">
          {t("frigo.analyzing")}
        </div>
      )}

      {items.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">{t("frigo.myIngredients", { count: items.length })}</h2>
          <div className="flex flex-wrap gap-2">
            {items.map((it, i) => (
              <span
                key={`${it}-${i}`}
                className="animate-fade-up inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {it}
                <button onClick={() => removeItem(i)} aria-label={t("frigo.remove")}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Sparkles size={16} />
            {generating ? t("recipe.generating") : t("recipe.generate")}
          </button>
        </section>
      )}

      <PaywallModal open={paywall} onClose={() => setPaywall(false)} reason={t("paywall.limitRecipes")} />
    </div>
  );
}
