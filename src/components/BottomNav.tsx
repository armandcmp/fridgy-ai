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

  const MEALS: { m: MealType; from: string; to: string; accent: string; subKey: string; hour: string; img: string }[] = [
    { m: "petit-dejeuner", from: "#FFF6E5", to: "#FFEAC2", accent: "#F59E0B", subKey: "meal.breakfastSub", hour: "7 – 10h",
      img: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=400&q=80" },
    { m: "dejeuner",       from: "#E9FBF3", to: "#CFF5E4", accent: "#2DD4A8", subKey: "meal.lunchSub",      hour: "12 – 14h",
      img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80" },
    { m: "diner",          from: "#EEF2FF", to: "#DDE6FF", accent: "#3B82F6", subKey: "meal.dinnerSub",     hour: "19 – 22h",
      img: "https://images.unsplash.com/photo-1432139509613-5c4255815697?auto=format&fit=crop&w=400&q=80" },
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
                  boxShadow: "0 8px 18px rgba(45,212,168,0.45)",
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
          <h3 className="mb-5 text-center text-[20px] font-extrabold tracking-tight" style={{ color: "#0F1B17" }}>
            {t("sheet.mealLabel")}
          </h3>
          <div className="space-y-3">
            {MEALS.map(({ m, from, to, accent, subKey, hour, img }) => {
              const meta = MEAL_META[m];
              const isSuggested = suggested === m;
              return (
                <button
                  key={m}
                  onClick={() => pickMeal(m)}
                  className="relative flex w-full items-center overflow-hidden text-left transition active:scale-[0.98]"
                  style={{
                    padding: "14px 16px",
                    gap: 14,
                    borderRadius: 22,
                    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
                    border: isSuggested ? `1.5px solid ${accent}` : "1.5px solid transparent",
                    boxShadow: isSuggested
                      ? `0 8px 20px ${accent}33`
                      : "0 2px 8px rgba(15,27,23,0.04)",
                  }}
                >
                  <span
                    className="relative overflow-hidden"
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 16,
                      flexShrink: 0,
                      boxShadow: `0 6px 14px ${accent}44`,
                    }}
                  >
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[16px] font-extrabold tracking-tight" style={{ color: "#0F1B17" }}>
                      {t(meta.labelKey)}
                    </span>
                    <span className="block text-[12px] truncate" style={{ color: "#5A6B62" }}>
                      {t(subKey)} · {hour}
                    </span>
                  </span>
                  {isSuggested && (
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: "#0F1B17", color: "#fff" }}
                    >
                      {t("meal.now")}
                    </span>
                  )}
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
              ? "Inter, system-ui, sans-serif"
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


