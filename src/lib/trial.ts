export type TrialInfo = { active: boolean; startedAt: number; daysLeft: number; expired: boolean };
export const TRIAL_DURATION_DAYS = 7;
export function getTrialInfo(): TrialInfo {
  let end = 0;
  if (typeof window !== "undefined") { try { end = Number(localStorage.getItem("fridgy_server_trial_end") ?? 0); } catch {} }
  const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / 86400000));
  return { active: daysLeft > 0, startedAt: end ? end - 7 * 86400000 : 0, daysLeft, expired: !!end && daysLeft === 0 };
}
