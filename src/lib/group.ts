export interface GroupSharedData {
  ingredients: string[];
  planning: unknown | null;
  updatedAt: string;
}

export interface GroupData {
  code: string;
  role: "owner" | "member";
  memberName: string;
  sharedData: GroupSharedData;
}

const KEY = "fridgechef_group";

function emit() {
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: KEY }));
}

export const groupStore = {
  get(): GroupData | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as GroupData) : null;
    } catch {
      return null;
    }
  },
  set(g: GroupData) {
    localStorage.setItem(KEY, JSON.stringify(g));
    emit();
  },
  clear() {
    localStorage.removeItem(KEY);
    emit();
  },
};

export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function encodeGroup(data: GroupSharedData & { code: string }): string {
  const json = JSON.stringify(data);
  return typeof window === "undefined" ? json : btoa(unescape(encodeURIComponent(json)));
}

export function decodeGroup(b64: string): (GroupSharedData & { code: string }) | null {
  try {
    const json = decodeURIComponent(escape(atob(b64.trim())));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
