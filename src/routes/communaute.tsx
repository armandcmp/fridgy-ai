import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Heart, RefreshCw, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { storage, programColor } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { getLanguage } from "@/lib/i18n";
import {
  generateCommunityFeed,
  generateFullRecipeFromTitle,
} from "@/lib/ai.functions";
import type { CommunityRecipe } from "@/lib/types";

export const Route = createFileRoute("/communaute")({
  component: Community,
});

function Community() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useLocalReactive(() => storage.getUser());
  const likes = useLocalReactive(() => storage.getLikes());
  const [feed, setFeed] = useState<CommunityRecipe[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const genFeed = useServerFn(generateCommunityFeed);
  const genFull = useServerFn(generateFullRecipeFromTitle);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(false);
    try {
      const { recettes } = await genFeed({
        data: { program: user.program, lang: getLanguage() },
      });
      const withIds = recettes.map((r, i) => ({
        ...r,
        id: `c-${Date.now()}-${i}`,
      }));
      setFeed(withIds);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !feed) load();
    // eslint-disable-next-line
  }, [user]);

  const openRecipe = async (r: CommunityRecipe) => {
    if (opening) return;
    setOpening(r.id);
    try {
      const full = await genFull({
        data: { titre: r.titre, program: r.program, lang: getLanguage() },
      });
      const id = `c-full-${Date.now()}`;
      const all = storage.getRecipes();
      storage.setRecipes([{ ...full, id, program: r.program }, ...all].slice(0, 20));
      nav({ to: "/recette/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="px-5 pt-8">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("community.title")}</h1>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {t("community.refresh")}
        </button>
      </header>

      {loading && !feed && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="fc-card h-44 animate-pulse p-4" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="fc-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("community.error")}</p>
          <button
            onClick={load}
            className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {feed && (
        <div className="space-y-3">
          {feed.map((r, i) => {
            const pc = programColor(r.program);
            const myLike = likes[r.id] ?? 0;
            const total = r.likes + myLike;
            const isOpening = opening === r.id;
            return (
              <article
                key={r.id}
                className="fc-card animate-fade-up overflow-hidden p-4"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: r.avatarColor }}
                  >
                    {r.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{r.auteur}</p>
                    <span
                      className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${pc.bg} ${pc.text}`}
                    >
                      {r.program}
                    </span>
                  </div>
                </div>
                <h3 className="mt-3 text-base font-bold leading-tight">{r.titre}</h3>
                <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                  {r.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                    ⏱ {r.temps}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                    {r.difficulte}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                    🔥 {r.calories} kcal
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => {
                      storage.addLike(r.id);
                    }}
                    className="inline-flex items-center gap-1.5 text-sm"
                  >
                    <Heart
                      size={18}
                      className={myLike > 0 ? "fill-red-500 text-red-500 animate-pop" : "text-muted-foreground"}
                    />
                    <span className="font-medium tabular-nums">{total}</span>
                  </button>
                  <button
                    onClick={() => openRecipe(r)}
                    disabled={isOpening}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-60"
                  >
                    {isOpening && <Loader2 size={12} className="animate-spin" />}
                    {t("community.try")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
