import type {
  GroupData,
  IngredientMemory,
  MealEntry,
  NotifSettings,
  Recipe,
  Units,
  UsageData,
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
  // V3
  lang: "fridgechef_lang",
  usage: "fridgechef_usage",
  premium: "fridgechef_premium",
  group: "fridgechef_group",
  notif: "fridgechef_notif",
  units: "fridgechef_units",
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

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function randomCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

export const storage = {
  // User
  getUser: () => read<User | null>(KEYS.user, null),
  setUser: (u: User) => write(KEYS.user, u),
  updateUser: (patch: Partial<User>) => {
    const u = storage.getUser();
    if (u) storage.setUser({ ...u, ...patch });
  },

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
  clearHistory: () => write(KEYS.history, []),

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

  // ===== V3 =====

  // Usage / Freemium
  getUsage: (): UsageData => {
    const u = read<UsageData | null>(KEYS.usage, null);
    const today = todayKey();
    if (!u || u.date !== today) {
      return { date: today, recipesGenerated: 0, shoppingListsCreated: 0 };
    }
    return u;
  },
  incrementUsage: (kind: "recipes" | "shopping") => {
    const u = storage.getUsage();
    if (kind === "recipes") u.recipesGenerated += 1;
    if (kind === "shopping") u.shoppingListsCreated += 1;
    write(KEYS.usage, u);
  },

  isPremium: () => read<boolean>(KEYS.premium, false),
  setPremium: (v: boolean) => write(KEYS.premium, v),

  // Group
  getGroup: () => read<GroupData | null>(KEYS.group, null),
  createGroup: (memberName: string): GroupData => {
    const g: GroupData = {
      code: randomCode(),
      role: "owner",
      members: [memberName],
      sharedIngredients: storage.getSession(),
      sharedPlanning: storage.getPlanning(),
    };
    write(KEYS.group, g);
    return g;
  },
  joinGroup: (code: string, memberName: string): GroupData | null => {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) return null;
    const g: GroupData = {
      code: clean,
      role: "member",
      members: [memberName],
      sharedIngredients: [],
      sharedPlanning: null,
    };
    write(KEYS.group, g);
    return g;
  },
  leaveGroup: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEYS.group);
    window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: KEYS.group }));
  },
  exportGroup: (): string => {
    const g = storage.getGroup();
    if (!g) return "";
    return JSON.stringify({
      ...g,
      sharedIngredients: storage.getSession(),
      sharedPlanning: storage.getPlanning(),
    });
  },
  importGroup: (raw: string): boolean => {
    try {
      const data = JSON.parse(raw) as GroupData;
      if (!data.code) return false;
      const cur = storage.getGroup();
      write(KEYS.group, { ...data, role: cur?.role ?? "member" });
      if (data.sharedIngredients?.length) storage.setSession(data.sharedIngredients);
      if (data.sharedPlanning) storage.setPlanning(data.sharedPlanning);
      return true;
    } catch {
      return false;
    }
  },

  // Notifications settings
  getNotif: (): NotifSettings =>
    read<NotifSettings>(KEYS.notif, {
      enabled: false,
      mealReminder: true,
      mealTime: "12:00",
      planningReminder: true,
      streakReminder: true,
    }),
  setNotif: (n: NotifSettings) => write(KEYS.notif, n),

  // Units
  getUnits: (): Units => read<Units>(KEYS.units, "metric"),
  setUnits: (u: Units) => write(KEYS.units, u),

  // App reset
  resetAll: () => {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: "reset" }));
  },
  exportAll: (): string => {
    const data: Record<string, unknown> = {};
    Object.entries(KEYS).forEach(([k, key]) => {
      if (typeof window === "undefined") return;
      const v = localStorage.getItem(key);
      data[k] = v ? JSON.parse(v) : null;
    });
    return JSON.stringify(data, null, 2);
  },
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

export function programGradient(program: string): [string, string] {
  const p = program.toLowerCase();
  if (p.includes("perte")) return ["#38BDF8", "#0284C7"];
  if (p.includes("masse")) return ["#FB923C", "#C2410C"];
  if (p.includes("végé") || p.includes("vege")) return ["#34D399", "#047857"];
  if (p.includes("sport") || p.includes("perf")) return ["#A78BFA", "#6D28D9"];
  return ["#FBBF24", "#B45309"];
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
