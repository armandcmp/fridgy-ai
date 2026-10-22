export const TRIAL_DAYS = 7;
export const FREE_INTERVAL_MS = 72 * 60 * 60 * 1000;
export const CATALOG = {
  pro_monthly: { amount: 389, currency: "eur", interval: "month" },
  pro_yearly: { amount: 3588, currency: "eur", interval: "year" },
} as const;
export type PriceKey = keyof typeof CATALOG;
export type SubscriptionAccess = { status: string; current_period_end: string | null; ended_at?: string | null; price_id?: string };
export function hasPro(row: SubscriptionAccess | null, now = Date.now()): boolean {
  if (!row || row.ended_at || (row.price_id && !(row.price_id in CATALOG))) return false;
  const end = row.current_period_end ? Date.parse(row.current_period_end) : null;
  if (end !== null && (!Number.isFinite(end) || end <= now)) return false;
  if (["active", "trialing", "past_due"].includes(row.status)) return true;
  return row.status === "canceled" && end !== null;
}
export function nextFreeAt(last: string | null): number {
  return last ? Date.parse(last) + FREE_INTERVAL_MS : 0;
}
export function approvedReturnUrl(value: string, requestUrl: string, checkout = false): string {
  const url = new URL(value);
  const origin = new URL(requestUrl).origin;
  if (url.origin !== origin || url.username || url.password || !["/checkout/return", "/parametres"].includes(url.pathname)) throw new Error("Invalid return URL");
  if (checkout && url.pathname !== "/checkout/return") throw new Error("Invalid checkout return URL");
  return url.toString().replace(/%7B/g, "{").replace(/%7D/g, "}");
}