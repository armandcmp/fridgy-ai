import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { storage, shortDate } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { MacroBar } from "@/components/MacroBar";

export const Route = createFileRoute("/stats")({
  component: Stats,
});

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function Stats() {
  const { t } = useTranslation();
  const history = useLocalReactive(() => storage.getHistory());
  const user = useLocalReactive(() => storage.getUser());

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
  const inWeek = history.filter((e) => new Date(e.date) >= weekStart);

  const perDay = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    const entries = inWeek.filter(
      (e) => new Date(e.date).toDateString() === d.toDateString(),
    );
    return {
      kcal: entries.reduce((s, e) => s + e.recette.calories, 0),
      hasMeal: entries.length > 0,
    };
  });
  const totalKcal = perDay.reduce((s, d) => s + d.kcal, 0);
  const daysWith = perDay.filter((d) => d.hasMeal).length;
  const avgKcal = daysWith > 0 ? Math.round(totalKcal / daysWith) : 0;
  const avgP = daysWith > 0 ? Math.round(inWeek.reduce((s, e) => s + e.recette.proteines, 0) / daysWith) : 0;
  const avgG = daysWith > 0 ? inWeek.reduce((s, e) => s + e.recette.glucides, 0) / daysWith : 0;
  const avgL = daysWith > 0 ? inWeek.reduce((s, e) => s + e.recette.lipides, 0) / daysWith : 0;
  const maxKcal = Math.max(...perDay.map((d) => d.kcal), 1);

  const score = Math.round((daysWith / 7) * 10);
  const msg =
    score === 10 ? t("stats.perfect")
    : score >= 7 ? t("stats.great")
    : score >= 4 ? t("stats.ok")
    : score >= 1 ? t("stats.start")
    : t("stats.none");

  return (
    <div className="px-5 pt-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">{t("stats.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {shortDate(weekStart.toISOString())} → {shortDate(today.toISOString())}
        </p>
      </header>

      {history.length === 0 ? (
        <div className="fc-card p-8 text-center text-sm text-muted-foreground">
          {t("stats.empty")}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3">
            <div className="fc-card p-4">
              <div className="text-xs text-muted-foreground">{t("stats.meals")}</div>
              <div className="mt-1 text-xl font-bold">{inWeek.length}</div>
              <div className="text-[11px] text-muted-foreground">{t("stats.mealsSub")}</div>
            </div>
            <div className="fc-card p-4">
              <div className="text-xs text-muted-foreground">{t("stats.calories")}</div>
              <div className="mt-1 text-xl font-bold">{avgKcal}</div>
              <div className="text-[11px] text-muted-foreground">{t("stats.caloriesSub")}</div>
            </div>
            <div className="fc-card p-4">
              <div className="text-xs text-muted-foreground">{t("stats.proteins")}</div>
              <div className="mt-1 text-xl font-bold">{avgP}g</div>
              <div className="text-[11px] text-muted-foreground">{t("stats.proteinsSub")}</div>
            </div>
            <div className="fc-card p-4">
              <div className="text-xs text-muted-foreground">{t("stats.goal")}</div>
              <div className="mt-1 text-sm font-bold leading-tight">{user?.program ?? "—"}</div>
            </div>
          </section>

          <section className="fc-card mt-5 p-4">
            <h2 className="mb-3 text-sm font-semibold">{t("stats.perDay")}</h2>
            <div className="relative flex h-36 items-end gap-2">
              <div
                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-primary/60"
                style={{ bottom: `${(avgKcal / maxKcal) * 100}%` }}
              />
              {perDay.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center justify-end">
                  <div
                    className={`w-full rounded-t-md transition-all ${d.hasMeal ? "bg-primary" : "bg-muted"}`}
                    style={{ height: `${Math.max((d.kcal / maxKcal) * 100, 4)}%` }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t("stats.avgLine", { kcal: avgKcal })}
            </p>
          </section>

          <section className="fc-card mt-5 p-4">
            <h2 className="mb-3 text-sm font-semibold">{t("stats.macros")}</h2>
            <MacroBar p={avgP} g={avgG} l={avgL} />
          </section>

          <section className="fc-card mt-5 p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("stats.consistency")}
            </p>
            <p className="mt-2 text-5xl font-extrabold text-primary">
              {score}
              <span className="text-2xl text-muted-foreground">/10</span>
            </p>
            <p className="mt-2 text-sm font-medium">{msg}</p>
          </section>
        </>
      )}
    </div>
  );
}
