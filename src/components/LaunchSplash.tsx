import { useEffect, useState } from "react";
import fridgyLogo from "@/assets/fridgy-logo.jpeg.asset.json";

const SESSION_KEY = "fridgy_launch_splash_shown";

export function LaunchSplash() {
  const [show, setShow] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
    setShow(true);
    const t = setTimeout(() => setRemoved(true), 1100);
    return () => clearTimeout(t);
  }, []);

  if (!show || removed) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center animate-splash-fade"
      style={{ background: "#F8FAF8" }}
      aria-hidden="true"
    >
      <img
        src={fridgyLogo.url}
        alt=""
        className="mb-4 h-20 w-20 rounded-2xl object-cover shadow-md"
      />
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#0F1B17" }}
      >
        Fridgy
      </h1>
    </div>
  );
}
