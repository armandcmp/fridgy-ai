import { Link } from "@tanstack/react-router";
import { Clock, Flame } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { programColor } from "@/lib/storage";
import { FavoriteHeart } from "./FavoriteHeart";
import { RecipeImage } from "./RecipeImage";

export function RecipeCard({ recipe, index = 0 }: { recipe: Recipe; index?: number }) {
  const pc = programColor(recipe.program);
  return (
    <Link
      to="/recette/$id"
      params={{ id: recipe.id }}
      className="fc-card relative block animate-fade-up overflow-hidden transition active:scale-[0.98]"
      style={{ animationDelay: `${index * 80}ms`, padding: 0 }}
    >
      <RecipeImage titre={recipe.titre} program={recipe.program} height={160} />
      <div className="absolute right-3 top-3">
        <FavoriteHeart recipe={recipe} variant="light" />
      </div>
      <div className="p-4">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${pc.bg} ${pc.text}`}
        >
          {recipe.program}
        </span>
        <h3 className="mt-2 text-base font-semibold leading-tight">{recipe.titre}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {recipe.description}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Flame size={13} /> {recipe.calories} kcal
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={13} /> {recipe.temps}
          </span>
          <span>· {recipe.difficulte}</span>
        </div>
      </div>
    </Link>
  );
}

export function MiniRecipeCard({ recipe }: { recipe: Recipe }) {
  const pc = programColor(recipe.program);
  return (
    <Link
      to="/recette/$id"
      params={{ id: recipe.id }}
      className="fc-card block w-44 shrink-0 overflow-hidden transition active:scale-[0.97]"
      style={{ padding: 0 }}
    >
      <RecipeImage titre={recipe.titre} program={recipe.program} height={90} />
      <div className="p-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ${pc.bg} ${pc.text}`}
        >
          {recipe.program}
        </span>
        <h4 className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">
          {recipe.titre}
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">{recipe.calories} kcal</p>
      </div>
    </Link>
  );
}
