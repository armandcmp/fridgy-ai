import { useSyncExternalStore } from "react";

const KEY_USAGE = "fridgechef_usage";
const KEY_PREMIUM = "fridgechef_premium";

export const LIMITS = {
  recipesPerDay: 3,
  shoppingListsPerDay: 1,
  historyDays: 7,
} as const;

export type Feature = "recipes" | "shopping";

interface UsageData {
  date: string;
  recipesGenerated: number;
  shoppingListsCreated: number;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function readUsage(): UsageData {
  if (typeof window === "undefined")
    return { date: todayISO(), recipesGenerated: 0, shoppingListsCreated: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_USAGE) || "{}") as Partial<UsageData>;
    if (raw.date !== todayISO()) {
      const fresh = { date: todayISO(), recipesGenerated: 0, shoppingListsCreated: 0 };
      localStorage.setItem(KEY_USAGE, JSON.stringify(fresh));
      return fresh;
    }
    return {
      date: raw.date,
      recipesGenerated: raw.recipesGenerated ?? 0,
      shoppingListsCreated: raw.shoppingListsCreated ?? 0,
    };
  } catch {
    return { date: todayISO(), recipesGenerated: 0, shoppingListsCreated: 0 };
  }
}

function writeUsage(u: UsageData) {
  localStorage.setItem(KEY_USAGE, JSON.stringify(u));
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: KEY_USAGE }));
}

export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY_PREMIUM) === "true";
}

export function setPremium(on: boolean) {
  localStorage.setItem(KEY_PREMIUM, on ? "true" : "false");
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: KEY_PREMIUM }));
}

export function checkGate(feature: Feature): { allowed: boolean; remaining: number } {
  if (isPremium()) return { allowed: true, remaining: Infinity };
  const u = readUsage();
  if (feature === "recipes") {
    const remaining = Math.max(0, LIMITS.recipesPerDay - u.recipesGenerated);
    return { allowed: remaining > 0, remaining };
  }
  const remaining = Math.max(0, LIMITS.shoppingListsPerDay - u.shoppingListsCreated);
  return { allowed: remaining > 0, remaining };
}

export function bumpUsage(feature: Feature) {
  if (isPremium()) return;
  const u = readUsage();
  if (feature === "recipes") u.recipesGenerated += 1;
  else u.shoppingListsCreated += 1;
  writeUsage(u);
}

// Reactive snapshots
function subscribe(cb: () => void) {
  const h = () => cb();
  window.addEventListener("fridgechef:change", h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener("fridgechef:change", h);
    window.removeEventListener("storage", h);
  };
}

const noopSnap = { allowed: true, remaining: Infinity, premium: false };

export function useGate(feature: Feature) {
  return useSyncExternalStore(
    subscribe,
    () => {
      const g = checkGate(feature);
      return { ...g, premium: isPremium() };
    },
    () => noopSnap,
  );
}

export function usePremium() {
  return useSyncExternalStore(subscribe, () => isPremium(), () => false);
}
