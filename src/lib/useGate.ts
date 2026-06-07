import { useCallback } from "react";
import { storage } from "./storage";
import { useLocalReactive } from "./hooks";
import { usePaywall } from "@/components/PaywallProvider";

export type Feature = "recipes" | "shopping" | "planning" | "history";

const LIMITS = {
  recipes: 3,
  shopping: 1,
  planning: 0, // free users blocked
  history: 7, // days
};

export function useGate(feature: Feature) {
  const premium = useLocalReactive(() => storage.isPremium());
  const usage = useLocalReactive(() => storage.getUsage());
  const { open } = usePaywall();

  let allowed = true;
  let remaining = Infinity;
  if (!premium) {
    if (feature === "recipes") {
      remaining = Math.max(0, LIMITS.recipes - usage.recipesGenerated);
      allowed = remaining > 0;
    } else if (feature === "shopping") {
      remaining = Math.max(0, LIMITS.shopping - usage.shoppingListsCreated);
      allowed = remaining > 0;
    } else if (feature === "planning") {
      allowed = false;
    }
  }

  const showPaywall = useCallback(() => open(), [open]);

  const consume = useCallback(() => {
    if (premium) return;
    if (feature === "recipes") storage.incrementUsage("recipes");
    if (feature === "shopping") storage.incrementUsage("shopping");
  }, [feature, premium]);

  return { allowed, remaining, showPaywall, consume, premium };
}
