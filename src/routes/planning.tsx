import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Sparkles, Trash2, Plus, ShoppingBasket, X, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { storage, programColor, programSlug, shortDate, startOfWeek, WEEK_DAYS } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { generateWeekPlan } from "@/lib/ai.functions";
import { getLanguage } from "@/lib/i18n";
import type { Recipe, WeekPlanning } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/planning")({
  component: Planning,
});

function ensurePlanning(p: WeekPlanning | null, weekStart: Date): WeekPlanning {
  if (p && p.weekStart === weekStart.toISOString()) return p;
  return {
    weekStart: weekStart.toISOString(),
    days: WEEK_DAYS.map((j) => ({ jour: j, recette: null })),
  };
}

function Planning() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useLocalReactive(() => storage.getUser());
  const planningRaw = useLocalReactive(() => storage.getPlanning());
  const favs = useLocalReactive(() => storage.getFavorites());
  const history = useLocalReactive(() => storage.getHistory());
  const memory = useLocalReactive(() => storage.getMemory());
  const shopping = useLocalReactive(() => storage.getShoppingList());

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d;
  }, [weekStart]);
  const planning = ensurePlanning(planningRaw, weekStart);

  const [generating, setGenerating] = useState(false);
  const [picker, setPicker] = useState<number | null>(null);
  const [newItem, setNewItem] = useState("");
  const genPlan = useServerFn(generateWeekPlan);

  const generateAll = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { planning: plan } = await genPlan({
        data: {
          program: user.program,
          habitualIngredients: memory.ingredients.slice(0, 6).map((m) => m.nom),
          lang: getLanguage(),
        },
      });
      const days = WEEK_DAYS.map((jour, i) => {
        const found = plan.find((p) => p.jour.toLowerCase() === jour.toLowerCase()) ?? plan[i];
        const rec = found?.recette;
        return {
          jour,
          recette: rec
            ? { ...rec, id: `${Date.now()}-${i}`, program: user.program }
            : null,
        };
      });
      storage.setPlanning({ weekStart: weekStart.toISOString(), days });
      toast.success(t("planning.generated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setGenerating(false);
    }
  };

  const updateDay = (idx: number, recette: Recipe | null) => {
    const next: WeekPlanning = {
      ...planning,
      days: planning.days.map((d, i) => (i === idx ? { ...d, recette } : d)),
    };
    storage.setPlanning(next);
  };

  const addItem = () => {
    const ok = storage.addShoppingItem(newItem);
    if (ok) {
      setNewItem("");
    } else if (newItem.trim()) {
      toast.error("Déjà dans la liste");
    }
  };

  const histRecipes: Recipe[] = useMemo(() => {
    const map = new Map<string, Recipe>();
    history.forEach((h, idx) => {
      if (!map.has(h.recette.titre)) {
        map.set(h.recette.titre, {
          id: `hist-${idx}`,
          titre: h.recette.titre,
          description: "",
          calories: h.recette.calories,
          proteines: h.recette.proteines,
          glucides: h.recette.glucides,
          lipides: h.recette.lipides,
          temps: "—",
          difficulte: "—",
          ingredients: [],
          etapes: [],
          program: h.recette.program,
        });
      }
    });
    return Array.from(map.values()).slice(0, 8);
  }, [history]);

  const remaining = shopping.filter((i) => !i.checked).length;

  return (
    <div className="px-5 pt-8 pb-24">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">{t("planning.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("planning.week", {
            from: shortDate(weekStart.toISOString()),
            to: shortDate(weekEnd.toISOString()),
          })}
        </p>
      </header>

      <Tabs defaultValue="planning" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11 rounded-full bg-muted p-1">
          <TabsTrigger value="planning" className="rounded-full text-sm">
            Planning
          </TabsTrigger>
          <TabsTrigger value="courses" className="rounded-full text-sm">
            Ma liste {remaining > 0 ? `(${remaining})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* ============== PLANNING TAB ============== */}
        <TabsContent value="planning" className="mt-5">
          <div className="mb-4 flex justify-end">
            <button
              onClick={generateAll}
              disabled={generating}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Sparkles size={14} />
              {generating ? t("planning.generating") : t("planning.generate")}
            </button>
          </div>

          <div className="space-y-3">
            {planning.days.map((d, i) => {
              const r = d.recette;
              const pc = r ? programColor(r.program) : null;
              const date = new Date(weekStart); date.setDate(weekStart.getDate() + i);
              return (
                <div
                  key={d.jour}
                  className="animate-fade-up"
                  style={{ animationDelay: generating ? `${i * 80}ms` : "0ms" }}
                >
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <h3 className="text-[15px] font-bold">{d.jour}</h3>
                    <span className="text-xs text-muted-foreground">{shortDate(date.toISOString())}</span>
                  </div>
                  {r ? (
                    <div className="fc-card flex items-start gap-3 p-3">
                      <div className="flex-1">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${pc!.bg} ${pc!.text}`}
                        >
                          {t(`program.${programSlug(r.program)}`)}
                        </span>
                        <p className="mt-1 text-sm font-semibold leading-tight">{r.titre}</p>
                        <p className="text-xs text-muted-foreground">{r.calories} kcal</p>
                      </div>
                      <button
                        onClick={() => updateDay(i, null)}
                        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                        aria-label="Retirer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPicker(i)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-transparent px-4 py-4 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
                    >
                      <Plus size={16} /> {t("planning.add")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ============== SHOPPING LIST TAB ============== */}
        <TabsContent value="courses" className="mt-5">
          <div className="mb-4 flex items-center gap-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder="Ajouter un aliment…"
              className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={addItem}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground active:scale-95"
              aria-label="Ajouter"
            >
              <Plus size={18} />
            </button>
          </div>

          {shopping.length === 0 ? (
            <div className="fc-card p-6 text-center text-sm text-muted-foreground">
              <ShoppingBasket size={28} className="mx-auto mb-2 text-muted-foreground/50" />
              Votre liste est vide.
              <br />
              Ajoutez des aliments ci-dessus ou depuis une recette.
            </div>
          ) : (
            <>
              <div className="fc-card divide-y divide-border p-1">
                {shopping.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 px-3 py-2.5">
                    <button
                      onClick={() => storage.toggleShoppingItem(it.id)}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                        it.checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-transparent"
                      }`}
                      aria-label={it.checked ? "Décocher" : "Cocher"}
                    >
                      {it.checked && <Check size={14} strokeWidth={3} />}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        it.checked ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {it.nom}
                    </span>
                    <button
                      onClick={() => storage.removeShoppingItem(it.id)}
                      className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                      aria-label="Supprimer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                {shopping.some((i) => i.checked) && (
                  <button
                    onClick={() => storage.clearCheckedShopping()}
                    className="flex-1 rounded-full border border-border py-2.5 text-xs font-semibold text-muted-foreground"
                  >
                    Retirer cochés
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm("Vider toute la liste ?")) storage.clearShoppingList();
                  }}
                  className="flex-1 rounded-full border border-border py-2.5 text-xs font-semibold text-muted-foreground"
                >
                  Tout effacer
                </button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Picker bottom sheet */}
      {picker !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setPicker(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 mx-auto max-w-md animate-fade-up rounded-t-3xl bg-card p-5"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{t("planning.addFor", { day: planning.days[picker].jour })}</h3>
              <button onClick={() => setPicker(null)}><X size={20} /></button>
            </div>

            <Section title={t("planning.favorites")}>
              {favs.length === 0 ? (
                <Empty>{t("planning.noFav")}</Empty>
              ) : (
                favs.map((r) => (
                  <PickRow
                    key={r.id}
                    title={r.titre}
                    meta={`${r.calories} kcal · ${r.program}`}
                    onPick={() => {
                      updateDay(picker, { ...r, id: `${Date.now()}` });
                      setPicker(null);
                    }}
                  />
                ))
              )}
            </Section>

            <Section title={t("planning.recents")}>
              {histRecipes.length === 0 ? (
                <Empty>{t("planning.noRecent")}</Empty>
              ) : (
                histRecipes.map((r) => (
                  <PickRow
                    key={r.id}
                    title={r.titre}
                    meta={`${r.calories} kcal · ${r.program}`}
                    onPick={() => {
                      updateDay(picker, { ...r, id: `${Date.now()}` });
                      setPicker(null);
                    }}
                  />
                ))
              )}
            </Section>

            <button
              onClick={() => {
                setPicker(null);
                nav({ to: "/frigo" });
              }}
              className="mt-3 w-full rounded-full border border-primary py-2.5 text-sm font-semibold text-primary"
            >
              {t("planning.genForDay")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="max-h-40 space-y-1.5 overflow-y-auto">{children}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
function PickRow({ title, meta, onPick }: { title: string; meta: string; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className="flex w-full items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-left hover:bg-muted"
    >
      <div>
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-[11px] text-muted-foreground">{meta}</p>
      </div>
      <Plus size={16} />
    </button>
  );
}
