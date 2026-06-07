export type Program =
  | "Perte de poids"
  | "Prise de masse"
  | "Équilibre"
  | "Végétarien"
  | "Sport / Performance";

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
  date: string; // YYYY-MM-DD
  recipesGenerated: number;
  shoppingListsCreated: number;
}

export interface GroupData {
  code: string;
  role: "owner" | "member";
  members: string[];
  sharedIngredients: string[];
  sharedPlanning: WeekPlanning | null;
}

export interface NotifSettings {
  enabled: boolean;
  mealReminder: boolean;
  mealTime: string; // "HH:MM"
  planningReminder: boolean;
  streakReminder: boolean;
  lastPromptAt?: string; // ISO date when permission asked
}

export interface CommunityRecipe {
  titre: string;
  auteur: string;
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

export type Units = "metric" | "imperial";
