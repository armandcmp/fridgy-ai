import { useEffect, useState } from "react";
import { X, Crown, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setShown(true));
    } else {
      setShown(false);
    }
  }, [open]);

  if (!open) return null;

  const benefits = [
    t("paywall.b1"),
    t("paywall.b2"),
    t("paywall.b3"),
    t("paywall.b4"),
    t("paywall.b5"),
  ];

  return (
    <div
      className="fixed inset-0 z-[100]"
      style={{
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 overflow-y-auto bg-card transition-transform duration-300 ease-out"
        style={{
          borderRadius: "24px 24px 0 0",
          maxHeight: "85vh",
          transform: shown ? "translate(-50%, 0)" : "translate(-50%, 100%)",
        }}
      >
        {/* Gradient banner */}
        <div
          className="relative grid h-[120px] place-items-center"
          style={{
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
          }}
        >
          <Crown size={48} className="text-white drop-shadow" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/25 text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-5">
          <h2 className="text-center text-2xl font-bold">{t("paywall.title")}</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {t("paywall.subtitle")}
          </p>
          {reason && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
              {reason}
            </p>
          )}

          <ul className="mt-5 space-y-2.5">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-amber-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border p-4 text-center">
              <p className="text-xs font-medium text-muted-foreground">{t("paywall.monthly")}</p>
              <p className="mt-1 text-2xl font-extrabold">
                4,99€<span className="text-xs font-normal text-muted-foreground">/mois</span>
              </p>
            </div>
            <div className="relative rounded-2xl border-2 border-amber-500 p-4 text-center">
              <span
                className="absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-900"
                style={{ background: "linear-gradient(135deg, #FDE68A, #F59E0B)" }}
              >
                {t("paywall.badge")}
              </span>
              <p className="text-xs font-medium text-muted-foreground">{t("paywall.annual")}</p>
              <p className="mt-1 text-2xl font-extrabold">
                39,99€<span className="text-xs font-normal text-muted-foreground">/an</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => toast(t("paywall.soon"))}
            className="mt-5 w-full rounded-full py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
          >
            {t("paywall.cta")}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {t("paywall.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
