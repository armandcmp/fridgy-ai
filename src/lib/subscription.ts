import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { setPremium } from "@/lib/freemium";

/** Pro access: active/trialing/past_due, or canceled with time left in the paid period. */
export function isSubActive(row: { status: string; current_period_end: string | null } | null): boolean {
  if (!row) return false;
  const end = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
  const future = end === null || end > Date.now();
  if (["active", "trialing", "past_due"].includes(row.status)) return future;
  if (row.status === "canceled") return end !== null && end > Date.now();
  return false;
}

export async function syncPremium(): Promise<boolean> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return false;
    const { data } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", u.user.id)
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const active = isSubActive(data);
    setPremium(active);
    return active;
  } catch {
    return false;
  }
}
