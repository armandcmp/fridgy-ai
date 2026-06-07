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
  likes: "fridgechef_likes",
  units: "fridgechef_units",
} as const;

export const ALL_KEYS = [
  KEYS.user,
  KEYS.session,
  KEYS.recipes,
  KEYS.history,
  KEYS.memory,
  KEYS.favorites,
  KEYS.planning,
  KEYS.likes,
  KEYS.units,
  "fridgechef_lang",
  "fridgechef_usage",
  "fridgechef_premium",
  "fridgechef_group",
];

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
  getUser: () => read<User | null>(KEYS.user, null),
  setUser: (u: User) => write(KEYS.user, u),

  getSession: () => read<string[]>(KEYS.session, []),
  setSession: (s: string[]) => write(KEYS.session, s),

  getRecipes: () => read<Recipe[]>(KEYS.recipes, []),
  setRecipes: (r: Recipe[]) => write(KEYS.recipes, r),

  getHistory: () => read<MealEntry[]>(KEYS.history, []),
  addHistory: (entry: MealEntry) => {
    const h = storage.getHistory();
    write(KEYS.history, [entry, ...h]);
  },
  removeHistory: (id: string) =>
    write(KEYS.history, storage.getHistory().filter((e) => e.id !== id)),
  clearHistory: () => write(KEYS.history, []),

  getMemory: () => read<IngredientMemory>(KEYS.memory, { ingredients: [] }),
  rememberIngredients: (names: string[]) => {
    const mem = storage.getMemory();
    const now = new Date().toISOString();
    const map = new Map(mem.ingredients.map((i) => [i.nom.toLowerCase(), i]));
    for (const raw of names) {
      const nom = raw.trim();
      if (!nom) continue;
      const k = nom.toLowerCase();
      const existing = map.get(k);
      if (existing) {
        existing.count += 1;
        existing.lastSeen = now;
      } else {
        map.set(k, { nom, count: 1, lastSeen: now });
      }
    }
    write(KEYS.memory, {
      ingredients: Array.from(map.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
    });
  },

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

  getPlanning: () => read<WeekPlanning | null>(KEYS.planning, null),
  setPlanning: (p: WeekPlanning) => write(KEYS.planning, p),

  getLikes: () => read<Record<string, number>>(KEYS.likes, {}),
  bumpLike: (id: string, base: number): number => {
    const all = storage.getLikes();
    const next = (all[id] ?? base) + 1;
    write(KEYS.likes, { ...all, [id]: next });
    return next;
  },

  getUnits: () => read<"metric" | "imperial">(KEYS.units, "metric"),
  setUnits: (u: "metric" | "imperial") => write(KEYS.units, u),

  resetAll: () => {
    for (const k of ALL_KEYS) localStorage.removeItem(k);
    window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: "reset" }));
  },
  exportAll: (): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const k of ALL_KEYS) {
      const raw = localStorage.getItem(k);
      out[k] = raw ? JSON.parse(raw) : null;
    }
    return out;
  },
};

export function programColor(program: string): { bg: string; text: string; hex: string } {
  const p = (program ?? "").toLowerCase();
  if (p.includes("masse")) return { bg: "bg-orange-100", text: "text-orange-700", hex: "#F97316" };
  if (p.includes("sèche") || p.includes("seche") || p.includes("cut"))
    return { bg: "bg-red-100", text: "text-red-700", hex: "#EF4444" };
  if (p.includes("perte") || p.includes("loss"))
    return { bg: "bg-sky-100", text: "text-sky-700", hex: "#0EA5E9" };
  if (p.includes("plaisir") || p.includes("pleasure"))
    return { bg: "bg-violet-100", text: "text-violet-700", hex: "#A855F7" };
  return { bg: "bg-emerald-100", text: "text-emerald-700", hex: "#4CAF82" };
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
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function startOfWeek(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export const WEEK_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const AVATAR_COLORS = [
  "#4CAF82",
  "#F97316",
  "#0EA5E9",
  "#A855F7",
  "#EF4444",
  "#F59E0B",
];
