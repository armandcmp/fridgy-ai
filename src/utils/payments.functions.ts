import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATALOG, TRIAL_DAYS, approvedReturnUrl } from "@/lib/billing-rules";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
const envSchema = z.enum(["sandbox", "live"]);
const priceSchema = z.enum(["pro_monthly", "pro_yearly"]);
async function resolveOrCreateCustomer(stripe: ReturnType<typeof createStripeClient>, options: { email?: string; userId?: string }): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId && customer.metadata.userId !== options.userId) throw new Error("Billing customer belongs to another account");
      if (options.userId && customer.metadata?.userId !== options.userId) await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      return customer.id;
    }
  }
  return (await stripe.customers.create({ ...(options.email && { email: options.email }), ...(options.userId && { metadata: { userId: options.userId } }) }, { idempotencyKey: `customer:${options.userId}` })).id;
}
async function priceFor(stripe: ReturnType<typeof createStripeClient>, key: keyof typeof CATALOG) {
  const price = (await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 })).data[0];
  const rule = CATALOG[key];
  if (!price || price.unit_amount !== rule.amount || price.currency !== rule.currency || price.recurring?.interval !== rule.interval || price.tax_behavior !== "inclusive") throw new Error("Catalog price configuration mismatch");
  return price;
}
export const createCheckoutSession = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ priceId: priceSchema, returnUrl: z.string().url(), environment: envSchema, language: z.enum(["fr", "en"]).optional() }))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    let locked = false;
    const operation = crypto.randomUUID();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      const returnUrl = approvedReturnUrl(data.returnUrl, getRequest().url, true);
      const { data: got, error: authError } = await context.supabase.auth.getUser();
      if (authError || !got.user) throw new Error("Sign in required");
      const { data: lock, error: lockError } = await supabaseAdmin.rpc("claim_billing_operation", { p_user: context.userId, p_env: data.environment, p_token: operation });
      if (lockError) throw new Error(lockError.message);
      if (!lock) throw new Error("Checkout already in progress. Please retry shortly.");
      locked = true;
      const stripe = createStripeClient(data.environment);
      const { data: account, error } = await supabaseAdmin.from("billing_accounts").select("*").eq("user_id", context.userId).eq("environment", data.environment).single();
      if (error) throw new Error(error.message);
      if (account.checkout_session_id) {
        const prior = await stripe.checkout.sessions.retrieve(account.checkout_session_id);
        if (prior.status === "open" && prior.metadata?.priceId === data.priceId && prior.client_secret) return { clientSecret: prior.client_secret };
        if (prior.status === "open") await stripe.checkout.sessions.expire(prior.id);
      }
      const customer = account.customer_id ?? await resolveOrCreateCustomer(stripe, { userId: context.userId, email: got.user.email });
      const { error: customerError } = await supabaseAdmin.from("billing_accounts").update({ customer_id: customer }).eq("user_id", context.userId).eq("environment", data.environment).eq("checkout_lock_token", operation);
      if (customerError) throw new Error(customerError.message);
      const history = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
      if (history.has_more) throw new Error("Billing history must be reconciled before checkout");
      if (history.data.some(s => !["canceled", "incomplete_expired"].includes(s.status))) throw new Error("You already have a subscription. Manage it in Settings.");
      const { count, error: historyError } = await context.supabase.from("subscriptions").select("id", { head: true, count: "exact" }).eq("user_id", context.userId).eq("environment", data.environment);
      if (historyError) throw new Error(historyError.message);
      const trial = !account.trial_used && count === 0 && history.data.length === 0;
      const price = await priceFor(stripe, data.priceId);
      const session = await stripe.checkout.sessions.create({
        locale: data.language ?? "fr", line_items: [{ price: price.id, quantity: 1 }], mode: "subscription", ui_mode: "embedded_page", customer, return_url: returnUrl,
        metadata: { userId: context.userId, priceId: data.priceId, managed_payments: "true" },
        subscription_data: { metadata: { userId: context.userId }, ...(trial && { trial_period_days: TRIAL_DAYS }) },
        managed_payments: { enabled: true },
      } as Stripe.Checkout.SessionCreateParams, { idempotencyKey: `checkout:${context.userId}:${data.priceId}:${account.checkout_session_id ?? "initial"}` });
      const { data: saved, error: saveError } = await supabaseAdmin.from("billing_accounts").update({ customer_id: customer, checkout_session_id: session.id }).eq("user_id", context.userId).eq("environment", data.environment).eq("checkout_lock_token", operation).eq("deleting", false).select("user_id");
      if (saveError || !saved?.length) { await stripe.checkout.sessions.expire(session.id); throw new Error(saveError?.message ?? "Checkout operation expired"); }
      if (!session.client_secret) throw new Error("Stripe returned no checkout secret");
      return { clientSecret: session.client_secret };
    } catch (e) { return { error: getStripeErrorMessage(e) }; }
    finally { if (locked) await supabaseAdmin.from("billing_accounts").update({ checkout_lock_until: null, checkout_lock_token: null }).eq("user_id", context.userId).eq("environment", data.environment).eq("checkout_lock_token", operation); }
  });
export const getBillingState = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ environment: envSchema })).handler(async ({ data, context }) => {
    try {
      const { data: rows, error } = await context.supabase.from("subscriptions").select("*").eq("user_id", context.userId).eq("environment", data.environment).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const { data: account, error: accountError } = await context.supabase.from("billing_accounts").select("trial_used,customer_id").eq("user_id", context.userId).eq("environment", data.environment).maybeSingle();
      if (accountError) throw new Error(accountError.message);
      return { rows: rows ?? [], trialEligible: !account?.trial_used && !rows?.length, hasCustomer: !!account?.customer_id || !!rows?.length };
    } catch (e) { return { error: getStripeErrorMessage(e) }; }
  });
export const getCheckoutStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ environment: envSchema, sessionId: z.string().regex(/^cs_[a-zA-Z0-9_]+$/) })).handler(async ({ data, context }) => {
    try {
      const session = await createStripeClient(data.environment).checkout.sessions.retrieve(data.sessionId);
      if (session.metadata?.userId !== context.userId) throw new Error("Checkout not found");
      return { status: session.status, paymentStatus: session.payment_status };
    } catch (e) { return { error: getStripeErrorMessage(e) }; }
  });
export const createPortalSession = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ returnUrl: z.string().url(), environment: envSchema })).handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    try {
      const returnUrl = approvedReturnUrl(data.returnUrl, getRequest().url);
      const { data: account, error } = await context.supabase.from("billing_accounts").select("customer_id").eq("user_id", context.userId).eq("environment", data.environment).maybeSingle();
      if (error) throw new Error(error.message);
      const { data: rows, error: rowError } = await context.supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", context.userId).eq("environment", data.environment).limit(1);
      if (rowError) throw new Error(rowError.message);
      const customer = account?.customer_id ?? rows?.[0]?.stripe_customer_id;
      if (!customer) throw new Error("No billing account found");
      const stripe = createStripeClient(data.environment);
      let configuration = (await stripe.billingPortal.configurations.list({ active: true, limit: 1 })).data[0];
      if (!configuration) configuration = await stripe.billingPortal.configurations.create({ business_profile: { headline: "Fridgy Pro" }, features: { customer_update: { enabled: true, allowed_updates: ["email", "address"] }, invoice_history: { enabled: true }, payment_method_update: { enabled: true }, subscription_cancel: { enabled: true, mode: "at_period_end" } } });
      return { url: (await stripe.billingPortal.sessions.create({ customer, configuration: configuration.id, return_url: returnUrl })).url };
    } catch (e) { return { error: getStripeErrorMessage(e) }; }
  });
export const changeBillingCycle = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ environment: envSchema, priceId: priceSchema.nullable() })).handler(async ({ data, context }) => {
    try {
      const { data: row, error } = await context.supabase.from("subscriptions").select("stripe_subscription_id").eq("user_id", context.userId).eq("environment", data.environment).in("status", ["active", "trialing", "past_due"]).order("created_at", { ascending: false }).limit(1).single();
      if (error) throw new Error(error.message);
      const stripe = createStripeClient(data.environment);
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      if (sub.metadata.userId !== context.userId || sub.cancel_at_period_end) throw new Error("Subscription is unavailable or scheduled to cancel");
      if (!["active", "trialing", "past_due"].includes(sub.status) || sub.items.data.length !== 1 || sub.items.data[0]?.quantity !== 1) throw new Error("Unsupported subscription configuration");
      const existing = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id;
      if (existing) { const owned = await stripe.subscriptionSchedules.retrieve(existing); if (owned.metadata.userId !== context.userId || owned.metadata.app !== "fridgy") throw new Error("This schedule cannot be changed here"); }
      if (!data.priceId) { if (existing) await stripe.subscriptionSchedules.release(existing); return { effectiveAt: null }; }
      const item = sub.items.data[0];
      if (!item || !item.current_period_end) throw new Error("Subscription period unavailable");
      const target = await priceFor(stripe, data.priceId);
      if (item.price.id === target.id) throw new Error("Already on this billing cycle");
      const schedule = existing ? await stripe.subscriptionSchedules.retrieve(existing) : await stripe.subscriptionSchedules.create({ from_subscription: sub.id });
      await stripe.subscriptionSchedules.update(schedule.id, { end_behavior: "release", proration_behavior: "none", phases: [
        { start_date: schedule.current_phase?.start_date ?? item.current_period_start, end_date: item.current_period_end, items: [{ price: item.price.id, quantity: 1 }], ...(sub.trial_end && sub.trial_end > Date.now()/1000 ? { trial_end: sub.trial_end } : {}) },
        { start_date: item.current_period_end, items: [{ price: target.id, quantity: 1 }], proration_behavior: "none", metadata: { userId: context.userId } },
      ], metadata: { userId: context.userId, nextPrice: data.priceId, app: "fridgy" } });
      return { effectiveAt: new Date(item.current_period_end * 1000).toISOString() };
    } catch (e) { return { error: getStripeErrorMessage(e) }; }
  });
export const deleteAccount = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ confirmation: z.literal("DELETE") })).handler(async ({ context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (const env of ["sandbox", "live"]) {
        const { data: account, error } = await supabaseAdmin.from("billing_accounts").select("checkout_lock_until").eq("user_id", context.userId).eq("environment", env).maybeSingle();
        if (error) throw new Error(error.message);
        const { error: markError } = await supabaseAdmin.from("billing_accounts").upsert({ user_id: context.userId, environment: env, deleting: true });
        if (markError) throw new Error(markError.message);
        if (account?.checkout_lock_until && Date.parse(account.checkout_lock_until) > Date.now()) throw new Error("A billing operation is still running. Retry deletion shortly.");
      }
      for (const environment of ["sandbox", "live"] as StripeEnv[]) {
        const { data: rows, error } = await context.supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", context.userId).eq("environment", environment);
        if (error) throw new Error(error.message);
        const { data: account, error: accountError } = await context.supabase.from("billing_accounts").select("customer_id").eq("user_id", context.userId).eq("environment", environment).maybeSingle();
        if (accountError) throw new Error(accountError.message);
        const customers = new Set([account?.customer_id, ...(rows ?? []).map(r => r.stripe_customer_id)].filter((id): id is string => !!id));
        if (!customers.size) continue;
        const { error: markError } = await supabaseAdmin.from("billing_accounts").upsert({ user_id: context.userId, environment, deleting: true, customer_id: account?.customer_id ?? [...customers][0] });
        if (markError) throw new Error(markError.message);
        const stripe = createStripeClient(environment);
        for (const customer of customers) {
          if (account?.customer_id === customer) { const { data: billing, error: billingError } = await context.supabase.from("billing_accounts").select("checkout_session_id").eq("user_id", context.userId).eq("environment", environment).maybeSingle(); if (billingError) throw new Error(billingError.message); if (billing?.checkout_session_id) { const checkout = await stripe.checkout.sessions.retrieve(billing.checkout_session_id); if (checkout.status === "open") await stripe.checkout.sessions.expire(checkout.id); } }
          const subs = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
          if (subs.has_more) throw new Error("Billing history requires additional reconciliation before deletion");
          for (const sub of subs.data) {
            if (sub.metadata.userId !== context.userId) throw new Error("Billing ownership mismatch");
            const schedule = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id;
            if (schedule) await stripe.subscriptionSchedules.release(schedule);
            if (!["canceled", "incomplete_expired"].includes(sub.status)) await stripe.subscriptions.cancel(sub.id);
          }
          if (account?.customer_id === customer && account) {
            const { data: billing } = await context.supabase.from("billing_accounts").select("checkout_session_id").eq("user_id", context.userId).eq("environment", environment).maybeSingle();
            if (billing?.checkout_session_id) { const checkout = await stripe.checkout.sessions.retrieve(billing.checkout_session_id); if (checkout.status === "open") await stripe.checkout.sessions.expire(checkout.id); }
          }
          await stripe.customers.update(customer, { name: "Deleted account", email: "", phone: "", metadata: { userId: "" } });
        }
      }
      const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
      if (error) throw new Error(error.message);
      return { deleted: true };
    } catch (e) { return { error: getStripeErrorMessage(e) }; }
  });
