const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full rounded-xl bg-destructive/10 px-3 py-2 text-center text-[11px] text-destructive">
        Les paiements réels ne sont pas encore activés.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full rounded-xl bg-accent px-3 py-2 text-center text-[11px] text-accent-foreground">
        Mode test : aucun paiement réel. Carte de test 4242 4242 4242 4242.
      </div>
    );
  }
  return null;
}
