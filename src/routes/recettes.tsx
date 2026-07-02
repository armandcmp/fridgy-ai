import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storage } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { RecipeCard } from "@/components/RecipeCard";
import { MEAL_META, getCurrentMeal } from "@/lib/meal";

export const Route = createFileRoute("/recettes")({
  component: RecettesScreen,
});

type Filter = "all" | "cooked" | "bulk" | "cut" | "loss" | "maintain" | "fav";

function RecettesScreen() {
  const { t } = useTranslation();
  const all = useLocalReactive(() => storage.getAllRecipes());
  const current = useLocalReactive(() => storage.getRecipes());
  const history = useLocalReactive(() => storage.getHistory());
  const favs = useLocalReactive(() => storage.getFavorites());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Full pool: every recipe ever generated + current session (deduped by title).
  const merged = useMemo(() => {
    const pool = [...current, ...all];
    const seen = new Set<string>();
    const out: typeof pool = [];
    for (const r of pool) {
      const k = r.titre.toLowerCase().trim();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
    return out;
  }, [all, current]);

  const cookedTitles = useMemo(
    () => new Set(history.map((h) => h.recette.titre.toLowerCase().trim())),
    [history],
  );

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: t("recettes.fAll") },
    { id: "cooked", label: t("recettes.fCooked") },
    { id: "bulk", label: t("program.bulk") },
    { id: "cut", label: t("program.cut") },
    { id: "loss", label: t("program.loss") },
    { id: "maintain", label: t("program.maintain") },
    { id: "fav", label: t("recettes.fFav") },
  ];

  const filtered = useMemo(() => {
    let list = merged;
    if (filter === "cooked") {
      list = list.filter((r) => cookedTitles.has(r.titre.toLowerCase().trim()));
    } else if (filter === "fav") {
      const favIds = new Set(favs.map((f) => f.id));
      const favTitles = new Set(favs.map((f) => f.titre.toLowerCase().trim()));
      list = list.filter((r) => favIds.has(r.id) || favTitles.has(r.titre.toLowerCase().trim()));
    } else if (filter !== "all") {
      const key = t(`program.${filter}`).toLowerCase();
      list = list.filter((r) => r.program?.toLowerCase().includes(key));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) => r.titre.toLowerCase().includes(q));
    }
    return list;
  }, [merged, cookedTitles, favs, filter, query, t]);


  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const meal = useLocalReactive(() => getCurrentMeal());
  const mealMeta = MEAL_META[meal];

  return (
    <div className="px-5 pt-8">
      <header className="mb-4">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">
          {t("recettes.title")}
          {mounted && <span className="text-muted-foreground"> · {t(mealMeta.labelKey)}</span>}
        </h1>

        <p className="text-sm text-muted-foreground">
          {merged.length > 0
            ? t("recettes.count", { count: merged.length })
            : t("recettes.empty")}
        </p>
      </header>

      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("recettes.searchPh")}
          className="w-full bg-card pl-9 pr-3 text-sm outline-none"
          style={{ height: 44, borderRadius: 12, border: "1px solid var(--border)" }}
        />
      </div>

      <div className="scrollbar-hide -mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`pill ${active ? "pill-active" : ""}`}
            >

              {f.label}
            </button>
          );
        })}
      </div>

      {merged.length === 0 ? (
        <div className="fc-card p-8 text-center">
          <p className="mt-3 text-sm text-muted-foreground">{t("recettes.emptyHint")}</p>
          <Link
            to="/frigo"
            search={{ mode: "photo" as const }}
            className="btn-primary mt-5 inline-block"
          >
            {t("home.scan")} →
          </Link>

        </div>
      ) : filtered.length === 0 ? (
        <div className="fc-card p-6 text-center text-sm text-muted-foreground">
          {t("recettes.noMatch")}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r, i) => (
            <RecipeCard key={r.id + i} recipe={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
