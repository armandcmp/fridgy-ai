import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Keyboard, Mic, Plus, X, Sparkles, Brain } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { checkGate, bumpUsage } from "@/lib/freemium";
import { getLanguage } from "@/lib/i18n";
import { getCurrentMeal } from "@/lib/meal";
import { getBodyProfile } from "@/lib/bodyProfile";
import {
  extractFromImage,
  extractIngredients,
  generateRecipes,
} from "@/lib/ai.functions";
import { PaywallModal } from "@/components/PaywallModal";
import { VoiceOverlay } from "@/components/VoiceOverlay";

type ModeParam = "photo" | "voice" | "manual";

export const Route = createFileRoute("/frigo")({
  validateSearch: (s: Record<string, unknown>): { mode?: ModeParam } => {
    const m = s.mode;
    return m === "photo" || m === "voice" || m === "manual" ? { mode: m } : {};
  },
  component: Frigo,
});

type Mode = "menu" | "manual";

function Frigo() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const search = Route.useSearch();
  const user = useLocalReactive(() => storage.getUser());
  const memory = useLocalReactive(() => storage.getMemory());
  const [mode, setMode] = useState<Mode>("menu");
  const [items, setItems] = useState<string[]>(() => storage.getSession());
  const [manualInput, setManualInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [scanTip, setScanTip] = useState(false);
  const [scanTipHide, setScanTipHide] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openCamera = () => {
    if (localStorage.getItem("fridgy_scan_tip_hidden") === "1") {
      fileRef.current?.click();
    } else {
      setScanTipHide(false);
      setScanTip(true);
    }
  };

  const confirmScanTip = () => {
    if (scanTipHide) localStorage.setItem("fridgy_scan_tip_hidden", "1");
    setScanTip(false);
    setTimeout(() => fileRef.current?.click(), 50);
  };

  const extractImg = useServerFn(extractFromImage);
  const extractTxt = useServerFn(extractIngredients);
  const genRecipes = useServerFn(generateRecipes);

  const consumedRef = useRef(false);
  useEffect(() => {
    if (consumedRef.current || !search.mode) return;
    consumedRef.current = true;
    const m = search.mode;
    if (m === "photo") setTimeout(() => fileRef.current?.click(), 50);
    else if (m === "manual") setMode("manual");
    else if (m === "voice") setVoiceOpen(true);
    nav({ to: "/frigo", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.mode]);

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .replace(/s$/, "");

  const addItem = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    const key = normalize(v);
    if (!key) return;
    setItems((prev) =>
      prev.some((p) => normalize(p) === key) ? prev : [...prev, v],
    );
  };
  const addMany = (list: string[]) => {
    setItems((prev) => {
      const set = new Set(prev.map((p) => normalize(p)));
      const next = [...prev];
      for (const v of list) {
        const x = v.trim();
        const key = normalize(x);
        if (key && !set.has(key)) {
          next.push(x);
          set.add(key);
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

  const handleVoiceTranscript = async (transcript: string) => {
    setBusy(true);
    try {
      const { ingredients } = await extractTxt({
        data: { text: transcript, lang: getLanguage() },
      });
      addMany(ingredients);
      toast.success(t("frigo.added", { count: ingredients.length }));
    } finally {
      setBusy(false);
    }
  };

  const handleVoiceFallback = (m: "photo" | "manual") => {
    setVoiceOpen(false);
    if (m === "photo") setTimeout(() => fileRef.current?.click(), 50);
    else setMode("manual");
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
      const mealType = getCurrentMeal();
      const bp = getBodyProfile();
      const bodyProfile = bp
        ? {
            age: bp.age,
            sexe: bp.sexe,
            tailleCm: bp.tailleCm,
            poidsKg: bp.poidsKg,
            poidsObjectifKg: bp.poidsObjectifKg,
            imc: bp.imc,
            imcCategory: bp.imcCategory,
            activityLevel: bp.activityLevel,
            tdee: bp.tdee,
          }
        : undefined;
      const recentTitles = storage
        .getAllRecipes()
        .slice(0, 6)
        .map((r) => r.titre);
      const { recettes } = await genRecipes({
        data: {
          ingredients: items,
          program: user.program,
          lang: getLanguage(),
          mealType,
          bodyProfile,
          recentTitles,
        },
      });
      const withIds = recettes.map((r, i) => ({
        ...r,
        id: `${Date.now()}-${i}`,
        program: user.program,
        mealType,
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
          {[
            { onClick: () => fileRef.current?.click(), disabled: busy, Icon: Camera, title: t("frigo.photo"), sub: t("frigo.photoSub"), from: "#E9FBF3", to: "#CFF5E4", accent: "#2DD4A8" },
            { onClick: () => setMode("manual"), disabled: false, Icon: Keyboard, title: t("frigo.manual"), sub: t("frigo.manualSub"), from: "#EEF2FF", to: "#DDE6FF", accent: "#3B82F6" },
            { onClick: () => setVoiceOpen(true), disabled: busy, Icon: Mic, title: t("frigo.voice"), sub: t("frigo.voiceSub"), from: "#F5EEFF", to: "#E7DAFF", accent: "#8B5CF6" },
          ].map(({ onClick, disabled, Icon, title, sub, from, to, accent }) => (
            <button
              key={title}
              onClick={onClick}
              disabled={disabled}
              className="flex items-center text-left transition active:scale-[0.98] disabled:opacity-60"
              style={{
                gap: 16,
                padding: "18px 18px",
                borderRadius: 22,
                background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
                border: "1.5px solid transparent",
                boxShadow: "0 2px 10px rgba(15,27,23,0.04)",
              }}
            >
              <div
                className="grid place-items-center text-white"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: accent,
                  boxShadow: `0 6px 14px ${accent}55`,
                  flexShrink: 0,
                }}
              >
                <Icon size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-extrabold tracking-tight" style={{ color: "#0F1B17" }}>{title}</div>
                <div className="text-[12px]" style={{ color: "#5A6B62" }}>{sub}</div>
              </div>
            </button>
          ))}
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

      <VoiceOverlay
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onTranscript={handleVoiceTranscript}
        onFallback={handleVoiceFallback}
      />
    </div>
  );
}
