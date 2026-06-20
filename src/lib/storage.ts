import type {
 Account,
 CurrentUser,
 IngredientMemory,
 MealEntry,
 Recipe,
 User,
 WeekPlanning,
} from "./types";

const KEYS = {
 legacyUser: "fridgechef_user",
 session: "fridgechef_session_user",
 accounts: "fridgechef_accounts",
 ingredientSession: "fridgechef_session",
 recipes: "fridgechef_recipes",
 allRecipes: "fridgechef_all_recipes",
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

function sessionToUser(s: CurrentUser): User {
 return {
 name: s.prenom,
 program: s.program ?? "",
 dailyKcal: s.dailyKcal ?? 2000,
 avatarColor: s.avatarColor,
 avatarPhoto: s.avatarPhoto,
 };
}

export const storage = {
 // ====== USER (bridges to session) ======
 getSessionUser: (): CurrentUser | null => {
 const sess = read<CurrentUser | null>(KEYS.session, null);
 if (sess) return sess;
 // migrate legacy
 const legacy = read<User | null>(KEYS.legacyUser, null);
 if (!legacy) return null;
 const u: CurrentUser = {
 id: "guest",
 prenom: legacy.name,
 email: null,
 program: legacy.program,
 dailyKcal: legacy.dailyKcal,
 isPremium: false,
 avatarColor: legacy.avatarColor,
 avatarPhoto: legacy.avatarPhoto,
 };
 write(KEYS.session, u);
 return u;
 },
 getUser: (): User | null => {
 const sess = storage.getSessionUser();
 if (!sess || !sess.program) return sess ? null : null;
 return sessionToUser(sess);
 },
 setUser: (u: User) => {
 // legacy path used by old onboarding — kept for compat
 write(KEYS.legacyUser, u);
 const sess = read<CurrentUser | null>(KEYS.session, null);
 const id = sess?.id ?? "guest";
 const next: CurrentUser = {
 id,
 prenom: u.name,
 email: sess?.email ?? null,
 program: u.program,
 dailyKcal: u.dailyKcal,
 isPremium: sess?.isPremium ?? false,
 avatarColor: u.avatarColor,
 avatarPhoto: u.avatarPhoto,
 };
 write(KEYS.session, next);
 },
 patchUser: (patch: Partial<User>) => {
 const sess = read<CurrentUser | null>(KEYS.session, null);
 if (!sess) return;
 const next: CurrentUser = {
 ...sess,
 prenom: patch.name ?? sess.prenom,
 program: patch.program ?? sess.program,
 dailyKcal: patch.dailyKcal ?? sess.dailyKcal,
 avatarColor: patch.avatarColor ?? sess.avatarColor,
 avatarPhoto: patch.avatarPhoto !== undefined ? patch.avatarPhoto : sess.avatarPhoto,
 };
 write(KEYS.session, next);
 // mirror into accounts
 const accs = read<Account[]>(KEYS.accounts, []);
 const idx = accs.findIndex((a) => a.id === sess.id);
 if (idx >= 0) {
 accs[idx] = {
 ...accs[idx],
 prenom: next.prenom,
 program: next.program,
 dailyKcal: next.dailyKcal,
 };
 write(KEYS.accounts, accs);
 }
 // mirror into legacy for older code paths
 write(KEYS.legacyUser, sessionToUser(next));
 },

 // ====== INGREDIENT SESSION ======
 getSession: () => read<string[]>(KEYS.ingredientSession, []),
 setSession: (s: string[]) => write(KEYS.ingredientSession, s),

 // ====== RECIPES (current generation set) ======
 getRecipes: () => read<Recipe[]>(KEYS.recipes, []),
 setRecipes: (r: Recipe[]) => {
 write(KEYS.recipes, r);
 storage.addAllRecipes(r);
 },

 // ====== ALL RECIPES (history of every generated recipe) ======
 getAllRecipes: () => read<Recipe[]>(KEYS.allRecipes, []),
 addAllRecipes: (recipes: Recipe[]) => {
 if (!recipes?.length) return;
 const existing = read<Recipe[]>(KEYS.allRecipes, []);
 const seen = new Set(existing.map((r) => r.titre.toLowerCase().trim()));
 const fresh: Recipe[] = [];
 for (const r of recipes) {
 const k = r.titre.toLowerCase().trim();
 if (!seen.has(k)) {
 seen.add(k);
 fresh.push(r);
 }
 }
 if (fresh.length === 0) return;
 const next = [...fresh, ...existing].slice(0, 50);
 write(KEYS.allRecipes, next);
 },

 // ====== HISTORY ======
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

 // ====== MEMORY ======
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

 // ====== FAVORITES ======
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

 // ====== PLANNING / LIKES ======
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
 "fridgechef_session_user",
 "fridgechef_accounts",
 "fridgechef_session",
 "fridgechef_recipes",
 "fridgechef_all_recipes",
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

export function programEmoji(program: string): string {
 const p = (program || "").toLowerCase();
 if (p.includes("masse") || p.includes("bulk")) return "";
 if (p.includes("sèche") || p.includes("seche") || p.includes("cut")) return "";
 if (p.includes("perte") || p.includes("loss")) return "";
 if (p.includes("maintien") || p.includes("maintain")) return "";
 return "";
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
