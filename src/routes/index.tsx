import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Calendar, ChefHat, ShoppingBasket, Settings, Crown, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storage, frenchDate, programColor } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { MiniRecipeCard } from "@/components/RecipeCard";
import { Avatar } from "@/components/Avatar";
import {
  notifPermission,
  requestNotifPermission,
  shouldShowPermissionPrompt,
  deferPrompt,
  scheduleMealReminder,
  scheduleWeeklyReminder,
} from "@/lib/notifications";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useLocalReactive(() => storage.getUser());
  const history = useLocalReactive(() => storage.getHistory());
  const favorites = useLocalReactive(() => storage.getFavorites());
  const recipes = useLocalReactive(() => storage.getRecipes());
  const premium = useLocalReactive(() => storage.isPremium());
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    if (!user) {
      nav({ to: "/onboarding" });
    } else if (shouldShowPermissionPrompt()) {
      setShowNotifPrompt(true);
    }
  }, [user, nav]);

  if (!user) return null;

  const todayKey = new Date().toDateString();
  const todayMeals = history.filter(
    (h) => new Date(h.date).toDateString() === todayKey,
  );
  const todayKcal = todayMeals.reduce((s, m) => s + m.recette.calories, 0);
  const todayP = todayMeals.reduce((s, m) => s + m.recette.proteines, 0);
  const pct = Math.min(100, Math.round((todayKcal / user.dailyKcal) * 100));
  const pc = programColor(user.program);

  return (
    <div className="px-5 pt-8">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} color={user.avatarColor} size={42} />
            <div>
              <h1 className="inline-flex items-center gap-2 text-2xl font-bold">
                {t("home.greeting", { name: user.name })}
                {premium && <Crown size={18} className="text-amber-500" />}
              </h1>
              <p className="text-xs capitalize text-muted-foreground">
                {frenchDate()}
              </p>
            </div>
          </div>
          <Link
            to="/parametres"
            className="grid h-9 w-9 place-items-center rounded-full bg-card text-muted-foreground shadow-sm"
            aria-label={t("nav.settings")}
          >
            <Settings size={18} />
          </Link>
        </div>
        <span
          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${pc.bg} ${pc.text}`}
        >
          {t("home.program", { program: user.program })}
        </span>
      </header>

      {/* Notif prompt (custom, before browser native) */}
      {showNotifPrompt && (
        <section className="fc-card mb-5 animate-fade-up border border-primary/30 p-4">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 text-primary" size={20} />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">{t("notif.request_title")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("notif.request_text")}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={async () => {
                    setShowNotifPrompt(false);
                    const p = await requestNotifPermission();
                    if (p === "granted") {
                      scheduleMealReminder();
                      scheduleWeeklyReminder();
                    }
                  }}
                  className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  {t("notif.enable")}
                </button>
                <button
                  onClick={() => {
                    deferPrompt();
                    setShowNotifPrompt(false);
                  }}
                  className="rounded-full px-4 py-1.5 text-xs font-semibold text-muted-foreground"
                >
                  {t("notif.later")}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/frigo"
          className="fc-card flex flex-col items-start gap-3 p-4 transition active:scale-[0.97]"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Camera size={20} />
          </div>
          <div>
            <div className="font-semibold leading-tight">{t("home.scan")}</div>
            <div className="text-xs text-muted-foreground">{t("home.scan_sub")}</div>
          </div>
        </Link>
        <Link
          to="/planning"
          className="fc-card flex flex-col items-start gap-3 p-4 transition active:scale-[0.97]"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <Calendar size={20} />
          </div>
          <div>
            <div className="font-semibold leading-tight">{t("home.planning")}</div>
            <div className="text-xs text-muted-foreground">{t("home.planning_sub")}</div>
          </div>
        </Link>
      </div>

      {history.length > 0 && (
        <section className="fc-card mt-5 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">{t("home.today")}</h2>
            <span className="text-xs text-muted-foreground">
              {t("home.goal", { kcal: user.dailyKcal })}
            </span>
          </div>
          <p className="mt-2 text-sm">
            <span className="text-xl font-bold text-primary">{todayKcal}</span>{" "}
            <span className="text-muted-foreground">
              {t("home.kcal_proteins", { kcal: "", p: Math.round(todayP) }).replace(/^\s*kcal\s*·\s*/, "kcal · ")}
            </span>
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">{t("home.favorites")}</h2>
        {favorites.length === 0 ? (
          <div className="fc-card p-4 text-sm text-muted-foreground">
            {t("home.no_favorites")}
          </div>
        ) : (
          <div className="scrollbar-hide -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
            {favorites.map((r) => (
              <MiniRecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </section>

      {recipes.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
              <ChefHat size={16} /> {t("home.latest")}
            </h2>
            <Link to="/recettes" className="text-xs font-medium text-primary">
              {t("home.see_all")}
            </Link>
          </div>
          <div className="scrollbar-hide -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
            {recipes.slice(0, 5).map((r) => (
              <MiniRecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-6">
        <Link
          to="/courses"
          className="fc-card flex items-center gap-3 p-4 transition active:scale-[0.97]"
        >
          <ShoppingBasket size={20} className="text-primary" />
          <span className="text-sm font-medium">{t("home.shopping_list")}</span>
        </Link>
      </div>
    </div>
  );
}
