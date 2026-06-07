import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock, Flame, CheckCircle2, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { storage, programColor } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { FavoriteHeart } from "@/components/FavoriteHeart";
import { MacroBar } from "@/components/MacroBar";
import { shareRecipeImage } from "@/lib/share-canvas";
import { isPremium } from "@/lib/usage";
import { generateChefTips } from "@/lib/ai.functions";
import { getLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/recette/$id")({
  component: RecipeDetail,
});

function RecipeDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const recipes = useLocalReactive(() => storage.getRecipes());
  const favs = useLocalReactive(() => storage.getFavorites());
  const planning = useLocalReactive(() => storage.getPlanning());
  const all = [
    ...recipes,
    ...favs,
    ...(planning?.days.map((d) => d.recette).filter(Boolean) ?? []),
  ];
  const recipe = all.find((r) => r && r.id === id);
  const [tips, setTips] = useState<string[] | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const genTips = useServerFn(generateChefTips);

  useEffect(() => {
    if (!recipe) return;
    setTipsLoading(true);
    genTips({ data: { recipeTitle: recipe.titre, lang: getLanguage() } })
      .then(({ tips }) => setTips(tips))
      .catch(() => setTips([]))
      .finally(() => setTipsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!recipe) {
    return (
      <div className="px-5 pt-8">
        <p className="text-sm text-muted-foreground">{t("recipe.notFound")}</p>
        <Link to="/recettes" className="mt-4 inline-block text-primary">← {t("recipe.title")}</Link>
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
    toast.success(t("recipe.cookedToast"));
  };

  const share = async () => {
    try {
      await shareRecipeImage(recipe, !isPremium());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="pb-28">
      <div
        className="relative px-5 pb-8 pt-6 text-white"
        style={{ background: `linear-gradient(135deg, ${pc.hex}, ${pc.hex}dd)` }}
      >
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
              aria-label={t("recipe.shareImage")}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/20 backdrop-blur"
            >
              <Share2 size={18} />
            </button>
            <FavoriteHeart recipe={recipe} variant="light" />
          </div>
        </div>
        <span className="mt-5 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold">
          {recipe.program}
        </span>
        <h1 className="mt-2 text-2xl font-bold leading-tight">{recipe.titre}</h1>
        <p className="mt-2 text-sm text-white/85">{recipe.description}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/90">
          <span className="inline-flex items-center gap-1"><Flame size={14} /> {recipe.calories} kcal</span>
          <span className="inline-flex items-center gap-1"><Clock size={14} /> {recipe.temps}</span>
          <span>· {recipe.difficulte}</span>
        </div>
      </div>

      <section className="px-5 pt-5">
        <h2 className="mb-3 text-sm font-semibold">{t("recipe.macros")}</h2>
        <div className="fc-card p-4">
          <MacroBar p={recipe.proteines} g={recipe.glucides} l={recipe.lipides} />
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="mb-3 text-sm font-semibold">{t("recipe.ingredients")}</h2>
        <div className="fc-card divide-y divide-border p-1">
          {recipe.ingredients.map((ing, i) => (
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

      <section className="px-5 pt-6">
        <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold">
          <Sparkles size={14} className="text-amber-500" /> Astuces du chef
        </h2>
        {tipsLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="fc-card h-10 animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {(tips ?? []).map((tip, i) => (
              <li key={i} className="fc-card flex gap-3 p-3 text-sm">
                <span>💡</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div
        className="fixed bottom-16 left-0 right-0 z-40 mx-auto max-w-md border-t border-border bg-card px-5 py-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={markCooked}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary py-3 text-sm font-semibold text-primary active:scale-[0.98]"
        >
          <CheckCircle2 size={18} /> {t("recipe.cooked")}
        </button>
      </div>
    </div>
  );
}
