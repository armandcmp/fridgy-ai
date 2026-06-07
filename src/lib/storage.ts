import type {
  IngredientMemory,
  MealEntry,
  Recipe,
  User,
  WeekPlanning,
} from "./types";

const KEYS = {
  user: "fridgechef_user",
  session: "fridgechef_session",
  recipes: "fridgechef_recipes",
  history: "fridgechef_history",
  memory: "fridgechef_memory",
  favorites: "fridgechef_favorites",
  planning: "fridgechef_planning",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: key }));
}

export const storage = {
  // User
  getUser: () => read<User | null>(KEYS.user, null),
  setUser: (u: User) => write(KEYS.user, u),

  // Session ingredients
  getSession: () => read<string[]>(KEYS.session, []),
  setSession: (s: string[]) => write(KEYS.session, s),

  // Recipes (last generated)
  getRecipes: () => read<Recipe[]>(KEYS.recipes, []),
  setRecipes: (r: Recipe[]) => write(KEYS.recipes, r),

  // History
  getHistory: () => read<MealEntry[]>(KEYS.history, []),
  addHistory: (entry: MealEntry) => {
    const h = storage.getHistory();
    write(KEYS.history, [entry, ...h]);
  },
  removeHistory: (id: string) => {
    write(
      KEYS.history,
      storage.getHistory().filter((e) => e.id !== id),
    );
  },

  // Memory
  getMemory: () => read<IngredientMemory>(KEYS.memory, { ingredients: [] }),
  rememberIngredients: (names: string[]) => {
    const mem = storage.getMemory();
    const now = new Date().toISOString();
    const map = new Map(mem.ingredients.map((i) => [i.nom.toLowerCase(), i]));
    for (const raw of names) {
      const nom = raw.trim();
      if (!nom) continue;
      const key = nom.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.lastSeen = now;
      } else {
        map.set(key, { nom, count: 1, lastSeen: now });
      }
    }
    const sorted = Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    write(KEYS.memory, { ingredients: sorted });
  },

  // Favorites
  getFavorites: () => read<Recipe[]>(KEYS.favorites, []),
  isFavorite: (id: string) => storage.getFavorites().some((r) => r.id === id),
  toggleFavorite: (recipe: Recipe): boolean => {
    const favs = storage.getFavorites();
    const exists = favs.some((r) => r.id === recipe.id);
    const next = exists
      ? favs.filter((r) => r.id !== recipe.id)
      : [recipe, ...favs];
    write(KEYS.favorites, next);
    return !exists;
  },

  // Planning
  getPlanning: () => read<WeekPlanning | null>(KEYS.planning, null),
  setPlanning: (p: WeekPlanning) => write(KEYS.planning, p),
};

export function programColor(program: string): { bg: string; text: string } {
  const p = program.toLowerCase();
  if (p.includes("perte")) return { bg: "bg-sky-100", text: "text-sky-700" };
  if (p.includes("masse")) return { bg: "bg-orange-100", text: "text-orange-700" };
  if (p.includes("végé") || p.includes("vege"))
    return { bg: "bg-emerald-100", text: "text-emerald-700" };
  if (p.includes("sport") || p.includes("perf"))
    return { bg: "bg-violet-100", text: "text-violet-700" };
  return { bg: "bg-amber-100", text: "text-amber-700" };
}

export function frenchDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function startOfWeek(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export const WEEK_DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];
