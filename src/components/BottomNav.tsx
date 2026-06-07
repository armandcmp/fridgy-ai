import { useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Calendar, Users, Settings, Plus, Camera, Mic, Keyboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "./BottomSheet";

export function BottomNav() {
  const { t } = useTranslation();
  const loc = useLocation();
  const nav = useNavigate();
  const [sheet, setSheet] = useState(false);

  const tabs: { to: string; icon: typeof Home; label: string; exact?: boolean }[] = [
    { to: "/", icon: Home, label: t("nav.home"), exact: true },
    { to: "/planning", icon: Calendar, label: t("nav.planning") },
    { to: "/communaute", icon: Users, label: t("nav.community") },
    { to: "/parametres", icon: Settings, label: t("nav.settings") },
  ];

  const go = (mode: "photo" | "voice" | "manual") => {
    setSheet(false);
    nav({ to: "/frigo", search: { mode } });
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card"
        style={{ paddingBottom: "env(safe-area-inset-bottom)", overflow: "visible" }}
      >
        <ul className="relative mx-auto flex h-16 max-w-md items-stretch justify-between px-2">
          {/* Tab 1 — Home */}
          <Tab tab={tabs[0]} active={loc.pathname === "/"} />
          {/* Tab 2 — Planning */}
          <Tab tab={tabs[1]} active={loc.pathname.startsWith("/planning")} />

          {/* Center action */}
          <li className="flex-1">
            <div className="relative h-full">
              <button
                onClick={() => setSheet(true)}
                aria-label={t("nav.add")}
                className="absolute left-1/2 grid place-items-center text-white transition active:scale-95"
                style={{
                  top: -16,
                  transform: "translateX(-50%)",
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: "#4CAF82",
                  boxShadow: "0 4px 16px rgba(76,175,130,0.45)",
                }}
              >
                <Plus size={24} strokeWidth={2.6} />
              </button>
            </div>
          </li>

          {/* Tab 4 — Community */}
          <Tab tab={tabs[2]} active={loc.pathname.startsWith("/communaute")} />
          {/* Tab 5 — Settings */}
          <Tab tab={tabs[3]} active={loc.pathname.startsWith("/parametres")} />
        </ul>
      </nav>

      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={t("sheet.addTitle")}
      >
        <div className="space-y-3 pb-2">
          <SheetCard
            icon={<Camera size={22} />}
            title={t("sheet.photoTitle")}
            sub={t("sheet.photoSub")}
            onClick={() => go("photo")}
          />
          <SheetCard
            icon={<Mic size={22} />}
            title={t("sheet.voiceTitle")}
            sub={t("sheet.voiceSub")}
            onClick={() => go("voice")}
          />
          <SheetCard
            icon={<Keyboard size={22} />}
            title={t("sheet.manualTitle")}
            sub={t("sheet.manualSub")}
            onClick={() => go("manual")}
          />
        </div>
      </BottomSheet>
    </>
  );
}

function Tab({
  tab,
  active,
}: {
  tab: { to: string; icon: typeof Home; label: string };
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <li className="flex-1">
      <Link
        to={tab.to as never}
        className={`flex h-full flex-col items-center justify-center gap-1 transition-colors ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Icon size={22} strokeWidth={active ? 2.4 : 2} />
        <span className="text-[10px] font-medium">{tab.label}</span>
      </Link>
    </li>
  );
}

function SheetCard({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.98]"
      style={{ minHeight: 80 }}
    >
      <span
        className="grid place-items-center text-primary"
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          background: "rgba(76,175,130,0.15)",
        }}
      >
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}
