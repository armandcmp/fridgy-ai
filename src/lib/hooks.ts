import { useEffect, useState } from "react";

export function useLocalReactive<T>(read: () => T): T {
  const [val, setVal] = useState<T>(read);
  useEffect(() => {
    setVal(read());
    const handler = () => setVal(read());
    window.addEventListener("fridgechef:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("fridgechef:change", handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return val;
}
