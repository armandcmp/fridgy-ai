import { useLocalReactive } from "./hooks";
import type { UsageData } from "./types";

const USAGE_KEY = "fridgechef_usage";
const PREMIUM_KEY = "fridgechef_premium";

export const LIMITS = { recipes: 1, shopping: 1 };

function today() {
  return new Date().toISOString().split("T")[0];
}

export function getUsage(): UsageData {
  if (typeof window === "undefined") {
    return { date: today(), recipesGenerated: 0, shoppingListsCreated: 0 };
  }
  try {
    const raw = JSON.parse(localStorage.getItem("fridgy_server_usage") ?? "{}");
    return { date: today(), recipesGenerated: raw.nextAt > Date.now() ? 1 : 0, shoppingListsCreated: 0 };
  } catch { return { date: today(), recipesGenerated: 0, shoppingListsCreated: 0 }; }
}

export function bumpUsage(feature: "recipes" | "shopping") {
  void feature;
  window.dispatchEvent(new CustomEvent("fridgechef:usage-refresh"));
}

export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREMIUM_KEY) === "true";
}

export function setPremium(v: boolean) {
  localStorage.setItem(PREMIUM_KEY, String(v));
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: PREMIUM_KEY }));
}

export function checkGate(feature: "recipes" | "shopping"): {
  allowed: boolean;
  remaining: number;
} {
  if (isPremium()) return { allowed: true, remaining: Infinity };
  const u = getUsage();
  const used = feature === "recipes" ? u.recipesGenerated : u.shoppingListsCreated;
  const max = feature === "recipes" ? LIMITS.recipes : LIMITS.shopping;
  return { allowed: used < max, remaining: Math.max(0, max - used) };
}

export function usePremium(): boolean {
  return useLocalReactive(() => isPremium());
}

export function useUsage(): UsageData {
  return useLocalReactive(() => getUsage());
}
