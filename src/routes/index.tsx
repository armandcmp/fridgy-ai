import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Camera, Calendar, ChefHat, ShoppingBasket } from "lucide-react";
import { storage, frenchDate, programColor } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { MiniRecipeCard } from "@/components/RecipeCard";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const nav = useNavigate();
  const user = useLocalReactive(() => storage.getUser());
  const history = useLocalReactive(() => storage.getHistory());
  const favorites = useLocalReactive(() => storage.getFavorites());
  const recipes = useLocalReactive(() => storage.getRecipes());

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

  return (
    <div className="px-5 pt-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Bonjour {user.name} 👋</h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {frenchDate()}
        </p>
        <span
          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${pc.bg} ${pc.text}`}
        >
          Programme : {user.program}
        </span>
      </header>

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
            <div className="font-semibold leading-tight">Scanner mon frigo</div>
            <div className="text-xs text-muted-foreground">Trouver des recettes</div>
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
            <div className="font-semibold leading-tight">Voir mon planning</div>
            <div className="text-xs text-muted-foreground">La semaine en un coup d'œil</div>
          </div>
        </Link>
      </div>

      {/* Today's stats */}
      {history.length > 0 && (
        <section className="fc-card mt-5 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Aujourd'hui</h2>
            <span className="text-xs text-muted-foreground">
              Objectif {user.dailyKcal} kcal
            </span>
          </div>
          <p className="mt-2 text-sm">
            <span className="text-xl font-bold text-primary">{todayKcal}</span>{" "}
            <span className="text-muted-foreground">kcal · {Math.round(todayP)}g protéines</span>
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>
      )}

      {/* Favorites */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">❤️ Mes recettes favorites</h2>
        {favorites.length === 0 ? (
          <div className="fc-card p-4 text-sm text-muted-foreground">
            Aucun favori pour l'instant. Ajoutez des recettes en tapant le ♡
          </div>
        ) : (
          <div className="scrollbar-hide -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
            {favorites.map((r) => (
              <MiniRecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </section>

      {/* Last generated recipes */}
      {recipes.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold inline-flex items-center gap-2">
              <ChefHat size={16} /> Dernières recettes
            </h2>
            <Link to="/recettes" className="text-xs font-medium text-primary">
              Tout voir
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
          <span className="text-sm font-medium">Liste de courses</span>
        </Link>
      </div>
    </div>
  );
}
