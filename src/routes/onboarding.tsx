import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { storage, AVATAR_COLORS } from "@/lib/storage";
import type { Program } from "@/lib/types";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const PROGRAMS: { key: string; name: Program; emoji: string; kcal: number }[] = [
  { key: "bulk", name: "Prise de masse", emoji: "💪", kcal: 2800 },
  { key: "cut", name: "Sèche", emoji: "🔥", kcal: 1900 },
  { key: "loss", name: "Perte de poids", emoji: "⚖️", kcal: 1800 },
  { key: "balance", name: "Équilibre", emoji: "🥗", kcal: 2200 },
  { key: "pleasure", name: "Plaisir", emoji: "🍕", kcal: 2400 },
];

function Onboarding() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    if (storage.getUser()) nav({ to: "/" });
  }, [nav]);

  const finish = () => {
    if (!name || !program) return;
    const p = PROGRAMS.find((x) => x.name === program)!;
    storage.setUser({ name, program, dailyKcal: p.kcal, avatarColor: AVATAR_COLORS[0] });
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-5xl">🥦</div>
          <h1 className="mt-3 text-2xl font-bold">{t("app.name")}</h1>
          <p className="text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>

        {step === 0 && (
          <div className="fc-card animate-fade-up p-6">
            <h2 className="text-lg font-semibold">{t("onboarding.question")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("onboarding.question.sub")}
            </p>
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
            <p className="mt-1 text-sm text-muted-foreground">
              {t("onboarding.programSub")}
            </p>
            <div className="mt-5 space-y-3">
              {PROGRAMS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setProgram(p.name)}
                  className={`fc-card flex w-full items-center gap-4 p-4 text-left transition ${
                    program === p.name ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{t(`program.${p.key}`)}</div>
                    <div className="text-xs text-muted-foreground">
                      {t(`program.desc.${p.key}`)}
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
