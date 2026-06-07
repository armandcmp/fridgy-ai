import { useEffect, useReducer, useRef } from "react";

/**
 * Reads from localStorage (or any client store) and re-renders on change.
 * Hydration-safe: on the very first render (SSR + first client paint) it
 * returns the SSR fallback (window-free), then re-reads after mount.
 */
export function useLocalReactive<T>(read: () => T): T {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    force();
    const handler = () => force();
    window.addEventListener("fridgechef:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("fridgechef:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  if (!mountedRef.current && typeof window !== "undefined") {
    // First client paint must mirror SSR (which had no window).
    // Return the read() result evaluated as if no window existed.
    // The storage `read` helper checks `typeof window === "undefined"`,
    // so we can't easily fake it — return a "fresh fallback" instead.
    // Trick: call read() with window temporarily hidden.
    return readWithoutWindow(read);
  }
  return read();
}

function readWithoutWindow<T>(read: () => T): T {
  if (typeof window === "undefined") return read();
  const g = globalThis as unknown as { window?: Window };
  const w = g.window;
  try {
    delete g.window;
    return read();
  } finally {
    g.window = w;
  }
}
