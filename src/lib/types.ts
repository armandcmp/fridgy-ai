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
