import { describe, it, expect } from "vitest";
import { CATALOG, TRIAL_DAYS, FREE_INTERVAL_MS, hasPro, nextFreeAt, approvedReturnUrl } from "./billing-rules";
describe("Fridgy business rules", () => {
  it("charges 389 cents monthly in euros", () => { expect(CATALOG.pro_monthly).toEqual({ amount: 389, currency: "eur", interval: "month" }); });
  it("charges 3588 cents annually in euros", () => { expect(CATALOG.pro_yearly).toEqual({ amount: 3588, currency: "eur", interval: "year" }); });
  it("offers seven trial days", () => { expect(TRIAL_DAYS).toBe(7); });
  it("allows the next free generation after 72 hours", () => { expect(FREE_INTERVAL_MS).toBe(259200000); expect(nextFreeAt("2026-10-20T09:00:00Z")).toBe(Date.parse("2026-10-23T09:00:00Z")); });
  it("retains canceled access only until period end", () => { const row = { status: "canceled", price_id: "pro_monthly", current_period_end: "2026-10-21T09:00:00Z" }; expect(hasPro(row, Date.parse("2026-10-20T09:00:00Z"))).toBe(true); expect(hasPro(row, Date.parse("2026-10-21T09:00:00Z"))).toBe(false); });
  it("rejects missing and inherited catalog identifiers", () => { for (const price_id of [undefined, "toString", "constructor"]) expect(hasPro({status: "active", price_id, current_period_end: "2099-01-01"})).toBe(false); });
  it("does not grant access after immediate termination", () => { expect(hasPro({ status: "canceled", current_period_end: "2099-01-01", ended_at: "2026-10-20" })).toBe(false); });
  it("rejects another payment origin", () => { expect(() => approvedReturnUrl("https://evil.example/checkout/return", "https://fridgy-ai.lovable.app/")).toThrow(); });
  it("preserves Stripe return substitution", () => { expect(approvedReturnUrl("https://fridgy-ai.lovable.app/checkout/return?session_id={CHECKOUT_SESSION_ID}", "https://fridgy-ai.lovable.app/", true)).toContain("{CHECKOUT_SESSION_ID}"); });
});