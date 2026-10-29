import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasPro, nextFreeAt } from "@/lib/billing-rules";

export function serverPaymentEnv(): "sandbox" | "live" {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
  if (token?.startsWith("pk_test_")) return "sandbox";
  if (token?.startsWith("pk_live_")) return "live";
  throw new Error("Payments configuration unavailable");
}
export const requireAIAccess = createMiddleware({ type: "function" }).middleware([requireSupabaseAuth]).server(async ({ next, context }) => {
  const environment = serverPaymentEnv();
  const { data: rows, error } = await context.supabase.from("subscriptions").select("status,current_period_end,ended_at,price_id").eq("user_id", context.userId).eq("environment", environment);
  if (error) throw new Error(error.message);
  const premium = rows?.some(row => hasPro(row)) ?? false;
  if (!premium) {
    const { data, error: usageError } = await context.supabase.from("generation_usage").select("last_success_at").eq("user_id", context.userId).eq("environment", environment).maybeSingle();
    if (usageError) throw new Error(usageError.message);
    const at = nextFreeAt(data?.last_success_at ?? null);
    if (at > Date.now()) throw new Error(`FREE_LIMIT:${new Date(at).toISOString()}`);
  }
  return next({ context: { environment, premium } });
});
export const reserveAIGeneration = createMiddleware({ type: "function" }).middleware([requireAIAccess]).server(async ({ next, context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const reservation = crypto.randomUUID();
  const { data, error } = await supabaseAdmin.rpc("reserve_generation", { p_user: context.userId, p_env: context.environment, p_reservation: reservation });
  if (error) throw new Error(error.message);
  const result = data as { allowed?: boolean; premium?: boolean; next_at?: string } | null;
  if (!result?.allowed) throw new Error(result?.next_at ? `FREE_LIMIT:${result.next_at}` : "Generation already in progress");
  const finish = async (success: boolean) => {
    const { data: completed, error: finishError } = await supabaseAdmin.rpc("finalize_generation", { p_user: context.userId, p_env: context.environment, p_reservation: reservation, p_success: success, p_premium: result.premium ?? false });
    if (finishError) throw new Error(finishError.message);
    if (success && !completed) throw new Error("Generation reservation expired");
  };
  let response;
  try { response = await next(); }
  catch (error) { try { await finish(false); } catch { console.error("Generation release failed"); } throw error; }
  await finish(true);
  return response;
});
