import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Home,
  ChefHat,
  Calendar,
  Settings,
  Plus,
} from "lucide-react";

import { useTranslation } from "react-i18next";
import { BottomSheet } from "./BottomSheet";
import { MEAL_META, setCurrentMeal, type MealType } from "@/lib/meal";

function guessMealFromTime(): MealType {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "petit-dejeuner";
  if (h >= 11 && h < 17) return "dejeuner";
  return "diner";
}

type Step = "meal" | "method" | null;

export function BottomNav() {
  const { t } = useTranslation();
  const loc = useLocation();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>(null);
  const [suggested, setSuggested] = useState<MealType>(() => guessMealFromTime());

  useEffect(() => {
    if (step === "meal") setSuggested(guessMealFromTime());
  }, [step]);

  const tabs: { to: string; icon: typeof Home; label: string }[] = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/recettes", icon: ChefHat, label: t("nav.recipes") },
    { to: "/planning", icon: Calendar, label: t("nav.planning") },
    { to: "/parametres", icon: Settings, label: t("nav.settings") },
  ];

  const pickMeal = (m: MealType) => {
    setCurrentMeal(m);
    setStep(null);
    setTimeout(() => {
      nav({ to: "/frigo" });
    }, 50);
  };

  const closeSheets = () => setStep(null);

  const path = loc.pathname;


  const isActive = (to: string) =>
    to === "/" ? path === "/" : path.startsWith(to);

  const MEALS: { m: MealType; color: string; subKey: string }[] = [
    { m: "petit-dejeuner", color: "#F59E0B", subKey: "meal.breakfastSub" },
    { m: "dejeuner", color: "#4CAF82", subKey: "meal.lunchSub" },
    { m: "diner", color: "#3B82F6", subKey: "meal.dinnerSub" },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-card"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          overflow: "visible",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.04)",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      >
        <ul className="relative mx-auto flex h-16 max-w-md items-stretch justify-between px-2">
          <Tab tab={tabs[0]} active={isActive(tabs[0].to)} />
          <Tab tab={tabs[1]} active={isActive(tabs[1].to)} />

          <li className="flex-1">
            <div className="relative h-full">
              <button
                onClick={() => setStep("meal")}
                aria-label={t("nav.add")}
                className="absolute left-1/2 grid place-items-center text-white transition active:scale-95"
                style={{
                  top: -18,
                  transform: "translateX(-50%)",
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  background: "var(--primary)",
                  boxShadow: "0 6px 16px rgba(45,139,87,0.45)",
                }}
              >
                <Plus size={26} strokeWidth={2.8} />
              </button>
            </div>
          </li>


          <Tab tab={tabs[2]} active={isActive(tabs[2].to)} />
          <Tab tab={tabs[3]} active={isActive(tabs[3].to)} />
        </ul>
      </nav>


      {/* STEP 1 — Quel repas ? */}
      <BottomSheet open={step === "meal"} onClose={closeSheets}>
        <div className="pb-2">
          <h3 className="mb-4 text-center text-[18px] font-bold">
            {t("sheet.mealLabel")}
          </h3>
          <div className="space-y-3">
            {MEALS.map(({ m, color, subKey }) => {
              const meta = MEAL_META[m];
              void meta;
              const isSuggested = suggested === m;
              return (
                <button
                  key={m}
                  onClick={() => pickMeal(m)}
                  className="flex w-full items-center text-left transition active:scale-[0.98]"
                  style={{
                    height: 72,
                    gap: 14,
                    padding: "0 14px",
                    borderRadius: 14,
                    background: isSuggested ? "rgba(76,175,130,0.08)" : "#FFFFFF",
                    border: "1px solid #F0F0EE",
                    borderLeft: `4px solid ${color}`,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 44,
                      borderRadius: 5,
                      background: color,
                      flexShrink: 0,
                    }}
                  />

                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-bold">
                      {t(meta.labelKey)}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {t(subKey)}
                    </span>
                  </span>
                </button>
              );
            })}
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
        className="relative flex h-full flex-col items-center justify-center gap-1 transition-colors"
      >
        <span
          className="grid place-items-center transition-all"
          style={{
            padding: active ? "6px 14px" : "6px",
            borderRadius: 12,
            background: active ? "var(--primary-light)" : "transparent",
            color: active ? "var(--primary)" : "var(--muted-foreground)",
          }}
        >
          <Icon size={20} strokeWidth={active ? 2.4 : 2} />
        </span>
        <span
          className="text-[10px]"
          style={{
            color: active ? "var(--primary)" : "var(--muted-foreground)",
            fontFamily: active
              ? "Fredoka, system-ui, sans-serif"
              : "Inter, system-ui, sans-serif",
            fontWeight: active ? 600 : 500,
          }}
        >
          {tab.label}
        </span>
      </Link>
    </li>
  );
}


