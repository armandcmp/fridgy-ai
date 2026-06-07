import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Calendar, ChefHat, ShoppingBasket, History, Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storage, frenchDate, programColor } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { useUsage, usePremium, LIMITS } from "@/lib/freemium";
import { MiniRecipeCard } from "@/components/RecipeCard";
import { PaywallModal } from "@/components/PaywallModal";

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
  const usage = useUsage();
  const premium = usePremium();
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    if (!user) nav({ to: "/onboarding" });
  }, [user, nav]);

  if (!user) return null;

  const todayKey = new Date().toDateString();
  const todayMeals = history.filter((h) => new Date(h.date).toDateString() === todayKey);
  const todayKcal = todayMeals.reduce((s, m) => s + m.recette.calories, 0);
  const todayP = todayMeals.reduce((s, m) => s + m.recette.proteines, 0);
  const pct = Math.min(100, Math.round((todayKcal / user.dailyKcal) * 100));
  const pc = programColor(user.program);
  const remaining = Math.max(0, LIMITS.recipes - usage.recipesGenerated);

  return (
    <div className="px-5 pt-8">
      <header className="mb-6">
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold">
          {t("home.greeting", { name: user.name })}
          {premium && (
            <span
              className="inline-grid h-6 w-6 place-items-center rounded-full text-white"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
              aria-label="Pro"
            >
              <Crown size={12} />
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">{frenchDate()}</p>
        <span
          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${pc.bg} ${pc.text}`}
        >
          {t("home.programLabel", { program: user.program })}
        </span>
      </header>

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
            <div className="text-xs text-muted-foreground">{t("home.scanSub")}</div>
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
            <div className="text-xs text-muted-foreground">{t("home.planningSub")}</div>
          </div>
        </Link>
      </div>

      {!premium && (
        <button
          onClick={() => remaining === 0 && setPaywall(true)}
          className="mt-2 block w-full text-center text-[11px] text-muted-foreground"
        >
          {t("home.usageLeft", { count: remaining })}
        </button>
      )}

      {history.length > 0 && (
        <section className="fc-card mt-5 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">{t("home.today")}</h2>
            <span className="text-xs text-muted-foreground">
              {t("home.todayGoal", { kcal: user.dailyKcal })}
            </span>
          </div>
          <p className="mt-2 text-sm">
            <span className="text-xl font-bold text-primary">{todayKcal}</span>{" "}
            <span className="text-muted-foreground">
              {t("home.kcalProteins", { p: Math.round(todayP) })}
            </span>
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">{t("home.favorites")}</h2>
        {favorites.length === 0 ? (
          <div className="fc-card p-4 text-sm text-muted-foreground">{t("home.noFavorites")}</div>
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
              <ChefHat size={16} /> {t("home.lastRecipes")}
            </h2>
            <Link to="/recettes" className="text-xs font-medium text-primary">
              {t("home.seeAll")}
            </Link>
          </div>
          <div className="scrollbar-hide -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
            {recipes.slice(0, 5).map((r) => (
              <MiniRecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to="/courses" className="fc-card flex items-center gap-3 p-4 transition active:scale-[0.97]">
          <ShoppingBasket size={20} className="text-primary" />
          <span className="text-sm font-medium">{t("home.shopping")}</span>
        </Link>
        <Link to="/historique" className="fc-card flex items-center gap-3 p-4 transition active:scale-[0.97]">
          <History size={20} className="text-primary" />
          <span className="text-sm font-medium">{t("home.history")}</span>
        </Link>
      </div>

      <PaywallModal open={paywall} onClose={() => setPaywall(false)} reason={t("paywall.limitRecipes")} />
    </div>
  );
}
