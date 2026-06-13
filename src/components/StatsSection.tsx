import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLocalReactive } from "@/lib/hooks";
import { storage } from "@/lib/storage";
import { getBodyProfile, PROTEIN_PER_KG } from "@/lib/bodyProfile";
import type { MealEntry } from "@/lib/types";

const DAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

function getMondayOfWeek(d: Date) {
  const monday = new Date(d);
  const dow = monday.getDay();
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getThisWeekEntries(history: MealEntry[]) {
  const monday = getMondayOfWeek(new Date());
  return history.filter((e) => new Date(e.date) >= monday);
}

function calcWeeklyAverages(entries: MealEntry[]) {
  if (!entries.length) return null;
  const dayKeys = new Set(entries.map((e) => new Date(e.date).toDateString()));
  const daysWithMeals = dayKeys.size || 1;
  const sum = entries.reduce(
    (acc, e) => {
      acc.cal += e.recette.calories;
      acc.p += e.recette.proteines;
      acc.g += e.recette.glucides;
      acc.l += e.recette.lipides;
      return acc;
    },
    { cal: 0, p: 0, g: 0, l: 0 },
  );
  return {
    daysWithMeals,
    avgCalories: sum.cal / daysWithMeals,
    avgProteines: sum.p / daysWithMeals,
    avgGlucides: sum.g / daysWithMeals,
    avgLipides: sum.l / daysWithMeals,
  };
}

function RingChart({
  percentage,
  color,
  size = 90,
  strokeWidth = 8,
  centerValue,
  centerUnit,
  label,
  animate,
}: {
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  centerValue: string;
  centerUnit: string;
  label: string;
  animate: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = animate ? Math.min(percentage, 100) : 0;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F0F0EE"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="15"
          fontWeight={700}
          fill="#1A1A1A"
        >
          {centerValue}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fill="#9CA3AF"
        >
          {centerUnit}
        </text>
      </svg>
      <span className="text-center text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function MacroBarRow({
  emoji,
  label,
  value,
  target,
  color,
  animate,
}: {
  emoji: string;
  label: string;
  value: number;
  target: number;
  color: string;
  animate: boolean;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">
          {emoji} {label}
        </span>
        <span className="text-muted-foreground">
          {Math.round(value)}g / {Math.round(target)}g
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "#F0F0EE",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${animate ? pct : 0}%`,
            height: "100%",
            background: color,
            borderRadius: 99,
            transition: "width 800ms ease",
          }}
        />
      </div>
    </div>
  );
}

export function StatsSection() {
  const history = useLocalReactive(() => storage.getHistory());
  const sess = useLocalReactive(() => storage.getSessionUser());
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const body = useMemo(() => getBodyProfile(), [history]);
  const weekEntries = useMemo(() => getThisWeekEntries(history), [history]);
  const avgs = useMemo(() => calcWeeklyAverages(weekEntries), [weekEntries]);

  // Empty state
  if (history.length === 0) {
    return (
      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold">📊 Mes statistiques</h2>
          <span className="text-[13px] text-muted-foreground">Cette semaine</span>
        </div>
        <div
          className="rounded-2xl p-6 text-center"
          style={{ border: "1.5px dashed #D4D4D8", background: "#FAFAF8" }}
        >
          <div className="text-4xl">📊</div>
          <p className="mt-2 text-sm font-semibold">Vos stats apparaîtront ici</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cuisinez vos premières recettes et enregistrez-les pour suivre votre progression
          </p>
          <Link
            to="/frigo"
            search={{ mode: "photo" as const }}
            className="mt-3 inline-block rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary"
          >
            Scanner mon frigo →
          </Link>
        </div>
      </section>
    );
  }

  const weight = body?.poidsKg ?? 70;
  const tdee = body?.tdee ?? 2000;
  const activity = body?.activityLevel ?? "modere";
  const proteinTarget = Math.round(weight * PROTEIN_PER_KG[activity]);

  const program = sess?.program ?? "Maintien";
  let proteinG = weight * 1.4;
  let carbsG = (tdee * 0.45) / 4;
  let fatG = (tdee * 0.3) / 9;
  if (program === "Prise de masse") {
    proteinG = weight * 2.0;
    carbsG = (tdee * 0.45) / 4;
    fatG = (tdee * 0.25) / 9;
  } else if (program === "Sèche") {
    proteinG = weight * 2.2;
    carbsG = 100;
    fatG = (tdee * 0.3) / 9;
  } else if (program === "Perte de poids") {
    proteinG = weight * 1.6;
    carbsG = (tdee * 0.4) / 4;
    fatG = (tdee * 0.25) / 9;
  }

  const daysWithMeals = avgs?.daysWithMeals ?? 0;
  const avgCal = Math.round(avgs?.avgCalories ?? 0);
  const avgProt = Math.round(avgs?.avgProteines ?? 0);

  const calPct = (avgCal / tdee) * 100;
  const daysPct = (daysWithMeals / 7) * 100;
  const protPct = proteinTarget > 0 ? (avgProt / proteinTarget) * 100 : 0;

  // Per-day flags for consistency bar (Mon..Sun)
  const monday = getMondayOfWeek(new Date());
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const k = d.toDateString();
    const has = history.some((h) => new Date(h.date).toDateString() === k);
    const isToday = k === new Date().toDateString();
    return { has, isToday, initial: DAY_INITIALS[i] };
  });

  const streakColor =
    daysWithMeals >= 5 ? "#4CAF82" : daysWithMeals >= 3 ? "#F59E0B" : "#9CA3AF";

  let motivation = {
    text: "🍽 Cuisinez votre premier repas pour voir vos stats ici !",
    color: "#9CA3AF",
  };
  if (daysWithMeals >= 5)
    motivation = {
      text: "🏆 Excellente semaine ! Continuez comme ça.",
      color: "#4CAF82",
    };
  else if (daysWithMeals >= 3)
    motivation = {
      text: "💪 Bonne progression, ne lâchez pas !",
      color: "#F59E0B",
    };
  else if (daysWithMeals >= 1)
    motivation = {
      text: "📈 Démarrage en cours, restez régulier !",
      color: "#6B7280",
    };

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold">📊 Mes statistiques</h2>
        <span className="text-[13px] text-muted-foreground">Cette semaine</span>
      </div>

      {/* Rings */}
      <div
        className="rounded-2xl bg-white p-5"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
      >
        <div className="grid grid-cols-3 gap-2">
          <RingChart
            percentage={calPct}
            color="#F97316"
            centerValue={`${avgCal}`}
            centerUnit="kcal"
            label="Calories moy."
            animate={animate}
          />
          <RingChart
            percentage={daysPct}
            color="#4CAF82"
            centerValue={`${daysWithMeals}/7`}
            centerUnit="repas"
            label="Jours actifs"
            animate={animate}
          />
          <RingChart
            percentage={protPct}
            color="#3B82F6"
            centerValue={`${avgProt}g`}
            centerUnit="/ jour"
            label="Protéines moy."
            animate={animate}
          />
        </div>
      </div>

      {/* Weekly consistency */}
      <div
        className="mt-3 rounded-2xl bg-white p-4"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
      >
        <p className="text-[13px] text-muted-foreground">Régularité cette semaine</p>
        <div className="mt-3 flex justify-between">
          {days.map((d, i) => {
            const filled = d.has;
            const bg = filled ? "#4CAF82" : "transparent";
            const border = d.isToday
              ? filled
                ? "2px solid #4CAF82"
                : "2px solid #F97316"
              : filled
                ? "2px solid #4CAF82"
                : "1.5px solid #D4D4D8";
            const fg = filled ? "#FFFFFF" : "#9CA3AF";
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: bg,
                    border,
                    color: fg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {d.initial}
                </div>
                <span className="text-[10px] text-muted-foreground">{d.initial}</span>
              </div>
            );
          })}
        </div>
        <p
          className="mt-3 text-center text-xs font-semibold"
          style={{ color: streakColor }}
        >
          {daysWithMeals} jour{daysWithMeals > 1 ? "s" : ""} sur 7 cette semaine
        </p>
      </div>

      {/* Macro breakdown */}
      <div
        className="mt-3 rounded-2xl bg-white p-4"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-bold">Répartition macros</span>
          <span className="text-xs text-muted-foreground">Moy. journalière</span>
        </div>
        <div className="space-y-3">
          <MacroBarRow
            emoji="💪"
            label="Protéines"
            value={avgs?.avgProteines ?? 0}
            target={proteinG}
            color="#3B82F6"
            animate={animate}
          />
          <MacroBarRow
            emoji="🌾"
            label="Glucides"
            value={avgs?.avgGlucides ?? 0}
            target={carbsG}
            color="#F59E0B"
            animate={animate}
          />
          <MacroBarRow
            emoji="🥑"
            label="Lipides"
            value={avgs?.avgLipides ?? 0}
            target={fatG}
            color="#EF4444"
            animate={animate}
          />
        </div>
      </div>

      {/* Motivational message */}
      <p
        className="mt-3 text-center text-sm font-semibold"
        style={{ color: motivation.color }}
      >
        {motivation.text}
      </p>
    </section>
  );
}
