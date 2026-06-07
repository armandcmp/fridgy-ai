import { createFileRoute, Link } from "@tanstack/react-router";
import { ChefHat } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storage } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { RecipeCard } from "@/components/RecipeCard";

export const Route = createFileRoute("/recettes")({
  component: RecettesScreen,
});

function RecettesScreen() {
  const { t } = useTranslation();
  const recipes = useLocalReactive(() => storage.getRecipes());
  return (
    <div className="px-5 pt-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">{t("recettes.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {recipes.length > 0 ? t("recettes.count", { count: recipes.length }) : t("recettes.empty")}
        </p>
      </header>

      {recipes.length === 0 ? (
        <div className="fc-card p-8 text-center">
          <ChefHat size={40} className="mx-auto text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">{t("recettes.emptyHint")}</p>
          <Link
            to="/frigo"
            className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("home.scan")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((r, i) => (
            <RecipeCard key={r.id} recipe={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
