import { useTranslation } from "react-i18next";
const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  const { t } = useTranslation();
  if (!clientToken) {
    return (
      <div className="w-full rounded-xl bg-destructive/10 px-3 py-2 text-center text-[11px] text-destructive">
        {t("billing.notLive")}
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full rounded-xl bg-accent px-3 py-2 text-center text-[11px] text-accent-foreground">
        {t("billing.test")}
      </div>
    );
  }
  return null;
}
