import type { Recipe } from "@/lib/types";

export type ScoreLevel = "excellent" | "good" | "medium" | "poor";

const CONFIG: Record<ScoreLevel, { color: string; label: string; icon: string }> = {
  excellent: { color: "var(--score-excellent)", label: "Excellent", icon: "A" },
  good:      { color: "var(--score-good)",      label: "Bon",       icon: "B" },
  medium:    { color: "var(--score-medium)",    label: "Moyen",     icon: "~" },
  poor:      { color: "var(--score-poor)",      label: "À limiter", icon: "!" },
};

/** Derive a score from a recipe. Uses pourquoiAdapte presence + calorie heuristic. */
export function recipeScore(recipe: Recipe): ScoreLevel {
  const cal = recipe.calories ?? 0;
  const hasReason = !!recipe.pourquoiAdapte && recipe.pourquoiAdapte.length > 10;
  if (hasReason && cal > 0 && cal <= 500) return "excellent";
  if (hasReason && cal <= 700) return "good";
  if (cal > 0 && cal <= 800) return "medium";
  return "good";
}

export function NutriScoreBadge({
  score,
  size = 44,
  showLabel = true,
}: {
  score: ScoreLevel;
  size?: number;
  showLabel?: boolean;
}) {
  const c = CONFIG[score];
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="grid place-items-center font-bold text-white shadow-md"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: c.color,
          fontSize: size * 0.45,
          boxShadow: `0 4px 12px ${c.color.startsWith("var") ? "rgba(45,139,87,.28)" : c.color + "44"}`,
          fontFamily: "Fredoka, system-ui, sans-serif",
        }}
        aria-label={`Score: ${c.label}`}
      >
        {c.icon}
      </div>
      {showLabel && (
        <span
          className="label-cap"
          style={{ color: c.color, fontSize: 10, letterSpacing: 0.5 }}
        >
          {c.label}
        </span>
      )}
    </div>
  );
}
