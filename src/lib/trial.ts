// 14-day free trial of Premium features, auto-started on first call.
const KEY = "fridgy_trial_start";
const DURATION_DAYS = 14;

export type TrialInfo = {
  active: boolean;
  startedAt: number;
  daysLeft: number; // 0 once expired
  expired: boolean;
};

export function getTrialInfo(): TrialInfo {
  if (typeof window === "undefined") {
    return { active: false, startedAt: 0, daysLeft: 0, expired: false };
  }
  let raw = localStorage.getItem(KEY);
  if (!raw) {
    raw = String(Date.now());
    localStorage.setItem(KEY, raw);
  }
  const startedAt = Number(raw);
  const elapsedMs = Date.now() - startedAt;
  const totalMs = DURATION_DAYS * 24 * 60 * 60 * 1000;
  const remainingMs = totalMs - elapsedMs;
  const daysLeft = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const active = remainingMs > 0;
  return { active, startedAt, daysLeft, expired: !active };
}

export const TRIAL_DURATION_DAYS = DURATION_DAYS;
