import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { X, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getBillingState } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
export function PaywallModal({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  const { t, i18n } = useTranslation();
  const [cycle, setCycle] = useState<"pro_monthly" | "pro_yearly">("pro_monthly");
  const [checkout, setCheckout] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [error, setError] = useState("");
  const billing = useServerFn(getBillingState);
  useEffect(() => { if (!open) { setCheckout(false); return; } let alive = true; setError("");
    void billing({ data: { environment: getStripeEnvironment() } }).then(r => { if (!alive) return; if ("error" in r) setError(r.error ?? "Billing unavailable"); else setEligible(r.trialEligible); }).catch(e => { if (alive) setError(String(e)); });
    return () => { alive = false; };
  }, [open, billing]);
  if (!open) return null;
  const fmt = (v: number) => new Intl.NumberFormat(i18n.language, { style: "currency", currency: "EUR" }).format(v);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Fridgy Pro" className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
      <header className="relative bg-primary-light px-5 py-7 text-center"><Crown className="mx-auto mb-2 text-primary-dark" size={34}/><h2 className="text-2xl font-bold">Fridgy Pro</h2><Button variant="ghost" size="icon" aria-label={t("billing.close")} onClick={onClose} className="absolute right-3 top-3"><X/></Button></header>
      <div className="p-5"><PaymentTestModeBanner/>{reason && <p className="mt-3 text-sm text-muted-foreground">{reason}</p>}
        <div className="my-4 grid grid-cols-2 gap-2">{(["pro_monthly", "pro_yearly"] as const).map(key => <Button key={key} disabled={checkout} variant={cycle === key ? "default" : "outline"} onClick={() => setCycle(key)}>{t(key === "pro_monthly" ? "billing.monthly" : "billing.yearly")}</Button>)}</div>
        <div className="mb-4 text-center">{cycle === "pro_yearly" && <p className="text-sm text-muted-foreground line-through">{fmt(46.68)}</p>}<p className="text-3xl font-bold">{fmt(cycle === "pro_monthly" ? 3.89 : 35.88)}<span className="text-sm font-normal">/{t(cycle === "pro_monthly" ? "billing.month" : "billing.year")}</span></p><p className="mt-1 text-xs text-muted-foreground">{t("billing.taxIncluded")}</p></div>
        <ul className="mb-5 space-y-2 text-sm">{["billing.unlimited", "billing.tools", "billing.noAds"].map(k => <li key={k} className="flex gap-2"><Check size={16} className="text-primary-dark"/>{t(k)}</li>)}</ul>
        {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
        {checkout ? <StripeEmbeddedCheckout priceId={cycle}/> : <Button className="w-full" disabled={!!error} onClick={() => setCheckout(true)}>{t(eligible ? "billing.startTrial" : "billing.subscribe")}</Button>}
        <p className="mt-3 text-center text-xs text-muted-foreground">{t(eligible ? "billing.trialOffer" : "billing.cancelAnytime")}</p>
      </div>
    </div>
  </div>;
}
