import { Link } from "@tanstack/react-router";
import { Clock, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Recipe } from "@/lib/types";
import { programColor, programSlug } from "@/lib/storage";
import { MEAL_META, type MealType } from "@/lib/meal";
import { FavoriteHeart } from "./FavoriteHeart";
import { RecipeImage } from "./RecipeImage";
import { NutriScoreBadge, recipeScore } from "./NutriScoreBadge";

function MealBadge({ mealType }: { mealType?: MealType }) {
 const { t } = useTranslation();
 if (!mealType) return null;
 const meta = MEAL_META[mealType];
 return (
 <span
 className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold shadow-sm"
 style={{ color: meta.color, fontFamily: "Inter, system-ui, sans-serif" }}
 >
 {t(meta.shortKey)}
 </span>
 );
}

export function RecipeCard({ recipe, index = 0 }: { recipe: Recipe; index?: number }) {
 const { t } = useTranslation();
 const pc = programColor(recipe.program);
 const programLabel = t(`program.${programSlug(recipe.program)}`);
 const score = recipeScore(recipe);
 return (
 <Link
 to="/recette/$id"
 params={{ id: recipe.id }}
 className="fc-card relative block animate-fade-up overflow-hidden transition active:scale-[0.98]"
 style={{ animationDelay: `${index * 80}ms`, padding: 0 }}
 >
 <div className="relative">
 <RecipeImage titre={recipe.titre} program={recipe.program} height={180} />
 <div className="absolute right-3 top-3 flex items-center gap-2">
 <MealBadge mealType={recipe.mealType} />
 <FavoriteHeart recipe={recipe} variant="light" />
 </div>
 {/* NutriScore floating bottom-right of image */}
 <div className="absolute -bottom-5 right-4">
 <div className="rounded-full bg-white p-1 shadow-lg">
 <NutriScoreBadge score={score} size={42} showLabel={false} />
 </div>
 </div>
 </div>
 <div className="p-4 pt-5">
 <span
 className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold ${pc.bg} ${pc.text}`}
 >
  {programLabel}
 </span>
 <h3 className="display-title mt-2 text-[20px]">
 {recipe.titre}
 </h3>

 <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
 {recipe.description}
 </p>
 {recipe.pourquoiAdapte && (
 <p
 className="mt-2 rounded-xl px-3 py-2 text-[12px] italic"
 style={{
 background: "var(--primary-light)",
 borderLeft: "3px solid var(--primary)",
 color: "var(--primary-dark)",
 }}
 >
 {recipe.pourquoiAdapte}
 </p>
 )}
 <div className="mt-3 flex items-center gap-2 text-xs">
 <Pill icon={<Flame size={12} />} label={`${recipe.calories} kcal`} />
 <Pill icon={<Clock size={12} />} label={recipe.temps} />
 <Pill label={recipe.difficulte} />
 </div>
 </div>
 </Link>
 );
}

function Pill({ icon, label }: { icon?: React.ReactNode; label: string }) {
 return (
 <span
 className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground"
 style={{ background: "var(--muted)" }}
 >
 {icon}
 {label}
 </span>
 );
}

export function MiniRecipeCard({
 recipe,
 width = 160,
 imageHeight = 120,
}: {
 recipe: Recipe;
 width?: number;
 imageHeight?: number;
}) {
  const { t } = useTranslation();
 const pc = programColor(recipe.program);
  const programLabel = t(`program.${programSlug(recipe.program)}`);
 const score = recipeScore(recipe);
 return (
 <Link
 to="/recette/$id"
 params={{ id: recipe.id }}
 className="fc-card relative block shrink-0 overflow-hidden transition active:scale-[0.97]"
 style={{ padding: 0, width }}
 >
 <div className="relative">
 <RecipeImage titre={recipe.titre} program={recipe.program} height={imageHeight} />
 <div className="absolute right-2 top-2">
 <MealBadge mealType={recipe.mealType} />
 </div>
 <div className="absolute -bottom-3 right-2 rounded-full bg-white p-0.5 shadow-md">
 <NutriScoreBadge score={score} size={28} showLabel={false} />
 </div>
 </div>
 <div className="p-3 pt-4">
 <span
 className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ${pc.bg} ${pc.text}`}
 style={{ fontFamily: "Inter, system-ui, sans-serif" }}
 >
  {programLabel}
 </span>
 <h4
 className="mt-2 line-clamp-2 text-sm font-bold leading-tight"
 style={{ fontFamily: "Inter, system-ui, sans-serif" }}
 >
 {recipe.titre}
 </h4>
 <p className="mt-1 text-xs text-muted-foreground">{recipe.calories} kcal</p>
 </div>
 </Link>
 );
}
