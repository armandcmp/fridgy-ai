import type { GroupData, GroupSharedData } from "./types";

const GROUP_KEY = "fridgechef_group";

export function getGroup(): GroupData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GROUP_KEY);
    return raw ? (JSON.parse(raw) as GroupData) : null;
  } catch {
    return null;
  }
}

export function setGroup(g: GroupData) {
  localStorage.setItem(GROUP_KEY, JSON.stringify(g));
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: GROUP_KEY }));
}

export function clearGroup() {
  localStorage.removeItem(GROUP_KEY);
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: GROUP_KEY }));
}

export function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function updateShared(patch: Partial<GroupSharedData>) {
  const g = getGroup();
  if (!g) return;
  setGroup({
    ...g,
    sharedData: { ...g.sharedData, ...patch, updatedAt: new Date().toISOString() },
  });
}

export function encodeExport(g: GroupData): string {
  const json = JSON.stringify(g);
  if (typeof window === "undefined") return "";
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeImport(code: string): GroupData {
  const json = decodeURIComponent(escape(atob(code.trim())));
  const parsed = JSON.parse(json) as GroupData;
  if (!parsed.code || !parsed.sharedData) throw new Error("invalid");
  return parsed;
}
