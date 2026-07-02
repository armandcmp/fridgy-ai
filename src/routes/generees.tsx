import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storage } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { RecipeCard } from "@/components/RecipeCard";

export const Route = createFileRoute("/generees")({
  component: GenereesScreen,
});

function GenereesScreen() {
  const { t } = useTranslation();
  const recipes = useLocalReactive(() => storage.getRecipes());
  const session = useLocalReactive(() => storage.getSession());

  return (
    <div className="px-5 pt-8 pb-24">
      <header className="mb-4">
        <Link
          to="/frigo"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft size={16} /> {t("common.back")}
        </Link>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">
          {t("generees.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {recipes.length > 0
            ? t("recettes.count", { count: recipes.length })
            : t("generees.empty")}
        </p>
        {session.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("generees.from")} : {session.join(", ")}
          </p>
        )}
      </header>

      {recipes.length === 0 ? (
        <div className="fc-card p-8 text-center">
          <Sparkles className="mx-auto text-primary" size={32} />
          <p className="mt-3 text-sm text-muted-foreground">{t("generees.emptyHint")}</p>
          <Link to="/frigo" className="btn-primary mt-5 inline-block">
            {t("home.scan")} →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((r, i) => (
            <RecipeCard key={r.id + i} recipe={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
