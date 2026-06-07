import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Users, RefreshCw, Clock, Flame } from "lucide-react";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { generateCommunityFeed, expandCommunityRecipe } from "@/lib/ai.functions";
import { getLanguage } from "@/lib/i18n";
import { programColor } from "@/lib/storage";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expandingId, setExpandingId] = useState<string | null>(null);

  const gen = useServerFn(generateCommunityFeed);
  const expand = useServerFn(expandCommunityRecipe);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const { recettes } = await gen({
        data: { program: user?.program ?? "Équilibre", lang: getLanguage() },
      });
      setFeed(recettes.map((r, i) => ({ ...r, id: `com-${Date.now()}-${i}` })));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const onLike = (r: CommunityRecipe) => storage.bumpLike(r.id, r.likes);

  const onTry = async (r: CommunityRecipe) => {
    setExpandingId(r.id);
    try {
      const { recette } = await expand({
        data: {
          titre: r.titre,
          description: r.description,
          program: r.program,
          lang: getLanguage(),
        },
      });
      const full = {
        ...recette,
        id: `try-${Date.now()}`,
        program: r.program,
      };
      const all = storage.getRecipes();
      storage.setRecipes([full, ...all]);
      nav({ to: "/recette/$id", params: { id: full.id } });
    } catch {
      toast.error("Erreur");
    } finally {
      setExpandingId(null);
    }
  };

  return (
    <div className="px-5 pt-8">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={22} className="text-primary" />
          <h1 className="text-2xl font-bold">{t("community.title")}</h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground disabled:opacity-60"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {t("community.refresh")}
        </button>
      </header>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="fc-card h-40 animate-pulse p-4" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="fc-card p-6 text-center text-sm text-muted-foreground">
          {t("community.error")}
          <button onClick={load} className="mt-3 block w-full text-primary">
            {t("common.retry")}
          </button>
        </div>
      )}

      {!loading && !error && feed && (
        <div className="space-y-3">
          {feed.map((r, i) => {
            const pc = programColor(r.program);
            const likeCount = likes[r.id] ?? r.likes;
            const liked = likes[r.id] !== undefined;
            return (
              <article
                key={r.id}
                className="fc-card animate-fade-up p-4"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: r.avatarColor }}
                  >
                    {r.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold leading-tight">{r.auteur}</p>
                    <span
                      className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${pc.bg} ${pc.text}`}
                    >
                      {r.program}
                    </span>
                  </div>
                </div>
                <h3 className="mt-3 text-base font-semibold leading-tight">{r.titre}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> {r.temps}</span>
                  <span>{r.difficulte}</span>
                  <span className="inline-flex items-center gap-1"><Flame size={12} /> {r.calories} kcal</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    onClick={() => onLike(r)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                  >
                    <Heart
                      size={16}
                      className={liked ? "text-[oklch(var(--favorite))]" : ""}
                      fill={liked ? "currentColor" : "none"}
                    />
                    {likeCount}
                  </button>
                  <button
                    onClick={() => onTry(r)}
                    disabled={expandingId === r.id}
                    className="rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-60"
                  >
                    {expandingId === r.id ? "…" : t("community.try")}
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
