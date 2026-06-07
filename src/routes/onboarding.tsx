import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { storage } from "@/lib/storage";
import { setLanguage, type Lang, LANG_KEY } from "@/lib/i18n";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

type Slug = "bulk" | "cut" | "loss" | "maintain";

const PROGRAMS: { slug: Slug; emoji: string; kcal: number; color: string }[] = [
  { slug: "bulk", emoji: "💪", kcal: 2800, color: "#3B82F6" },
  { slug: "cut", emoji: "🔥", kcal: 1900, color: "#F97316" },
  { slug: "loss", emoji: "⚖️", kcal: 1800, color: "#4CAF82" },
  { slug: "maintain", emoji: "🎯", kcal: 2200, color: "#14B8A6" },
];

const LANGS: { code: Lang; flag: string; name: string; cta: string }[] = [
  { code: "fr", flag: "🇫🇷", name: "Français", cta: "Continuer →" },
  { code: "en", flag: "🇬🇧", name: "English", cta: "Continue →" },
  { code: "es", flag: "🇪🇸", name: "Español", cta: "Continuar →" },
  { code: "pt", flag: "🇧🇷", name: "Português", cta: "Continuar →" },
  { code: "zh", flag: "🇨🇳", name: "中文", cta: "继续 →" },
];

function Onboarding() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [hasLang, setHasLang] = useState<boolean | null>(null);
  const [step, setStep] = useState(0); // 0 = lang, 1 = name, 2 = program
  const [pickedLang, setPickedLang] = useState<Lang | null>(null);
  const [name, setName] = useState("");
  const [program, setProgram] = useState<Slug | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (storage.getUser()) {
      nav({ to: "/" });
      return;
    }
    const stored = localStorage.getItem(LANG_KEY);
    setHasLang(!!stored);
    setStep(stored ? 1 : 0);
  }, [nav]);

  if (hasLang === null) return null;

  const confirmLang = () => {
    if (!pickedLang) return;
    setLanguage(pickedLang);
    setStep(1);
  };

  const finish = () => {
    if (!name || !program) return;
    const p = PROGRAMS.find((x) => x.slug === program)!;
    storage.setUser({
      name,
      program: t(`program.${program}`),
      dailyKcal: p.kcal,
    });
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-sm">
        {step === 0 && (
          <div className="animate-fade-up">
            <div className="mb-6 text-center">
              <div className="text-5xl">🌍</div>
              <div className="mt-4 space-y-0.5 text-[13px] text-muted-foreground">
                <div>Choisissez votre langue</div>
                <div>Choose your language</div>
                <div>Elige tu idioma</div>
                <div>Escolha seu idioma</div>
                <div>选择您的语言</div>
              </div>
            </div>
            <div className="space-y-2.5">
              {LANGS.map((l) => {
                const selected = pickedLang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => setPickedLang(l.code)}
                    className="flex w-full items-center gap-3 bg-card px-4 transition active:scale-[0.98]"
                    style={{
                      height: 58,
                      borderRadius: 14,
                      border: selected ? "2px solid #4CAF82" : "1px solid var(--border)",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                    }}
                  >
                    <span className="text-2xl" style={{ fontSize: 32 }}>
                      {l.flag}
                    </span>
                    <span className="flex-1 text-left text-[15px] font-medium">
                      {l.name}
                    </span>
                    {selected && <span className="text-primary">✓</span>}
                  </button>
                );
              })}
            </div>
            <button
              onClick={confirmLang}
              disabled={!pickedLang}
              className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {pickedLang
                ? LANGS.find((l) => l.code === pickedLang)!.cta
                : "Continuer →"}
            </button>
          </div>
        )}

        {step >= 1 && (
          <div className="mb-8 text-center">
            <div className="text-5xl">🥦</div>
            <h1 className="mt-3 text-2xl font-bold">FridgeChef</h1>
            <p className="text-sm text-muted-foreground">{t("onboarding.tagline")}</p>
          </div>
        )}

        {step === 1 && (
          <div className="fc-card animate-fade-up p-6">
            <h2 className="text-lg font-semibold">{t("onboarding.question")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("onboarding.questionSub")}
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("onboarding.namePlaceholder")}
              className="mt-5 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
            />
            <button
              onClick={() => name.trim() && setStep(2)}
              disabled={!name.trim()}
              className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {t("common.continue")}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up">
            <h2 className="text-lg font-semibold">{t("onboarding.programTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("onboarding.programSub")}
            </p>
            <div className="mt-5 space-y-3">
              {PROGRAMS.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setProgram(p.slug)}
                  className={`fc-card flex w-full items-center gap-4 p-4 text-left transition ${
                    program === p.slug ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{t(`program.${p.slug}`)}</div>
                    <div className="text-xs text-muted-foreground">
                      {t(`program.${p.slug}Desc`)}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{p.kcal} kcal</span>
                </button>
              ))}
            </div>
            <button
              onClick={finish}
              disabled={!program}
              className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {t("onboarding.start")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
