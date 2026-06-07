export type Program = string;

export interface User {
  name: string;
  program: Program;
  dailyKcal: number;
  avatarColor?: string;
}

export interface Recipe {
  id: string;
  titre: string;
  description: string;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
  temps: string;
  difficulte: string;
  ingredients: string[];
  etapes: string[];
  program: string;
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
