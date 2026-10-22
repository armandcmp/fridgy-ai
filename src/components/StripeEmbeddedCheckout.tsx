import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";
export function StripeEmbeddedCheckout({ priceId }: { priceId: "pro_monthly" | "pro_yearly" }) {
  const create = useServerFn(createCheckoutSession);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let alive = true; void create({ data: { priceId, environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}` } }).then(r => { if (!alive) return; if ("error" in r) setError(r.error); else setSecret(r.clientSecret); }).catch(e => { if (alive) setError(String(e)); }); return () => { alive = false; }; }, [create, priceId]);
  const fetchClientSecret = useCallback(async () => secret ?? "", [secret]);
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!secret) return <div className="h-24 animate-pulse rounded-lg bg-muted"/>;
  return <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}><EmbeddedCheckout/></EmbeddedCheckoutProvider>;
}
