import { Link, useLocation } from "@tanstack/react-router";
import {
  Home,
  UtensilsCrossed,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type Tab = { to: string; icon: typeof Home; labelKey: string; exact?: boolean };
const tabs: Tab[] = [
  { to: "/", icon: Home, labelKey: "nav.home", exact: true },
  { to: "/recettes", icon: UtensilsCrossed, labelKey: "nav.recipes" },
  { to: "/communaute", icon: Users, labelKey: "nav.community" },
  { to: "/stats", icon: BarChart3, labelKey: "nav.stats" },
  { to: "/parametres", icon: Settings, labelKey: "nav.settings" },
];

export function BottomNav() {
  const loc = useLocation();
  const { t } = useTranslation();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch justify-between px-2">
        {tabs.map((tab) => {
          const active = tab.exact
            ? loc.pathname === tab.to
            : loc.pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to as never}
                className={`flex h-full flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
