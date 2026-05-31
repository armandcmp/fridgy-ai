import { Link, useLocation } from "@tanstack/react-router";
import {
  Home,
  UtensilsCrossed,
  Calendar,
  BarChart3,
  History,
} from "lucide-react";

type Tab = { to: string; icon: typeof Home; label: string; exact?: boolean };
const tabs: Tab[] = [
  { to: "/", icon: Home, label: "Accueil", exact: true },
  { to: "/recettes", icon: UtensilsCrossed, label: "Recettes" },
  { to: "/planning", icon: Calendar, label: "Planning" },
  { to: "/stats", icon: BarChart3, label: "Stats" },
  { to: "/historique", icon: History, label: "Historique" },
];

export function BottomNav() {
  const loc = useLocation();
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
                to={t.to}
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
