import { useEffect, useState } from "react";
import { X, Crown, Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getTrialInfo } from "@/lib/trial";

type Cycle = "monthly" | "annual";

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
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const trial = typeof window !== "undefined" ? getTrialInfo() : null;
  const trialActive = !!trial?.active;

  const monthlyPrice = 3.89;
  const annualPrice = 35.88; // 2,99€/mois facturé annuellement
  const annualMonthly = annualPrice / 12;
  const annualStrike = monthlyPrice * 12; // 46,68€
  const savingsPct = Math.round((1 - annualPrice / annualStrike) * 100);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setShown(true));
    else setShown(false);
  }, [open]);

  if (!open) return null;

  const fmt = (n: number) =>
    n.toFixed(2).replace(/\.00$/, "").replace(".", ",") + "€";

  const features = [
    "Recettes illimitées chaque jour",
    "Planning de la semaine complet",
    "Historique illimité",
    "Liste de courses illimitée",
    "Génération prioritaire",
    "Sans publicité",
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: "rgba(60,30,5,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-y-auto rounded-[28px] bg-card shadow-2xl transition-all duration-300 ease-out"
        style={{
          maxHeight: "92vh",
          transform: shown ? "scale(1)" : "scale(0.96)",
          opacity: shown ? 1 : 0,
        }}
      >
        <div
          className="relative grid h-[140px] place-items-center"
          style={{
            background:
              "linear-gradient(135deg,#FCD34D 0%,#F59E0B 55%,#B45309 100%)",
          }}
        >
          <div className="text-center text-white">
            <Crown size={38} className="mx-auto drop-shadow" />
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] opacity-95">
              Fridgy Pro
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
          <h2 className="text-center text-[22px] font-extrabold tracking-tight" style={{ color: "#0F1B17" }}>
            Passez à Fridgy Pro
          </h2>
          <p className="mt-1 text-center text-[13px] text-muted-foreground">
            Toutes les fonctionnalités, sans limite
          </p>

          {trialActive && (
            <div
              className="mt-3 flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[12.5px] font-semibold"
              style={{ background: "#FFF7E6", color: "#7C2D12" }}
            >
              <Sparkles size={14} />
              Essai gratuit — {trial!.daysLeft} jour
              {trial!.daysLeft > 1 ? "s" : ""} restant
              {trial!.daysLeft > 1 ? "s" : ""}.
            </div>
          )}

          {reason && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
              {reason}
            </p>
          )}

          {/* Cycle toggle */}
          <div
            className="mt-4 grid grid-cols-2 gap-1 rounded-full p-1"
            style={{ background: "#FFF6E2" }}
          >
            {(["monthly", "annual"] as Cycle[]).map((c) => {
              const active = cycle === c;
              return (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className="relative rounded-full py-2 text-[12.5px] font-extrabold transition"
                  style={{
                    background: active
                      ? "linear-gradient(135deg,#F59E0B,#B45309)"
                      : "transparent",
                    color: active ? "#FFFFFF" : "#7C2D12",
                  }}
                >
                  {c === "monthly" ? "Mensuel" : `Annuel · −${savingsPct}%`}
                </button>
              );
            })}
          </div>

          <div
            className="mt-4 rounded-2xl p-[2px]"
            style={{ background: "linear-gradient(135deg,#FCD34D,#F59E0B,#B45309)" }}
          >
            <div
              className="rounded-[14px] px-4 py-4"
              style={{ background: "linear-gradient(135deg,#FFFFFF 0%,#FFF6E2 100%)" }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-[16px] font-extrabold tracking-tight" style={{ color: "#0F1B17" }}>
                    Fridgy Pro {cycle === "annual" ? "Annuel" : "Mensuel"}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {cycle === "annual" ? "Facturé une fois par an" : "Sans engagement"}
                  </p>
                </div>
                <div className="text-right">
                  {cycle === "monthly" ? (
                    <p className="text-[22px] font-extrabold" style={{ color: "#B45309" }}>
                      {fmt(monthlyPrice)}
                      <span className="text-[12px] font-semibold text-muted-foreground">/mois</span>
                    </p>
                  ) : (
                    <>
                      <p className="text-[11px] font-semibold leading-none text-muted-foreground line-through decoration-[1.5px]">
                        {fmt(annualStrike)}/an
                      </p>
                      <p className="mt-1 text-[22px] font-extrabold leading-none" style={{ color: "#B45309" }}>
                        {fmt(annualPrice)}
                        <span className="text-[12px] font-semibold text-muted-foreground">/an</span>
                      </p>
                      <p className="mt-1 text-[10.5px] font-medium text-muted-foreground">
                        soit {fmt(annualMonthly)}/mois
                      </p>
                    </>
                  )}
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-[12.5px]"
                    style={{ color: "#374151" }}
                  >
                    <Check size={14} style={{ color: "#B45309" }} strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={() => toast(t("paywall.soon"))}
            className="mt-5 w-full rounded-full py-3.5 text-sm font-extrabold text-white shadow-lg transition active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#F59E0B,#B45309)" }}
          >
            {trialActive ? "Continuer avec Fridgy Pro" : "S'abonner à Fridgy Pro"}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            14 jours d'essai gratuit · Annulez à tout moment
          </p>
        </div>
      </div>
    </div>
  );
}
