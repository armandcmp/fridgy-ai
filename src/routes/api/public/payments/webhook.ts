import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook, createStripeClient } from "@/lib/stripe.server";
async function handle(request: Request, environment: StripeEnv) {
  const event = await verifyWebhook(request, environment);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: seen, error: readError } = await supabaseAdmin.from("payment_events").select("id").eq("id", event.id).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (seen) return;
  const object = event.data.object;
  const id = event.type.startsWith("customer.subscription.") ? object.id : typeof object.subscription === "string" ? object.subscription : typeof object.parent?.subscription_details?.subscription === "string" ? object.parent.subscription_details.subscription : null;
  if (id) {
    // Fetch authoritative state, rather than persisting potentially delayed payloads.
    const stripe = createStripeClient(environment);
    const sub = await stripe.subscriptions.retrieve(id);
    const userId = sub.metadata.userId;
    if (userId) {
      const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("id").eq("id", userId).maybeSingle();
      if (profileError) throw new Error(profileError.message);
      if (profile) {
        const item = sub.items.data[0];
        if (!item) throw new Error("Subscription has no price item");
        const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const product = typeof item.price.product === "string" ? item.price.product : item.price.product.id;
        const iso = (n: number | null | undefined) => n ? new Date(n * 1000).toISOString() : null;
        const { error } = await supabaseAdmin.from("subscriptions").upsert({ user_id: userId, stripe_subscription_id: sub.id, stripe_customer_id: customer, product_id: product, price_id: item.price.lookup_key ?? item.price.metadata.lovable_external_id ?? item.price.id, status: sub.status, current_period_start: iso(item.current_period_start), current_period_end: iso(item.current_period_end), ended_at: iso(sub.ended_at), cancel_at_period_end: sub.cancel_at_period_end, environment, updated_at: new Date().toISOString() }, { onConflict: "stripe_subscription_id" });
        if (error) throw new Error(error.message);
        const { error: billingError } = await supabaseAdmin.from("billing_accounts").upsert({ user_id: userId, environment, customer_id: customer, trial_used: true });
        if (billingError) throw new Error(billingError.message);
      }
    }
  }
  const { error } = await supabaseAdmin.from("payment_events").upsert({ id: event.id, environment });
  if (error) throw new Error(error.message);
}
export const Route = createFileRoute("/api/public/payments/webhook")({ server: { handlers: { POST: async ({ request }) => {
  const env = new URL(request.url).searchParams.get("env");
  if (env !== "sandbox" && env !== "live") return new Response("Invalid environment", { status: 400 });
  try { await handle(request, env); return Response.json({ received: true }); }
  catch (e) { console.error("Payment webhook failed", e); return new Response("Webhook processing failed", { status: 500 }); }
} } } });
