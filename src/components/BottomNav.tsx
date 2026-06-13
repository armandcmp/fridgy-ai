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
  Keyboard,
  ArrowLeft,
  Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "./BottomSheet";
import { MEAL_META, setCurrentMeal, type MealType } from "@/lib/meal";

export function BottomNav() {
  const { t } = useTranslation();
  const loc = useLocation();
  const nav = useNavigate();
  const [sheet, setSheet] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);

  useEffect(() => {
    if (!sheet) {
      const id = setTimeout(() => {
        setStep(1);
        setSelectedMeal(null);
      }, 250);
      return () => clearTimeout(id);
    }
  }, [sheet]);

  const tabs: { to: string; icon: typeof Home; label: string }[] = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/recettes", icon: ChefHat, label: t("nav.recipes") },
    { to: "/planning", icon: Calendar, label: t("nav.planning") },
    { to: "/parametres", icon: Settings, label: t("nav.settings") },
  ];

  const pickMeal = (m: MealType) => {
    setSelectedMeal(m);
    setCurrentMeal(m);
    setTimeout(() => setStep(2), 300);
  };

  const go = (mode: "photo" | "voice" | "manual") => {
    setSheet(false);
    nav({ to: "/frigo", search: { mode } });
  };

  const path = loc.pathname;
  const isActive = (to: string) =>
    to === "/" ? path === "/" : path.startsWith(to);

  const MEALS: { id: MealType; subKey: string }[] = [
    { id: "petit-dejeuner", subKey: "meal.breakfastSub" },
    { id: "dejeuner", subKey: "meal.lunchSub" },
    { id: "diner", subKey: "meal.dinnerSub" },
  ];

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
                onClick={() => {
                  setStep(1);
                  setSelectedMeal(null);
                  setSheet(true);
                }}
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
        {step === 1 ? (
          <div className="space-y-3 pb-2">
            <div className="px-1">
              <h3 className="text-base font-semibold">{t("sheet.mealTitle")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("sheet.mealSub")}</p>
            </div>
            <div className="space-y-3 pt-1">
              {MEALS.map((m) => {
                const meta = MEAL_META[m.id];
                const active = selectedMeal === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => pickMeal(m.id)}
                    className="flex w-full items-center gap-3 bg-card px-4 text-left transition active:scale-[0.98]"
                    style={{
                      minHeight: 80,
                      borderRadius: 14,
                      border: active
                        ? `2px solid ${meta.color}`
                        : "1px solid var(--border)",
                      borderLeft: `4px solid ${meta.color}`,
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{meta.emoji}</span>
                    <span className="flex-1">
                      <span className="block text-[16px] font-bold">
                        {t(meta.labelKey)}
                      </span>
                      <span className="block text-[13px] text-muted-foreground">
                        {t(m.subKey)}
                      </span>
                    </span>
                    {active && (
                      <span
                        className="grid place-items-center text-white"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          background: meta.color,
                        }}
                      >
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            <div className="flex items-center gap-2 px-1">
              <button
                onClick={() => {
                  setSelectedMeal(null);
                  setStep(1);
                }}
                aria-label={t("common.back")}
                className="grid place-items-center rounded-full text-foreground transition active:scale-95"
                style={{ width: 32, height: 32, background: "rgba(0,0,0,0.05)" }}
              >
                <ArrowLeft size={16} />
              </button>
              <h3 className="text-base font-semibold">{t("sheet.addTitle")}</h3>
            </div>
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
        )}
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
        style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(76,175,130,0.15)" }}
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
