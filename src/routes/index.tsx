import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Crown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storage, frenchDate, programColor, programEmoji } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { useUsage, usePremium, LIMITS } from "@/lib/freemium";
import { MiniRecipeCard } from "@/components/RecipeCard";
import { RecipeImage } from "@/components/RecipeImage";
import { PaywallModal } from "@/components/PaywallModal";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [splash, setSplash] = useState(true);
  const sess = useLocalReactive(() => storage.getSessionUser());
  const user = useLocalReactive(() => storage.getUser());
  const history = useLocalReactive(() => storage.getHistory());
  const favorites = useLocalReactive(() => storage.getFavorites());
  const allRecipes = useLocalReactive(() => storage.getAllRecipes());
  const usage = useUsage();
  const premium = usePremium();
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    setMounted(true);
    const splashTimer = setTimeout(() => setSplash(false), 600);
    return () => clearTimeout(splashTimer);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    // Auto-restore single saved account when no active session
    if (!sess && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("fridgechef_accounts");
        const accs = raw ? (JSON.parse(raw) as Array<{ id: string; prenom: string; email: string; program: string | null; dailyKcal: number | null; isPremium: boolean }>) : [];
        if (accs.length === 1) {
          const a = accs[0];
          localStorage.setItem(
            "fridgechef_session_user",
            JSON.stringify({
              id: a.id,
              prenom: a.prenom,
              email: a.email,
              program: a.program,
              dailyKcal: a.dailyKcal,
              isPremium: a.isPremium,
            }),
          );
          window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: "fridgechef_session_user" }));
          return;
        }
      } catch {}
      nav({ to: "/onboarding" });
    } else if (sess && !sess.program) {
      nav({ to: "/onboarding" });
    }
  }, [mounted, sess, nav]);

  const todayMeal = useMemo(() => {
    const k = new Date().toDateString();
    return history.find((h) => new Date(h.date).toDateString() === k) ?? null;
  }, [history]);

  if (!mounted || splash || !sess || !user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center animate-fade-up"
        style={{ background: "#FFFFFF" }}
      >
        <div className="text-center">
          <div className="text-5xl">🥦</div>
          <h1 className="mt-3 text-xl font-bold">FridgeChef</h1>
        </div>
      </div>
    );
  }


  const pc = programColor(user.program);
  const remaining = Math.max(0, LIMITS.recipes - usage.recipesGenerated);

  const todayHist = history.filter(
    (h) => new Date(h.date).toDateString() === new Date().toDateString(),
  );
  const weekHist = history.filter((h) => {
    const d = new Date(h.date);
    const now = new Date();
    return now.getTime() - d.getTime() < 7 * 24 * 3600 * 1000;
  });
  const weekKcal = weekHist.reduce((s, m) => s + m.recette.calories, 0);
  const weekAvg = weekHist.length > 0 ? Math.round(weekKcal / Math.max(1, Math.min(7, weekHist.length))) : 0;

  return (
    <div className="px-5 pt-8">
      <header className="mb-5 flex items-center gap-3">
        <Avatar name={sess.prenom} id={sess.id} color={sess.avatarColor} size={48} />
        <div className="flex-1 min-w-0">
          <h1 className="inline-flex items-center gap-2 text-xl font-bold leading-tight">
            {t("home.greeting", { name: sess.prenom })}
            {premium && (
              <span
                className="inline-grid h-5 w-5 place-items-center rounded-full text-white"
                style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
                aria-label="Pro"
              >
                <Crown size={11} />
              </span>
            )}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pc.bg} ${pc.text}`}>
              {programEmoji(user.program)} {user.program}
            </span>
            <span className="text-[11px] capitalize text-muted-foreground">{frenchDate()}</span>
          </div>
        </div>
      </header>

      {!premium && (
        <button
          onClick={() => remaining === 0 && setPaywall(true)}
          className="mb-3 block w-full text-center text-[11px] text-muted-foreground"
        >
          {t("home.usageLeft", { count: remaining })}
        </button>
      )}

      {/* AUJOURD'HUI */}
      <section className="mb-5">
        {todayMeal ? (
          <div
            className="flex items-center gap-3 rounded-2xl p-4"
            style={{ background: "rgba(76,175,130,0.10)", border: "1px solid rgba(76,175,130,0.25)" }}
          >
            <div className="text-2xl">🍽</div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold">{todayMeal.recette.titre}</p>
              <p className="text-[11px] text-muted-foreground">
                {todayMeal.recette.calories} kcal · {Math.round(todayMeal.recette.proteines)}g P
              </p>
            </div>
            <Link to="/historique" className="text-xs font-semibold text-primary">
              {t("home.see")} →
            </Link>
          </div>
        ) : (
          <div
            className="rounded-2xl p-4 text-center"
            style={{ border: "1.5px dashed #D4D4D8", background: "#FAFAF8" }}
          >
            <p className="text-sm text-muted-foreground">{t("home.noMealToday")}</p>
            <Link
              to="/frigo"
              search={{ mode: "photo" as const }}
              className="mt-2 inline-block rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary"
            >
              {t("home.scan")} →
            </Link>
          </div>
        )}
      </section>

      {/* FAVORIS */}
      <SectionHeader title={`❤️ ${t("home.favorites")}`} to="/recettes" t={t} />
      {favorites.length === 0 ? (
        <p className="-mt-1 mb-5 text-xs text-muted-foreground">{t("home.noFavoritesShort")}</p>
      ) : (
        <HorizontalRow>
          {favorites.map((r) => (
            <MiniRecipeCard key={r.id} recipe={r} width={160} imageHeight={120} />
          ))}
        </HorizontalRow>
      )}

      {/* RECENT */}
      {allRecipes.length > 0 && (
        <>
          <SectionHeader title={`🕘 ${t("home.recent")}`} to="/recettes" t={t} />
          <HorizontalRow>
            {allRecipes.slice(0, 5).map((r) => (
              <MiniRecipeCard key={r.id} recipe={r} width={160} imageHeight={120} />
            ))}
          </HorizontalRow>
        </>
      )}

      {/* STATS */}
      <StatsSection />

      {/* COMMUNAUTE row */}
      <SectionHeader title={`👥 ${t("home.community")}`} to="/communaute" t={t} />
      <HorizontalRow>
        <CommunityPreviewCards />
      </HorizontalRow>

      {/* SUIVI rapide */}
      {history.length >= 3 && (
        <Link
          to="/stats"
          className="fc-card mt-2 flex items-center gap-3 p-4 transition active:scale-[0.98]"
        >
          <div className="text-2xl">📊</div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {t("home.weekStat", { meals: weekHist.length, kcal: weekAvg })}
            </p>
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => {
                const day = new Date();
                day.setDate(day.getDate() - (6 - i));
                const has = history.some(
                  (h) => new Date(h.date).toDateString() === day.toDateString(),
                );
                return (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full"
                    style={{ background: has ? "#4CAF82" : "#E5E5E5" }}
                  />
                );
              })}
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
      )}

      {todayHist.length === 0 && history.length === 0 && (
        <div className="h-2" />
      )}

      <PaywallModal open={paywall} onClose={() => setPaywall(false)} reason={t("paywall.limitRecipes")} />
    </div>
  );
}

function SectionHeader({
  title,
  to,
  t,
}: {
  title: string;
  to: string;
  t: (k: string) => string;
}) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between">
      <h2 className="text-base font-bold">{title}</h2>
      <Link to={to as never} className="text-[13px] font-semibold text-primary">
        {t("home.seeAll")} →
      </Link>
    </div>
  );
}

function HorizontalRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="scrollbar-hide -mx-5 mb-1 flex gap-3 overflow-x-auto px-5 pb-2"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {children}
    </div>
  );
}

function CommunityPreviewCards() {
  const allRecipes = useLocalReactive(() => storage.getAllRecipes());
  // Lightweight static preview using recent generated titles, or generic placeholders
  const items = allRecipes.slice(0, 3);
  if (items.length === 0) {
    const placeholders = [
      { titre: "Bowl healthy poulet", auteur: "Marie", program: "Maintien" },
      { titre: "Pâtes saumon épinards", auteur: "Lucas", program: "Prise de masse" },
      { titre: "Salade quinoa avocat", auteur: "Sofia", program: "Perte de poids" },
    ];
    return (
      <>
        {placeholders.map((p, i) => (
          <Link
            key={i}
            to="/communaute"
            className="fc-card block w-[200px] shrink-0 overflow-hidden"
            style={{ padding: 0 }}
          >
            <RecipeImage titre={p.titre} program={p.program} height={130} />
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-semibold leading-tight">{p.titre}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {p.auteur} · ❤️ {Math.floor(Math.random() * 80) + 20}
              </p>
            </div>
          </Link>
        ))}
      </>
    );
  }
  return (
    <>
      {items.map((r) => (
        <Link
          key={r.id}
          to="/communaute"
          className="fc-card block w-[200px] shrink-0 overflow-hidden"
          style={{ padding: 0 }}
        >
          <RecipeImage titre={r.titre} program={r.program} height={130} />
          <div className="p-3">
            <p className="line-clamp-2 text-sm font-semibold leading-tight">{r.titre}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">FridgeChef · ❤️ 42</p>
          </div>
        </Link>
      ))}
    </>
  );
}
