import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Clock, Flame, CheckCircle2, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { storage, programColor } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { FavoriteHeart } from "@/components/FavoriteHeart";
import { MacroBar } from "@/components/MacroBar";
import { RecipeImage } from "@/components/RecipeImage";
import { buildRecipeShareImage, shareOrDownload } from "@/lib/share";
import { isPremium } from "@/lib/freemium";

export const Route = createFileRoute("/recette/$id")({
  component: RecipeDetail,
});

function RecipeDetail() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const nav = useNavigate();
  const recipes = useLocalReactive(() => storage.getRecipes());
  const favs = useLocalReactive(() => storage.getFavorites());
  const planning = useLocalReactive(() => storage.getPlanning());
  const [sharing, setSharing] = useState(false);
  const all = [
    ...recipes,
    ...favs,
    ...(planning?.days.map((d) => d.recette).filter(Boolean) ?? []),
  ];
  const recipe = all.find((r) => r && r.id === id);

  if (!recipe) {
    return (
      <div className="px-5 pt-8">
        <p className="text-sm text-muted-foreground">{t("recipe.notFound")}</p>
        <Link to="/recettes" className="mt-4 inline-block text-primary">
          ← {t("recipe.backToList")}
        </Link>
      </div>
    );
  }

  const pc = programColor(recipe.program);

  const markCooked = () => {
    storage.addHistory({
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      recette: {
        titre: recipe.titre,
        calories: recipe.calories,
        proteines: recipe.proteines,
        glucides: recipe.glucides,
        lipides: recipe.lipides,
        program: recipe.program,
      },
    });
    toast.success(t("recipe.addedHistory"));
  };

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const blob = await buildRecipeShareImage(recipe, !isPremium());
      const r = await shareOrDownload(blob, recipe.titre);
      toast.success(r === "shared" ? t("recipe.shared") : t("recipe.downloadFallback"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="pb-28">
      <div className="relative text-white" style={{ height: 280 }}>
        <RecipeImage
          titre={recipe.titre}
          program={recipe.program}
          height={280}
          rounded="0"
          overlay
        />
        <div className="absolute inset-0 flex flex-col px-5 pb-5 pt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => nav({ to: "/recettes" })}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/20 backdrop-blur"
              aria-label={t("common.back")}
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex gap-2">
              <button
                onClick={share}
                disabled={sharing}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/20 backdrop-blur disabled:opacity-60"
                aria-label={t("recipe.share")}
              >
                <Share2 size={16} />
              </button>
              <FavoriteHeart recipe={recipe} variant="light" />
            </div>
          </div>
          <div className="mt-auto">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${pc.bg} ${pc.text}`}
            >
              {recipe.program}
            </span>
            <h1 className="mt-2 text-2xl font-bold leading-tight drop-shadow">{recipe.titre}</h1>
            <p className="mt-2 text-sm text-white/90 drop-shadow">{recipe.description}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/95">
              <span className="inline-flex items-center gap-1"><Flame size={14} /> {recipe.calories} kcal</span>
              <span className="inline-flex items-center gap-1"><Clock size={14} /> {recipe.temps}</span>
              <span>· {recipe.difficulte}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="px-5 pt-5">
        <h2 className="mb-3 text-sm font-semibold">{t("recipe.macros")}</h2>
        <div className="fc-card p-4">
          <MacroBar p={recipe.proteines} g={recipe.glucides} l={recipe.lipides} />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            {typeof recipe.fibres === "number" && (
              <span
                className="rounded-full px-2.5 py-1 font-semibold"
                style={{ background: "rgba(76,175,130,0.12)", color: "#1F6B4A" }}
              >
                🌿 Fibres : {recipe.fibres} g
              </span>
            )}
            {recipe.indexGlycemique && (
              <IGBadge ig={recipe.indexGlycemique} />
            )}
          </div>
        </div>
      </section>

      {recipe.conseilNutritionnel && (
        <section className="px-5 pt-6">
          <div
            className="rounded-2xl p-4"
            style={{
              background: "#FFF8E1",
              border: "1px solid #FCE7A2",
            }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "#92660A" }}>
              🎯 Adapté à votre profil
            </h3>
            <p className="mt-1.5 text-sm" style={{ color: "#5A4408" }}>
              {recipe.conseilNutritionnel}
            </p>
          </div>
        </section>
      )}

      <section className="px-5 pt-6">
        <h2 className="mb-3 text-sm font-semibold">{t("recipe.ingredients")}</h2>
        <div className="fc-card divide-y divide-border p-1">
          {recipe.ingredientsDetail && recipe.ingredientsDetail.length > 0
            ? recipe.ingredientsDetail.map((ing, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="flex-1">
                    {ing.quantite ? `${ing.quantite} ` : ""}
                    {ing.nom}
                  </span>
                  {ing.disponible ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: "rgba(76,175,130,0.15)", color: "#1F6B4A" }}
                    >
                      ✓ Dans votre frigo
                    </span>
                  ) : (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#92660A" }}
                    >
                      🛒 À acheter
                    </span>
                  )}
                </div>
              ))
            : recipe.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {ing}
                </div>
              ))}
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="mb-3 text-sm font-semibold">{t("recipe.steps")}</h2>
        <ol className="space-y-3">
          {recipe.etapes.map((s, i) => (
            <li key={i} className="fc-card flex gap-3 p-4 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <div
        className="fixed bottom-16 left-0 right-0 z-40 mx-auto max-w-md border-t border-border bg-card px-5 py-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={markCooked}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary py-3 text-sm font-semibold text-primary transition active:scale-[0.98]"
        >
          <CheckCircle2 size={18} /> {t("recipe.cooked")}
        </button>
      </div>
    </div>
  );
}
