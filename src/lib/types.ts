export type Program = string;

export interface User {
  name: string;
  program: Program;
  dailyKcal: number;
  avatarColor?: string;
  avatarPhoto?: string;
}

export interface Account {
  id: string;
  prenom: string;
  email: string;
  passwordHash: string;
  program: string | null;
  dailyKcal: number | null;
  createdAt: string;
  isPremium: boolean;
}

export interface CurrentUser {
  id: string;
  prenom: string;
  email: string | null;
  program: string | null;
  dailyKcal: number | null;
  isPremium: boolean;
  avatarColor?: string;
  avatarPhoto?: string;
}

export interface IngredientItem {
  nom: string;
  quantite: string;
  disponible: boolean;
}

export interface Recipe {
  id: string;
  titre: string;
  description: string;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
  fibres?: number;
  indexGlycemique?: "Bas" | "Moyen" | "Élevé";
  temps: string;
  difficulte: string;
  ingredients: string[];
  ingredientsDetail?: IngredientItem[];
  etapes: string[];
  program: string;
  mealType?: "petit-dejeuner" | "dejeuner" | "diner";
  conseilNutritionnel?: string;
  pourquoiAdapte?: string;
}

export interface MealEntry {
  id: string;
  date: string;
  recette: {
    titre: string;
    calories: number;
    proteines: number;
    glucides: number;
    lipides: number;
    program: string;
  };
}

export interface IngredientMemoryItem {
  nom: string;
  count: number;
  lastSeen: string;
}

export interface IngredientMemory {
  ingredients: IngredientMemoryItem[];
}

export interface WeekPlanning {
  weekStart: string;
  days: { jour: string; recette: Recipe | null }[];
}

export interface UsageData {
  date: string;
  recipesGenerated: number;
  shoppingListsCreated: number;
}

export interface GroupSharedData {
  ingredients: string[];
  planning: WeekPlanning | null;
  updatedAt: string;
}

export interface GroupData {
  code: string;
  role: "owner" | "member";
  memberName: string;
  sharedData: GroupSharedData;
}

export interface CommunityRecipe {
  id: string;
  titre: string;
  auteur: string;
  avatar: string;
  avatarColor: string;
  likes: number;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
  temps: string;
  difficulte: string;
  description: string;
  program: string;
}
