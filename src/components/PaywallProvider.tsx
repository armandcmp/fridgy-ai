import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Paywall } from "./Paywall";

interface Ctx {
  open: () => void;
  close: () => void;
}

const PaywallCtx = createContext<Ctx>({ open: () => {}, close: () => {} });

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return (
    <PaywallCtx.Provider value={{ open, close }}>
      {children}
      <Paywall open={isOpen} onClose={close} />
    </PaywallCtx.Provider>
  );
}

export function usePaywall() {
  return useContext(PaywallCtx);
}
