import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCheckoutStatus } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { syncPremium } from "@/lib/subscription";
export const Route = createFileRoute("/_authenticated/checkout/return")({ validateSearch: (s: Record<string, unknown>) => ({ session_id: typeof s.session_id === "string" && /^cs_[a-zA-Z0-9_]+$/.test(s.session_id) ? s.session_id : undefined }), head: () => ({ meta: [{ title: "Fridgy — résultat du paiement" }, { name: "description", content: "Vérification de votre abonnement Fridgy Pro." }, { property: "og:title", content: "Fridgy — résultat du paiement" }, { property: "og:description", content: "Vérification de votre abonnement Fridgy Pro." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: CheckoutReturn });
function CheckoutReturn() {
  const { session_id } = Route.useSearch(); const { t } = useTranslation(); const check = useServerFn(getCheckoutStatus);
  const [state, setState] = useState(session_id ? "billing.pending" : "billing.missingSession");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { if (!session_id) return; let stopped = false; let timer: ReturnType<typeof setTimeout>; let tries = 0;
    const tick = async () => { try {
      const r = await check({ data: { sessionId: session_id, environment: getStripeEnvironment() } });
      if (stopped) return;
      if ("error" in r) { setState("billing.failed"); return; }
      if (r.status !== "complete") { setState(r.status === "expired" ? "billing.expired" : "billing.incomplete"); return; }
      const active = await syncPremium(); if (stopped) return;
      if (active) { setState("billing.activated"); return; }
      if (tries++ >= 10) { setState("billing.delayed"); return; }
      timer = setTimeout(tick, 2000);
    } catch { if (!stopped) setState("billing.failed"); } };
    setState("billing.pending"); void tick(); return () => { stopped = true; clearTimeout(timer); };
  }, [session_id, attempt]);
  return <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"><Crown className="text-primary-dark" size={40}/><h1 className="text-2xl font-bold">Fridgy Pro</h1><p role="status" className="text-sm text-muted-foreground">{t(state)}</p>{session_id && state !== "billing.activated" && <Button variant="outline" onClick={() => setAttempt(v => v + 1)}>{t("billing.retry")}</Button>}<Button asChild><Link to="/parametres">{t("billing.settings")}</Link></Button></div>;
}
