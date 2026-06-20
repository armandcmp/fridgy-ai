import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { storage, programColor, shortDate } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { usePremium } from "@/lib/freemium";
import { PaywallModal } from "@/components/PaywallModal";
import type { MealEntry } from "@/lib/types";

export const Route = createFileRoute("/historique")({
 component: Historique,
});

function groupByDay(entries: MealEntry[]) {
 const map = new Map<string, MealEntry[]>();
 for (const e of entries) {
 const key = new Date(e.date).toDateString();
 const list = map.get(key) ?? [];
 list.push(e);
 map.set(key, list);
 }
 return Array.from(map.entries()).sort(
 (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
 );
}

function Historique() {
 const { t } = useTranslation();
 const history = useLocalReactive(() => storage.getHistory());
 const premium = usePremium();
 const [paywall, setPaywall] = useState(false);

 const labelFor = (dateStr: string) => {
 const d = new Date(dateStr);
 const today = new Date(); today.setHours(0, 0, 0, 0);
 const yest = new Date(today); yest.setDate(yest.getDate() - 1);
 if (d.toDateString() === today.toDateString()) return t("history.today");
 if (d.toDateString() === yest.toDateString()) return t("history.yesterday");
 return shortDate(dateStr);
 };

 const now = new Date();
 const weekStart = new Date(now);
 weekStart.setDate(now.getDate() - 6);
 weekStart.setHours(0, 0, 0, 0);
 const weekEntries = history.filter((e) => new Date(e.date) >= weekStart);
 const dayHasMeal = Array.from({ length: 7 }).map((_, i) => {
 const d = new Date(weekStart);
 d.setDate(weekStart.getDate() + i);
 return weekEntries.some((e) => new Date(e.date).toDateString() === d.toDateString());
 });
 const totalKcal = weekEntries.reduce((s, e) => s + e.recette.calories, 0);
 const daysWithMeals = dayHasMeal.filter(Boolean).length || 1;
 const avgKcal = Math.round(totalKcal / daysWithMeals);

 // Free tier: limit to last 7 days
 const visible = premium ? history : history.filter((e) => new Date(e.date) >= weekStart);
 const grouped = groupByDay(visible);
 const truncated = !premium && history.length > visible.length;

 return (
 <div className="px-5 pt-8">
 <header className="mb-5">
 <h1 className="text-2xl font-bold">{t("history.title")}</h1>
 <p className="text-sm text-muted-foreground">
 {t("history.weekCount", { count: weekEntries.length })}
 </p>
 </header>

 {history.length === 0 ? (
 <div className="fc-card p-8 text-center">
 <div className="text-5xl"></div>
 <h3 className="mt-4 font-semibold">{t("history.empty")}</h3>
 <p className="mt-2 text-xs text-muted-foreground">{t("history.emptyHint")}</p>
 </div>
 ) : (
 <>
 <section className="fc-card mb-6 bg-primary/10 p-4">
 <p className="text-sm font-semibold">
 {t("history.weekly", { count: weekEntries.length, avg: avgKcal })}
 </p>
 <div className="mt-3 flex gap-2">
 {dayHasMeal.map((on, i) => (
 <span
 key={i}
 className={`h-2.5 flex-1 rounded-full ${on ? "bg-primary" : "bg-muted"}`}
 />
 ))}
 </div>
 </section>

 <div className="space-y-5">
 {grouped.map(([day, entries]) => (
 <section key={day}>
 <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
 {labelFor(day)}
 </h3>
 <div className="space-y-2">
 {entries.map((e) => {
 const pc = programColor(e.recette.program);
 return (
 <div key={e.id} className="fc-card flex items-start gap-3 p-3">
 <div className="flex-1">
 <div className="flex items-start justify-between gap-2">
 <span className="text-sm font-semibold">{e.recette.titre}</span>
 <span className="text-xs text-muted-foreground">
 {e.recette.calories} kcal
 </span>
 </div>
 <span
 className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${pc.bg} ${pc.text}`}
 >
 {e.recette.program}
 </span>
 <p className="mt-1.5 text-[11px] text-muted-foreground">
 P:{Math.round(e.recette.proteines)}g · G:
 {Math.round(e.recette.glucides)}g · L:
 {Math.round(e.recette.lipides)}g
 </p>
 </div>
 <button
 onClick={() => storage.removeHistory(e.id)}
 className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
 aria-label={t("common.delete")}
 >
 <Trash2 size={15} />
 </button>
 </div>
 );
 })}
 </div>
 </section>
 ))}
 </div>

 {truncated && (
 <div className="fc-card mt-6 p-4 text-center">
 <p className="text-xs text-muted-foreground">{t("history.freeLimit")}</p>
 <button
 onClick={() => setPaywall(true)}
 className="mt-3 rounded-full px-4 py-2 text-xs font-bold text-white"
 style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
 >
 {t("history.unlockPro")}
 </button>
 </div>
 )}
 </>
 )}

 <PaywallModal open={paywall} onClose={() => setPaywall(false)} />
 </div>
 );
}
