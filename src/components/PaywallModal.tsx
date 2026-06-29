import { useEffect, useState } from "react";
import { X, Crown, Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getTrialInfo } from "@/lib/trial";

type PlanId = "pro" | "premium";

export function PaywallModal({
  open,
  onClose,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  reason?: string;
}) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const [selected, setSelected] = useState<PlanId>("premium");
  const trial = typeof window !== "undefined" ? getTrialInfo() : null;
  const trialActive = !!trial?.active;
  const discount = trialActive ? 0.3 : 0; // -30% first month if subscribing during trial

  useEffect(() => {
    if (open) requestAnimationFrame(() => setShown(true));
    else setShown(false);
  }, [open]);

  if (!open) return null;

  const fmt = (n: number) =>
    n.toFixed(2).replace(/\.00$/, "").replace(".", ",") + "€";

  const plans: Array<{
    id: PlanId;
    name: string;
    base: number;
    sub: string;
    features: string[];
    accent: string;
  }> = [
    {
      id: "pro",
      name: "Fridgy Pro",
      base: 4.99,
      sub: "par mois",
      features: [
        "3 recettes par jour",
        "Planning de la semaine",
        "Historique complet",
        "Liste de courses illimitée",
      ],
      accent: "#2D8B57",
    },
    {
      id: "premium",
      name: "Fridgy Premium",
      base: 9.99,
      sub: "par mois",
      features: [
        "Recettes illimitées",
        "Tout Fridgy Pro inclus",
        "Génération prioritaire",
        "Nouvelles fonctionnalités en avant-première",
      ],
      accent: "#0F1B17",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100]"
      style={{
        background: "rgba(15,27,23,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 overflow-y-auto bg-card transition-transform duration-300 ease-out"
        style={{
          borderRadius: "28px 28px 0 0",
          maxHeight: "92vh",
          transform: shown ? "translate(-50%, 0)" : "translate(-50%, 100%)",
        }}
      >
        <div
          className="relative grid h-[130px] place-items-center"
          style={{
            background:
              "linear-gradient(135deg,#2DD4A8 0%,#2D8B57 60%,#0F1B17 100%)",
          }}
        >
          <div className="text-center text-white">
            <Crown size={36} className="mx-auto drop-shadow" />
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] opacity-90">
              Fridgy
            </p>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/25 text-white"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-6 pt-5">
          <h2 className="text-center text-[22px] font-extrabold tracking-tight">
            Choisissez votre formule
          </h2>
          <p className="mt-1 text-center text-[13px] text-muted-foreground">
            Sans engagement — annulez à tout moment
          </p>

          {trialActive && (
            <div
              className="mt-3 flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[12.5px] font-semibold"
              style={{ background: "#ECFDF5", color: "#065F46" }}
            >
              <Sparkles size={14} />
              Essai gratuit en cours — {trial!.daysLeft} jour
              {trial!.daysLeft > 1 ? "s" : ""} restant
              {trial!.daysLeft > 1 ? "s" : ""}. Profitez de −30 % sur votre 1er mois.
            </div>
          )}

          {reason && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
              {reason}
            </p>
          )}

          <div className="mt-5 space-y-2.5">
            {plans.map((p) => {
              const active = selected === p.id;
              const firstMonth = p.base * (1 - discount);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className="block w-full rounded-2xl p-[2px] text-left transition"
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${p.accent}, #0F1B17)`
                      : "transparent",
                  }}
                >
                  <div
                    className="rounded-[14px] border bg-white px-4 py-3.5"
                    style={{ borderColor: active ? "transparent" : "#E5E7EB" }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <p className="text-[15px] font-extrabold tracking-tight">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.sub}
                        </p>
                      </div>
                      <div className="text-right">
                        {discount > 0 ? (
                          <>
                            <p
                              className="text-[20px] font-extrabold leading-none"
                              style={{ color: active ? p.accent : "#0F1B17" }}
                            >
                              {fmt(firstMonth)}
                            </p>
                            <p className="text-[10.5px] text-muted-foreground">
                              1<sup>er</sup> mois · puis {fmt(p.base)}/mois
                            </p>
                          </>
                        ) : (
                          <p
                            className="text-[20px] font-extrabold"
                            style={{ color: active ? p.accent : "#0F1B17" }}
                          >
                            {fmt(p.base)}
                          </p>
                        )}
                      </div>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {p.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-[12.5px]"
                          style={{ color: "#374151" }}
                        >
                          <Check size={14} style={{ color: p.accent }} strokeWidth={3} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => toast(t("paywall.soon"))}
            className="mt-5 w-full rounded-full py-3.5 text-sm font-extrabold text-white shadow-lg transition active:scale-[0.98]"
            style={{
              background:
                selected === "premium"
                  ? "linear-gradient(135deg,#2D8B57,#0F1B17)"
                  : "linear-gradient(135deg,#34D399,#2D8B57)",
            }}
          >
            {trialActive
              ? `Continuer avec ${selected === "premium" ? "Premium" : "Pro"}`
              : `S'abonner à ${selected === "premium" ? "Premium" : "Pro"}`}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {t("paywall.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
