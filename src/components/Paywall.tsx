import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Crown, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Paywall({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <div className="overflow-y-auto px-5 pb-8">
          <div
            className="-mx-5 -mt-2 mb-4 rounded-t-3xl px-5 py-6 text-white"
            style={{
              background: "linear-gradient(135deg,#F59E0B,#D97706)",
            }}
          >
            <Crown className="mb-2" size={32} />
            <h2 className="text-xl font-bold">{t("paywall.title")}</h2>
            <p className="mt-1 text-sm text-white/90">{t("paywall.subtitle")}</p>
          </div>

          <ul className="mb-5 space-y-2.5">
            {[
              t("paywall.unlimited_recipes"),
              t("paywall.full_planner"),
              t("paywall.full_history"),
              t("paywall.no_ads"),
              t("paywall.priority"),
            ].map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-amber-600" /> {b}
              </li>
            ))}
          </ul>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => setPlan("monthly")}
              className={`fc-card p-3 text-left transition ${
                plan === "monthly" ? "ring-2 ring-amber-500" : ""
              }`}
            >
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Mensuel
              </div>
              <div className="mt-1 font-bold">{t("paywall.monthly")}</div>
            </button>
            <button
              onClick={() => setPlan("annual")}
              className={`fc-card relative p-3 text-left transition ${
                plan === "annual" ? "ring-2 ring-amber-500" : ""
              }`}
            >
              <span className="absolute -top-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-white">
                {t("paywall.popular")}
              </span>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Annuel
              </div>
              <div className="mt-1 font-bold">{t("paywall.annual")}</div>
            </button>
          </div>

          <button
            onClick={() => {
              toast.success(t("paywall.coming_soon"));
              onClose();
            }}
            className="w-full rounded-full py-3.5 text-sm font-bold text-white shadow"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}
          >
            {t("paywall.cta")}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {t("paywall.cta_sub")}
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
