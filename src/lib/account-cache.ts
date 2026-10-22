// Legacy view keys are an active-account working set, never an authentication source.
const OWNER = "fridgy_data_owner";
const EXCLUDED = new Set(["fridgechef_lang", "fridgechef_session_user", "fridgechef_user", "fridgechef_accounts", "fridgechef_premium", "fridgechef_usage", "fridgy_trial_start"]);
export function personalKeys(): string[] {
  return Object.keys(localStorage).filter(k => /^(fridgechef_|fridgy_)/.test(k) && !EXCLUDED.has(k) && k !== OWNER && !k.startsWith("fridgy_cache:"));
}
export function accountPayload(): Record<string, string> {
  return Object.fromEntries(personalKeys().map(k => [k, localStorage.getItem(k) ?? ""]));
}
export function currentOwner(): string | null { return typeof window === "undefined" ? null : localStorage.getItem(OWNER); }
export function activateAccount(id: string | null, payload?: Record<string, string>) {
  if (typeof window === "undefined") return;
  const old = currentOwner();
  if (old === id && payload === undefined) return;
  if (old) localStorage.setItem(`fridgy_cache:${old}`, JSON.stringify(accountPayload()));
  personalKeys().forEach(k => localStorage.removeItem(k));
  ["fridgechef_session_user", "fridgechef_user", "fridgechef_accounts", "fridgechef_premium", "fridgechef_usage", "fridgy_trial_start"].forEach(k => localStorage.removeItem(k));
  if (id) {
    localStorage.setItem(OWNER, id);
    let data = payload;
    if (!data) { try { data = JSON.parse(localStorage.getItem(`fridgy_cache:${id}`) ?? "{}"); } catch { data = {}; } }
    for (const [key, value] of Object.entries(data ?? {})) {
      if (/^(fridgechef_|fridgy_)/.test(key) && !EXCLUDED.has(key) && key !== OWNER && !key.startsWith("fridgy_cache:") && typeof value === "string") localStorage.setItem(key, value);
    }
  } else localStorage.removeItem(OWNER);
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: "*" }));
}