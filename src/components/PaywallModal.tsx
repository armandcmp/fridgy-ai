import { useEffect, useState } from "react";
import { X, Crown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type PlanId = "free" | "monthly" | "annual";

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
  const [selected, setSelected] = useState<PlanId>("annual");

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setShown(true));
    } else {
      setShown(false);
    }
  }, [open]);

  if (!open) return null;

  const plans: Array<{
    id: PlanId;
    name: string;
    price: string;
    sub: string;
    tag?: string;
    features: string[];
    accent: string;
  }> = [
    {
      id: "free",
      name: "Gratuit",
      price: "0€",
      sub: "Pour découvrir",
      features: ["3 recettes / jour", "Historique 7 jours", "Liste de courses limitée"],
      accent: "#94A3B8",
    },
    {
      id: "monthly",
      name: "Pro Mensuel",
      price: "4,99€",
      sub: "par mois",
      features: ["Recettes illimitées", "Planning complet", "Sans publicité"],
      accent: "#F59E0B",
    },
    {
      id: "annual",
      name: "Pro Annuel",
      price: "39,99€",
      sub: "par an · soit 3,33€/mois",
      tag: "−33% · Populaire",
      features: [
        "Tout Pro Mensuel",
        "Historique illimité",
        "Génération prioritaire",
        "Partage sans filigrane",
      ],
      accent: "#D97706",
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
              "linear-gradient(135deg,#FCD34D 0%,#F59E0B 50%,#B45309 100%)",
          }}
        >
          <div className="text-center text-white">
            <Crown size={40} className="mx-auto drop-shadow" />
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] opacity-90">
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
            Choisissez votre abonnement
          </h2>
          <p className="mt-1 text-center text-[13px] text-muted-foreground">
            Cuisinez sans limite avec Fridgy Pro
          </p>

          {reason && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
              {reason}
            </p>
          )}

          <div className="mt-5 space-y-2.5">
            {plans.map((p) => {
              const active = selected === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className="block w-full rounded-2xl p-[2px] text-left transition"
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${p.accent}, #D97706)`
                      : "transparent",
                  }}
                >
                  <div
                    className="relative rounded-[14px] border bg-white px-4 py-3.5"
                    style={{
                      borderColor: active ? "transparent" : "#E5E7EB",
                    }}
                  >
                    {p.tag && (
                      <span
                        className="absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg,#F59E0B,#B45309)",
                        }}
                      >
                        {p.tag}
                      </span>
                    )}
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <p className="text-[15px] font-extrabold tracking-tight">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.sub}
                        </p>
                      </div>
                      <p
                        className="text-[20px] font-extrabold"
                        style={{ color: active ? p.accent : "#0F1B17" }}
                      >
                        {p.price}
                      </p>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {p.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-[12.5px]"
                          style={{ color: "#374151" }}
                        >
                          <Check
                            size={14}
                            style={{ color: p.accent }}
                            strokeWidth={3}
                          />
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
            onClick={() => {
              if (selected === "free") {
                onClose();
                return;
              }
              toast(t("paywall.soon"));
            }}
            className="mt-5 w-full rounded-full py-3.5 text-sm font-extrabold text-white shadow-lg transition active:scale-[0.98]"
            style={{
              background:
                selected === "free"
                  ? "#0F1B17"
                  : "linear-gradient(135deg,#F59E0B,#D97706)",
            }}
          >
            {selected === "free"
              ? "Continuer en gratuit"
              : selected === "annual"
              ? "Commencer — 7 jours offerts"
              : "Commencer mon abonnement"}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {t("paywall.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
