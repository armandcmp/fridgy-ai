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
  getUser: () => read<User | null>(KEYS.user, null),
  setUser: (u: User) => write(KEYS.user, u),
  patchUser: (patch: Partial<User>) => {
    const u = storage.getUser();
    if (!u) return;
    write(KEYS.user, { ...u, ...patch });
  },

  getSession: () => read<string[]>(KEYS.session, []),
  setSession: (s: string[]) => write(KEYS.session, s),

  getRecipes: () => read<Recipe[]>(KEYS.recipes, []),
  setRecipes: (r: Recipe[]) => write(KEYS.recipes, r),

  getHistory: () => read<MealEntry[]>(KEYS.history, []),
  setHistory: (h: MealEntry[]) => write(KEYS.history, h),
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
  clearHistory: () => write(KEYS.history, []),

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
  addLike: (id: string, delta = 1) => {
    const l = storage.getLikes();
    l[id] = (l[id] ?? 0) + delta;
    write(KEYS.likes, l);
  },

  resetAll: () => {
    if (typeof window === "undefined") return;
    [
      "fridgechef_user",
      "fridgechef_session",
      "fridgechef_recipes",
      "fridgechef_history",
      "fridgechef_memory",
      "fridgechef_favorites",
      "fridgechef_planning",
      "fridgechef_likes",
      "fridgechef_usage",
      "fridgechef_premium",
      "fridgechef_group",
    ].forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: "*" }));
  },
};

export function programColor(program: string): { bg: string; text: string } {
  const p = (program || "").toLowerCase();
  if (p.includes("masse") || p.includes("bulk") || p.includes("volumen") || p.includes("ganho") || p.includes("增"))
    return { bg: "bg-blue-100", text: "text-blue-700" };
  if (p.includes("sèche") || p.includes("seche") || p.includes("cut") || p.includes("definici") || p.includes("seca") || p.includes("减脂"))
    return { bg: "bg-orange-100", text: "text-orange-700" };
  if (p.includes("perte") || p.includes("loss") || p.includes("emagre") || p.includes("减重") || p.includes("pérdida"))
    return { bg: "bg-emerald-100", text: "text-emerald-700" };
  if (p.includes("maintien") || p.includes("maintain") || p.includes("mantén") || p.includes("manten") || p.includes("维持"))
    return { bg: "bg-teal-100", text: "text-teal-700" };
  return { bg: "bg-emerald-100", text: "text-emerald-700" };
}

export function frenchDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (typeof window === "undefined") return "";
  try {
    return d.toLocaleDateString(navigator.language || "fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function startOfWeek(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
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
