import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { setPremium } from "@/lib/freemium";

import { hasPro } from "@/lib/billing-rules";
import { currentOwner } from "@/lib/account-cache";
export const isSubActive = hasPro;

export async function syncPremium(): Promise<boolean> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setPremium(false); return false; }
    const { data, error } = await supabase
      .from("subscriptions")
      .select("status, current_period_end, ended_at, price_id")
      .eq("user_id", u.user.id)
      .eq("environment", getStripeEnvironment())
;
    if (error) throw error;
    if (currentOwner() !== u.user.id) return false;
    const active = data?.some(row => hasPro(row)) ?? false;
    setPremium(active);
    return active;
  } catch {
    setPremium(false);
    return false;
  }
}
