import type { Account, CurrentUser } from "./types";

export const ACCOUNTS_KEY = "fridgechef_accounts";
export const SESSION_KEY = "fridgechef_session_user";
export const LEGACY_USER_KEY = "fridgechef_user";

export const AVATAR_COLORS = [
  "#4CAF82",
  "#3B82F6",
  "#F97316",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
];

export function getAvatarColor(id: string): string {
  const code = id && id.length ? id.charCodeAt(0) : 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  const parts = (name || "?").trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

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

function write<T>(key: string, v: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: key }));
}

export const auth = {
  getAccounts: (): Account[] => read<Account[]>(ACCOUNTS_KEY, []),
  setAccounts: (a: Account[]) => write(ACCOUNTS_KEY, a),
  getSession: (): CurrentUser | null => read<CurrentUser | null>(SESSION_KEY, null),
  setSession: (u: CurrentUser) => write(SESSION_KEY, u),
  clearSession: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: SESSION_KEY }));
  },

  emailExists: (_email: string) => false,
  register: (_prenom: string, _email: string, _password: string): { ok: false; error: "exists" } => ({ ok: false, error: "exists" }),
  login: (_email: string, _password: string) => ({ ok: false }),

  updateSessionAndAccount(patch: Partial<CurrentUser>) {
    const sess = auth.getSession();
    if (!sess) return;
    const next: CurrentUser = { ...sess, ...patch };
    auth.setSession(next);
    const accs = auth.getAccounts();
    const idx = accs.findIndex((a) => a.id === sess.id);
    if (idx >= 0) {
      accs[idx] = {
        ...accs[idx],
        prenom: next.prenom,
        program: next.program,
        dailyKcal: next.dailyKcal,
        isPremium: next.isPremium,
      };
      auth.setAccounts(accs);
    }
  },

  migrateLegacy(): CurrentUser | null {
    if (typeof window === "undefined") return null;
    if (auth.getSession()) return auth.getSession();
    try {
      const raw = localStorage.getItem(LEGACY_USER_KEY);
      if (!raw) return null;
      const legacy = JSON.parse(raw) as {
        name: string;
        program: string;
        dailyKcal: number;
        avatarColor?: string;
      };
      const u: CurrentUser = {
        id: "guest",
        prenom: legacy.name,
        email: null,
        program: legacy.program,
        dailyKcal: legacy.dailyKcal,
        isPremium: false,
        avatarColor: legacy.avatarColor,
      };
      auth.setSession(u);
      return u;
    } catch {
      return null;
    }
  },
};
