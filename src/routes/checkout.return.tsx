import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Bienvenue dans Fridgy Pro" },
      { name: "description", content: "Ton abonnement Fridgy Pro est activé." },
      { property: "og:title", content: "Bienvenue dans Fridgy Pro" },
      { property: "og:description", content: "Ton abonnement Fridgy Pro est activé." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const nav = useNavigate();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let tries = 0;
    let stop = false;
    const tick = async () => {
      const { syncPremium } = await import("@/lib/subscription");
      const ok = await syncPremium();
      if (stop) return;
      if (ok) setActive(true);
      else if (tries++ < 10) setTimeout(tick, 2000);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary text-primary-foreground">
        <Crown size={30} />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Merci !</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {active ? "Fridgy Pro est activé sur ton compte." : "Activation de ton abonnement en cours…"}
      </p>
      <button
        onClick={() => nav({ to: "/" })}
        className="mt-6 rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background"
      >
        Retour à l'accueil
      </button>
    </div>
  );
}
