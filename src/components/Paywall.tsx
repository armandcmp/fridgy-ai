import { X, Crown, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Paywall({ open, onClose }: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  const benefits = [
    t("paywall.benefit.recipes"),
    t("paywall.benefit.planning"),
    t("paywall.benefit.history"),
    t("paywall.benefit.share"),
    t("paywall.benefit.priority"),
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-md animate-paywall-up overflow-hidden bg-card"
        style={{
          maxHeight: "85vh",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflowY: "auto",
        }}
      >
        <div
          className="relative flex h-[120px] items-center justify-center"
          style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
        >
          <Crown size={48} className="text-white drop-shadow" />
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/25 text-white backdrop-blur"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pt-5">
          <h2 className="text-2xl font-bold">{t("paywall.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("paywall.subtitle")}</p>

          <ul className="mt-5 space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm">
                <Sparkles size={16} className="mt-0.5 text-amber-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="fc-card p-4 text-center">
              <div className="text-2xl font-bold">4,99€</div>
              <div className="text-xs text-muted-foreground">{t("paywall.perMonth")}</div>
              <div className="mt-2 text-xs font-semibold">{t("paywall.monthly")}</div>
            </div>
            <div className="fc-card relative p-4 text-center ring-2 ring-amber-400">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white">
                {t("paywall.discount")}
              </span>
              <div className="text-2xl font-bold">39,99€</div>
              <div className="text-xs text-muted-foreground">{t("paywall.perYear")}</div>
              <div className="mt-2 text-xs font-semibold">{t("paywall.annual")}</div>
            </div>
          </div>

          <button
            onClick={() => toast(t("paywall.soon"))}
            className="mt-6 w-full rounded-full py-3.5 text-sm font-bold text-white shadow-lg active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
          >
            {t("paywall.cta")}
          </button>
          <p className="mb-6 mt-3 text-center text-[11px] text-muted-foreground">
            {t("paywall.ctaHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
