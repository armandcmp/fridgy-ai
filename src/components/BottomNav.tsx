import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Home,
  ChefHat,
  Calendar,
  Settings,
  Plus,
  Camera,
  Mic,
  Pencil,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "./BottomSheet";
import { MEAL_META, setCurrentMeal, getCurrentMeal, type MealType } from "@/lib/meal";

function guessMealFromTime(): MealType {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "petit-dejeuner";
  if (h >= 11 && h < 16) return "dejeuner";
  return "diner";
}

export function BottomNav() {
  const { t } = useTranslation();
  const loc = useLocation();
  const nav = useNavigate();
  const [sheet, setSheet] = useState(false);
  const [meal, setMeal] = useState<MealType>(() => guessMealFromTime());
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (sheet) {
      const stored = getCurrentMeal();
      // If user has no explicit choice yet (default 'dejeuner') still prefer time-based
      setMeal(stored || guessMealFromTime());
    } else {
      setFlash(null);
    }
  }, [sheet]);

  const tabs: { to: string; icon: typeof Home; label: string }[] = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/recettes", icon: ChefHat, label: t("nav.recipes") },
    { to: "/planning", icon: Calendar, label: t("nav.planning") },
    { to: "/parametres", icon: Settings, label: t("nav.settings") },
  ];

  const pickMeal = (m: MealType) => setMeal(m);

  const go = (mode: "photo" | "voice" | "manual") => {
    setCurrentMeal(meal);
    setFlash(mode);
    setTimeout(() => {
      setSheet(false);
      nav({ to: "/frigo", search: { mode } });
    }, 150);
  };

  const path = loc.pathname;
  const isActive = (to: string) =>
    to === "/" ? path === "/" : path.startsWith(to);

  const MEALS: MealType[] = ["petit-dejeuner", "dejeuner", "diner"];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card"
        style={{ paddingBottom: "env(safe-area-inset-bottom)", overflow: "visible" }}
      >
        <ul className="relative mx-auto flex h-16 max-w-md items-stretch justify-between px-2">
          <Tab tab={tabs[0]} active={isActive(tabs[0].to)} />
          <Tab tab={tabs[1]} active={isActive(tabs[1].to)} />

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

          <Tab tab={tabs[2]} active={isActive(tabs[2].to)} />
          <Tab tab={tabs[3]} active={isActive(tabs[3].to)} />
        </ul>
      </nav>

      <BottomSheet open={sheet} onClose={() => setSheet(false)}>
        <div className="space-y-4 pb-2">
          {/* SECTION 1 — Meal */}
          <div>
            <div
              className="px-1 text-[13px] font-bold uppercase tracking-wide"
              style={{ color: "#9CA3AF" }}
            >
              {t("sheet.mealLabel")}
            </div>
            <div className="mt-3 flex items-center gap-2">
              {MEALS.map((m) => {
                const meta = MEAL_META[m];
                const active = meal === m;
                return (
                  <button
                    key={m}
                    onClick={() => pickMeal(m)}
                    className="flex-1 text-sm font-semibold transition active:scale-[0.97]"
                    style={{
                      height: 38,
                      padding: "0 12px",
                      borderRadius: 99,
                      background: active ? "#4CAF82" : "#FFFFFF",
                      color: active ? "#FFFFFF" : "#6B7280",
                      border: active ? "none" : "1px solid #E5E7EB",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ marginRight: 6 }}>{meta.emoji}</span>
                    {t(meta.shortKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: 1, background: "#F0F0EE", width: "100%" }} />

          {/* SECTION 2 — Input method */}
          <div>
            <div
              className="px-1 text-[13px] font-bold uppercase tracking-wide"
              style={{ color: "#9CA3AF" }}
            >
              {t("sheet.methodLabel")}
            </div>
            <div className="mt-3 space-y-3">
              <MethodCard
                icon={<Camera size={22} />}
                iconBg="rgba(76,175,130,0.15)"
                iconColor="#4CAF82"
                title={t("sheet.photoTitle")}
                sub={t("sheet.photoSub")}
                onClick={() => go("photo")}
                flashing={flash === "photo"}
              />
              <MethodCard
                icon={<Mic size={22} />}
                iconBg="rgba(59,130,246,0.15)"
                iconColor="#3B82F6"
                title={t("sheet.voiceTitle")}
                sub={t("sheet.voiceSub")}
                onClick={() => go("voice")}
                flashing={flash === "voice"}
              />
              <MethodCard
                icon={<Pencil size={20} />}
                iconBg="rgba(139,92,246,0.15)"
                iconColor="#8B5CF6"
                title={t("sheet.manualTitle")}
                sub={t("sheet.manualSub")}
                onClick={() => go("manual")}
                flashing={flash === "manual"}
              />
            </div>
          </div>
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
        className={`relative flex h-full flex-col items-center justify-center gap-0.5 transition-colors ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Icon size={22} strokeWidth={active ? 2.4 : 2} />
        <span className="text-[10px] font-medium">{tab.label}</span>
        {active && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              bottom: 4,
              width: 4,
              height: 4,
              borderRadius: 2,
              background: "#4CAF82",
            }}
          />
        )}
      </Link>
    </li>
  );
}

function MethodCard({
  icon,
  iconBg,
  iconColor,
  title,
  sub,
  onClick,
  flashing,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  onClick: () => void;
  flashing?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center text-left transition active:scale-[0.98]"
      style={{
        height: 72,
        gap: 14,
        padding: "0 14px",
        borderRadius: 14,
        background: flashing ? "rgba(76,175,130,0.18)" : "#FFFFFF",
        border: "1px solid #F0F0EE",
      }}
    >
      <span
        className="grid place-items-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          background: iconBg,
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-bold">{title}</span>
        <span className="block text-xs text-muted-foreground truncate">{sub}</span>
      </span>
    </button>
  );
}
