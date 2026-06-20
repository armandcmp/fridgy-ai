export type MealType = "petit-dejeuner" | "dejeuner" | "diner";

const KEY = "fridgechef_current_meal";
const SESSION_MEAL_KEY = "fridgechef_session_meal";

export const MEAL_META: Record<
  MealType,
  { emoji: string; color: string; labelKey: string; shortKey: string }
> = {
  "petit-dejeuner": {
    emoji: "",
    color: "#F4A93C",
    labelKey: "meal.breakfast",
    shortKey: "meal.breakfastShort",
  },
  dejeuner: {
    emoji: "",
    color: "#2D8B57",
    labelKey: "meal.lunch",
    shortKey: "meal.lunchShort",
  },
  diner: {
    emoji: "",
    color: "#4F8FD9",
    labelKey: "meal.dinner",
    shortKey: "meal.dinnerShort",
  },
};

export function getCurrentMeal(): MealType {
  if (typeof window === "undefined") return "dejeuner";
  const v = localStorage.getItem(KEY);
  if (v === "petit-dejeuner" || v === "dejeuner" || v === "diner") return v;
  return "dejeuner";
}

export function setCurrentMeal(m: MealType) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, m);
  localStorage.setItem(SESSION_MEAL_KEY, m);
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: KEY }));
}
