import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ExternalLink, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface Retailer {
  key: string;
  name: string;
  url: string;
  color: string;
}

export const RETAILERS: Retailer[] = [
  { key: "leclerc", name: "Leclerc Drive", url: "https://www.leclercdrive.fr", color: "#0E7C2D" },
  { key: "carrefour", name: "Carrefour Drive", url: "https://www.carrefour.fr/drive", color: "#1E40AF" },
  { key: "amazon", name: "Amazon Fresh", url: "https://www.amazon.fr/fresh", color: "#D97706" },
];

interface Props {
  retailer: Retailer | null;
  list: string;
  onClose: () => void;
}

export function RetailerSheet({ retailer, list, onClose }: Props) {
  const { t } = useTranslation();
  const open = !!retailer;
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[80vh]">
        {retailer && (
          <div className="overflow-y-auto px-5 pb-8">
            <div
              className="-mx-5 -mt-2 mb-4 rounded-t-3xl px-5 py-5 text-white"
              style={{ background: retailer.color }}
            >
              <h3 className="text-lg font-bold">
                {t("retailer.open", { name: retailer.name })}
              </h3>
            </div>
            <div className="fc-card max-h-48 overflow-y-auto p-3 text-xs text-muted-foreground">
              {list || "—"}
            </div>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(list);
                  toast.success(t("share.copied"));
                } catch {
                  /* ignore */
                }
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-input py-2.5 text-sm font-semibold"
            >
              <Copy size={15} /> {t("retailer.copy")}
            </button>
            <button
              onClick={() => {
                window.open(retailer.url, "_blank");
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white"
              style={{ background: retailer.color }}
            >
              <ExternalLink size={16} /> {t("retailer.open", { name: retailer.name })}
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {t("retailer.note", { name: retailer.name })}
            </p>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
