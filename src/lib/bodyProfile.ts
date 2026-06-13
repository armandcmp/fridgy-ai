export type Sexe = "homme" | "femme";
export type ActivityLevel =
  | "sedentaire"
  | "leger"
  | "modere"
  | "tres_actif";

export interface BodyProfile {
  age: number;
  sexe: Sexe;
  tailleCm: number;
  poidsKg: number;
  poidsObjectifKg: number | null;
  imc: number;
  imcCategory: string;
  activityLevel: ActivityLevel;
  activityMultiplier: number;
  bmr: number;
  tdee: number;
  updatedAt: string;
}

const KEY = "fridgechef_body_profile";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  tres_actif: 1.725,
};

export const PROTEIN_PER_KG: Record<ActivityLevel, number> = {
  sedentaire: 0.8,
  leger: 1.2,
  modere: 1.6,
  tres_actif: 2.0,
};

export function computeIMC(poidsKg: number, tailleCm: number): number {
  if (!poidsKg || !tailleCm) return 0;
  const m = tailleCm / 100;
  return +(poidsKg / (m * m)).toFixed(1);
}

export function imcCategory(imc: number): {
  key: "maigreur" | "normal" | "surpoids" | "obesite";
  color: string;
} {
  if (imc < 18.5) return { key: "maigreur", color: "#3B82F6" };
  if (imc < 25) return { key: "normal", color: "#4CAF82" };
  if (imc < 30) return { key: "surpoids", color: "#F59E0B" };
  return { key: "obesite", color: "#EF4444" };
}

export function computeBMR(
  sexe: Sexe,
  poidsKg: number,
  tailleCm: number,
  age: number,
): number {
  const base = 10 * poidsKg + 6.25 * tailleCm - 5 * age;
  return Math.round(sexe === "homme" ? base + 5 : base - 161);
}

export function computeTDEE(bmr: number, level: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[level]);
}

export function getBodyProfile(): BodyProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BodyProfile;
  } catch {
    return null;
  }
}

export function setBodyProfile(p: BodyProfile | null) {
  if (typeof window === "undefined") return;
  if (p === null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: KEY }));
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54);
}
export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn - ft * 12);
  return { ft, inches };
}
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462);
}
export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462);
}
