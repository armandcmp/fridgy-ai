import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { storage } from "@/lib/storage";
import type { Program } from "@/lib/types";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const PROGRAMS: { name: Program; emoji: string; kcal: number; desc: string }[] = [
  { name: "Perte de poids", emoji: "🔥", kcal: 1800, desc: "Léger et rassasiant" },
  { name: "Prise de masse", emoji: "💪", kcal: 2800, desc: "Riche en protéines & calories" },
  { name: "Équilibre", emoji: "⚖️", kcal: 2200, desc: "Polyvalent au quotidien" },
  { name: "Végétarien", emoji: "🌱", kcal: 2000, desc: "Sans viande ni poisson" },
  { name: "Sport / Performance", emoji: "⚡", kcal: 2600, desc: "Pour les actifs" },
];

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    if (storage.getUser()) nav({ to: "/" });
  }, [nav]);

  const finish = () => {
    if (!name || !program) return;
    const p = PROGRAMS.find((x) => x.name === program)!;
    storage.setUser({ name, program, dailyKcal: p.kcal });
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-5xl">🥦</div>
          <h1 className="mt-3 text-2xl font-bold">FridgeChef</h1>
          <p className="text-sm text-muted-foreground">
            Vos ingrédients, vos recettes
          </p>
        </div>

        {step === 0 && (
          <div className="fc-card animate-fade-up p-6">
            <h2 className="text-lg font-semibold">Comment vous appelez-vous ?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pour personnaliser votre espace.
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre prénom"
              className="mt-5 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
            />
            <button
              onClick={() => name.trim() && setStep(1)}
              disabled={!name.trim()}
              className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              Continuer
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-up">
            <h2 className="text-lg font-semibold">Choisissez votre programme</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              On adaptera les recettes à votre objectif.
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
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.desc}</div>
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
              Commencer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
