import { Link, useLocation } from "@tanstack/react-router";
import { Home, UtensilsCrossed, Users, BarChart3, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

export function BottomNav() {
  const { t } = useTranslation();
  const loc = useLocation();
  const tabs = [
    { to: "/", icon: Home, label: t("nav.home"), exact: true },
    { to: "/recettes", icon: UtensilsCrossed, label: t("nav.recipes") },
    { to: "/communaute", icon: Users, label: t("nav.community") },
    { to: "/stats", icon: BarChart3, label: t("nav.stats") },
    { to: "/parametres", icon: Settings, label: t("nav.settings") },
  ] as const;
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch justify-between px-2">
        {tabs.map((t) => {
          const active = t.exact
            ? loc.pathname === t.to
            : loc.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <li key={t.to} className="flex-1">
              <Link
                to={t.to as never}
                className={`flex h-full flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                <span className="text-[10px] font-medium">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
