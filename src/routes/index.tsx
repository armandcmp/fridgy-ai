import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Calendar, ChefHat, ShoppingBasket, Crown } from "lucide-react";
import { storage, frenchDate, programColor } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { useGate, usePremium } from "@/lib/usage";
import { MiniRecipeCard } from "@/components/RecipeCard";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const user = useLocalReactive(() => storage.getUser());
  const history = useLocalReactive(() => storage.getHistory());
  const favorites = useLocalReactive(() => storage.getFavorites());
  const recipes = useLocalReactive(() => storage.getRecipes());
  const gate = useGate("recipes");
  const premium = usePremium();

  useEffect(() => {
    if (!user) nav({ to: "/onboarding" });
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
  const avatarBg = user.avatarColor ?? pc.hex;
  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <div className="px-5 pt-8">
      <header className="mb-6 flex items-start gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
          style={{ background: avatarBg }}
        >
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            {t("home.greeting", { name: user.name })}
            {premium && <Crown size={16} className="text-amber-500" />}
          </h1>
          <p className="mt-0.5 text-xs capitalize text-muted-foreground">{frenchDate()}</p>
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${pc.bg} ${pc.text}`}
          >
            {t("home.program", { program: user.program })}
          </span>
        </div>
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
            <div className="text-xs text-muted-foreground">{t("home.scan.sub")}</div>
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
            <div className="text-xs text-muted-foreground">{t("home.planning.sub")}</div>
          </div>
        </Link>
      </div>

      {!premium && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {t("home.usageRemaining", { count: gate.remaining })}
        </p>
      )}

      {history.length > 0 && (
        <section className="fc-card mt-5 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">{t("home.today")}</h2>
            <span className="text-xs text-muted-foreground">
              {t("home.objective", { kcal: user.dailyKcal })}
            </span>
          </div>
          <p className="mt-2 text-sm">
            <span className="text-xl font-bold text-primary">{todayKcal}</span>{" "}
            <span className="text-muted-foreground">
              {t("common.kcal")} · {Math.round(todayP)}g
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
          <div className="fc-card p-4 text-sm text-muted-foreground">
            {t("home.noFavorites")}
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
              <ChefHat size={16} /> {t("home.lastRecipes")}
            </h2>
            <Link to="/recettes" className="text-xs font-medium text-primary">
              {t("home.viewAll")}
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
          <span className="text-sm font-medium">{t("home.shoppingList")}</span>
        </Link>
      </div>
    </div>
  );
}
