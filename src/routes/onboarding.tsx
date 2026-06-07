import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { storage } from "@/lib/storage";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

type Slug = "bulk" | "cut" | "loss" | "balance" | "pleasure";

const PROGRAMS: { slug: Slug; emoji: string; kcal: number }[] = [
  { slug: "bulk", emoji: "💪", kcal: 2800 },
  { slug: "cut", emoji: "🔥", kcal: 1900 },
  { slug: "loss", emoji: "⚖️", kcal: 1800 },
  { slug: "balance", emoji: "🥗", kcal: 2200 },
  { slug: "pleasure", emoji: "🍕", kcal: 2500 },
];

function Onboarding() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [program, setProgram] = useState<Slug | null>(null);

  useEffect(() => {
    if (storage.getUser()) nav({ to: "/" });
  }, [nav]);

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
        <div className="mb-8 text-center">
          <div className="text-5xl">🥦</div>
          <h1 className="mt-3 text-2xl font-bold">FridgeChef</h1>
          <p className="text-sm text-muted-foreground">{t("onboarding.tagline")}</p>
        </div>

        {step === 0 && (
          <div className="fc-card animate-fade-up p-6">
            <h2 className="text-lg font-semibold">{t("onboarding.question")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("onboarding.questionSub")}</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("onboarding.namePlaceholder")}
              className="mt-5 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
            />
            <button
              onClick={() => name.trim() && setStep(1)}
              disabled={!name.trim()}
              className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {t("common.continue")}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-up">
            <h2 className="text-lg font-semibold">{t("onboarding.programTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("onboarding.programSub")}</p>
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
                    <div className="text-xs text-muted-foreground">{t(`program.${p.slug}Desc`)}</div>
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
