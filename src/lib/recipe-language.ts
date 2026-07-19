import { storage } from "@/lib/storage";
import type { Recipe } from "@/lib/types";

function keyForRecipe(recipe: Recipe): string {
 return recipe.id || recipe.titre.toLowerCase().trim();
}

function mapRecipes(list: Recipe[], translatedByKey: Map<string, Recipe>): Recipe[] {
 return list.map((recipe) => translatedByKey.get(keyForRecipe(recipe)) ?? recipe);
}

export function collectStoredRecipesForTranslation(): Recipe[] {
 const unique = new Map<string, Recipe>();
 const add = (recipe: Recipe | null | undefined) => {
 if (!recipe) return;
 unique.set(keyForRecipe(recipe), recipe);
 };

 storage.getRecipes().forEach(add);
 storage.getAllRecipes().forEach(add);
 storage.getFavorites().forEach(add);
 storage.getPlanning()?.days.forEach((day) => add(day.recette));
 storage.getHistory().forEach((entry) =>
 add({
 id: `history-${entry.id}`,
 titre: entry.recette.titre,
 description: "",
 calories: entry.recette.calories,
 proteines: entry.recette.proteines,
 glucides: entry.recette.glucides,
 lipides: entry.recette.lipides,
 temps: "",
 difficulte: "",
 ingredients: [],
 etapes: [],
 program: entry.recette.program,
 }),
 );

 return Array.from(unique.values());
}

export function applyTranslatedStoredRecipes(source: Recipe[], translated: Recipe[]) {
 const translatedByKey = new Map(translated.map((recipe) => [keyForRecipe(recipe), recipe]));
 const titleMap = new Map<string, Recipe>();

 source.forEach((recipe) => {
 const translatedRecipe = translatedByKey.get(keyForRecipe(recipe));
 if (translatedRecipe) titleMap.set(recipe.titre.toLowerCase().trim(), translatedRecipe);
 });

 storage.replaceRecipes(mapRecipes(storage.getRecipes(), translatedByKey));
 storage.setAllRecipes(mapRecipes(storage.getAllRecipes(), translatedByKey));
 storage.setFavorites(mapRecipes(storage.getFavorites(), translatedByKey));

 const planning = storage.getPlanning();
 if (planning) {
 storage.setPlanning({
 ...planning,
 days: planning.days.map((day) => ({
 ...day,
 recette: day.recette ? translatedByKey.get(keyForRecipe(day.recette)) ?? day.recette : null,
 })),
 });
 }

 const history = storage.getHistory();
 if (history.length > 0) {
 storage.setHistory(
 history.map((entry) => {
 const translatedRecipe = titleMap.get(entry.recette.titre.toLowerCase().trim());
 if (!translatedRecipe) return entry;
 return {
 ...entry,
 recette: {
 ...entry.recette,
 titre: translatedRecipe.titre,
 program: translatedRecipe.program,
 },
 };
 }),
 );
 }
}

export function recipeChunks(recipes: Recipe[], size = 8): Recipe[][] {
 const chunks: Recipe[][] = [];
 for (let i = 0; i < recipes.length; i += size) chunks.push(recipes.slice(i, i + size));
 return chunks;
}