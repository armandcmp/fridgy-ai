import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Heart, Clock, Flame, Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { storage, programColor } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { Avatar } from "@/components/Avatar";
import { generateCommunityFeed, generateRecipes } from "@/lib/ai.functions";
import { useGate } from "@/lib/useGate";
import type { CommunityRecipe } from "@/lib/types";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/communaute")({
  component: Community,
});

function Community() {
  const { t } = useTranslation();
  const user = useLocalReactive(() => storage.getUser());
  const [recipes, setRecipes] = useState<CommunityRecipe[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [trying, setTrying] = useState<string | null>(null);
  const nav = useNavigate();
  const feed = useServerFn(generateCommunityFeed);
  const gen = useServerFn(generateRecipes);
  const gate = useGate("recipes");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { recettes } = await feed({
        data: { program: user.program, lang: i18n.language },
      });
      setRecipes(recettes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("community.error"));
    } finally {
      setLoading(false);
    }
  }, [user, feed, t]);

  useEffect(() => {
    if (user && !recipes) load();
  }, [user, recipes, load]);

  const tryRecipe = async (r: CommunityRecipe) => {
    if (!user) return;
    if (!gate.allowed) {
      gate.showPaywall();
      return;
    }
    setTrying(r.titre);
    try {
      const { recettes } = await gen({
        data: {
          ingredients: [`recette inspirée de : ${r.titre} — ${r.description}`],
          program: user.program,
          lang: i18n.language,
        },
      });
      gate.consume();
      const withIds = recettes.map((x, i) => ({
        ...x,
        id: `${Date.now()}-${i}`,
        program: user.program,
      }));
      storage.setRecipes(withIds);
      if (withIds[0]) nav({ to: "/recette/$id", params: { id: withIds[0].id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setTrying(null);
    }
  };

  return (
    <div className="px-5 pt-8">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold">
            <Users size={22} /> {t("community.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("community.subtitle")}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-input bg-card px-3 py-2 text-xs font-semibold disabled:opacity-60"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          {t("community.refresh")}
        </button>
      </header>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fc-card h-32 animate-pulse p-4" />
          ))}
        </div>
      )}

      {!loading && recipes && (
        <div className="space-y-3">
          {recipes.map((r, i) => {
            const pc = programColor(r.program);
            return (
              <article
                key={`${r.titre}-${i}`}
                className="fc-card animate-fade-up p-4"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={r.auteur} size={36} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold leading-tight">{r.auteur}</p>
                    <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Heart size={11} fill="currentColor" className="text-rose-500" />
                      {r.likes}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pc.bg} ${pc.text}`}
                  >
                    {r.program}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold leading-tight">{r.titre}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {r.description}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Flame size={13} /> {r.calories} kcal
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} /> {r.temps}
                  </span>
                  <span>· {r.difficulte}</span>
                </div>
                <button
                  onClick={() => tryRecipe(r)}
                  disabled={trying === r.titre}
                  className="mt-4 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {trying === r.titre ? "…" : t("community.try")}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
