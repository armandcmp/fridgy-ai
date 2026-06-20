import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Crown, ChevronRight, Camera, Sparkles, Clock, Flame, Heart, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storage, programColor, programEmoji } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { useUsage, usePremium, LIMITS } from "@/lib/freemium";
import { RecipeImage } from "@/components/RecipeImage";
import { PaywallModal } from "@/components/PaywallModal";
import { Avatar } from "@/components/Avatar";
import { StatsSection } from "@/components/StatsSection";
import type { Recipe } from "@/lib/types";

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
    if (!sess && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("fridgechef_accounts");
        const accs = raw
          ? (JSON.parse(raw) as Array<{
              id: string;
              prenom: string;
              email: string;
              program: string | null;
              dailyKcal: number | null;
              isPremium: boolean;
            }>)
          : [];
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
        style={{ background: "#F8FAF8" }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Fredoka, system-ui, sans-serif" }}>FridgeChef</h1>
        </div>

      </div>
    );
  }

  const pc = programColor(user.program);
  const remaining = Math.max(0, LIMITS.recipes - usage.recipesGenerated);
  const recommended = allRecipes.slice(0, 6);

  return (
    <div style={{ background: "#F8FAF8" }} className="min-h-screen pb-2">
      <div className="px-5 pt-8">
        {/* GREETING */}
        <header className="mb-5 flex items-center gap-3 animate-fade-up">
          <div className="relative">
            <Avatar name={sess.prenom} id={sess.id} color={sess.avatarColor} size={44} />
            <span
              className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-xs"
              style={{
                background: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              }}
              aria-hidden
            >
              👨‍🍳
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="inline-flex items-center gap-1.5 text-[20px] font-bold leading-tight" style={{ color: "#1F2937" }}>
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
            <p className="mt-0.5 text-[13px]" style={{ color: "#6B7280" }}>
              {t("home.subtitle")}
            </p>
          </div>
        </header>

        {/* HERO CARD */}
        <section
          className="hero-glow relative mb-5 overflow-hidden animate-fade-up"
          style={{
            background: "var(--gradient-hero)",
            borderRadius: 24,
            padding: "22px 20px 20px",
            boxShadow: "var(--shadow-hero)",
            color: "#fff",
          }}
        >
          <div className="relative">
            <h2 className="text-[22px] font-bold leading-tight">{t("home.heroTitle")}</h2>
            <p className="mt-1.5 text-[13.5px] leading-snug" style={{ color: "rgba(255,255,255,0.92)" }}>
              {t("home.heroSub")}
            </p>
            <button
              onClick={() => nav({ to: "/frigo", search: { mode: "photo" as const } })}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[15px] font-semibold transition active:scale-[0.97]"
              style={{
                color: "#10B981",
                boxShadow: "0 8px 20px -4px rgba(0,0,0,0.18)",
              }}
            >
              <Camera size={18} strokeWidth={2.4} />
              {t("home.heroCta")}
            </button>
            {!premium && (
              <button
                onClick={() => remaining === 0 && setPaywall(true)}
                className="mt-3 block w-full text-center text-[11px] font-medium"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                {t("home.usageLeft", { count: remaining })}
              </button>
            )}
          </div>
        </section>

        {/* AI SUGGESTION CARD */}
        <section
          className="mb-5 animate-fade-up"
          style={{
            background: "var(--gradient-ai)",
            borderRadius: 24,
            padding: 18,
            border: "1px solid rgba(16,185,129,0.18)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg,#10B981,#34D399)",
                boxShadow: "0 6px 16px -4px rgba(16,185,129,0.45)",
              }}
            >
              <Sparkles size={20} color="#fff" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold" style={{ color: "#1F2937" }}>
                  🤖 {t("home.aiTitle")}
                </h3>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                  style={{
                    background: "rgba(16,185,129,0.15)",
                    color: "#047857",
                  }}
                >
                  <Sparkles size={9} /> {t("home.aiBadge")}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] leading-snug" style={{ color: "#4B5563" }}>
                {t("home.aiBody")}
              </p>
              <span
                className="mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${pcGradient(pc)})`,
                  color: "#fff",
                }}
              >
                {programEmoji(user.program)} {user.program}
              </span>
            </div>
          </div>
        </section>

        {/* TODAY (compact pill if logged) */}
        {todayMeal && (
          <Link
            to="/historique"
            className="mb-5 flex items-center gap-3 animate-fade-up"
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: "12px 14px",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div
              className="grid h-10 w-10 place-items-center rounded-2xl text-lg"
              style={{ background: "rgba(34,197,94,0.12)" }}
              aria-hidden
            >
              🍽️
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13.5px] font-semibold" style={{ color: "#1F2937" }}>
                {todayMeal.recette.titre}
              </p>
              <p className="text-[11px]" style={{ color: "#6B7280" }}>
                {todayMeal.recette.calories} kcal · {Math.round(todayMeal.recette.proteines)}g {t("recipe.protein") || "P"}
              </p>
            </div>
            <ChevronRight size={16} style={{ color: "#9CA3AF" }} />
          </Link>
        )}

        {/* RECOMMENDED */}
        <SectionHeader
          title={t("home.recommended")}
          to="/recettes"
          seeAllLabel={t("home.seeAll")}
          accent
        />
        {recommended.length === 0 ? (
          <EmptyRecipes
            title={t("home.emptyRecipesTitle")}
            sub={t("home.emptyRecipesSub")}
            cta={t("home.heroCta")}
            onClick={() => nav({ to: "/frigo", search: { mode: "photo" as const } })}
          />
        ) : (
          <HorizontalRow>
            {recommended.map((r, i) => (
              <BigRecipeCard key={r.id} recipe={r} index={i} aiLabel={t("home.aiRecommended")} />
            ))}
          </HorizontalRow>
        )}

        {/* FAVORITES */}
        <SectionHeader
          title={t("home.favorites")}
          to="/recettes"
          seeAllLabel={t("home.seeAll")}
        />
        {favorites.length === 0 ? (
          <div
            className="mb-5 flex items-center gap-3 animate-fade-up"
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: "14px 16px",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div
              className="grid h-10 w-10 place-items-center rounded-2xl"
              style={{ background: "rgba(244,63,94,0.10)", color: "#F43F5E" }}
            >
              <Heart size={18} fill="currentColor" strokeWidth={0} />
            </div>
            <p className="flex-1 text-[12.5px]" style={{ color: "#6B7280" }}>
              {t("home.noFavoritesShort")}
            </p>
          </div>
        ) : (
          <HorizontalRow>
            {favorites.map((r) => (
              <FavoriteThumb key={r.id} recipe={r} />
            ))}
          </HorizontalRow>
        )}

        {/* STATS (compact, lower) */}
        <div className="mt-2">
          <StatsSection />
        </div>
      </div>

      <PaywallModal open={paywall} onClose={() => setPaywall(false)} reason={t("paywall.limitRecipes")} />
    </div>
  );
}

function pcGradient(pc: { bg: string; text: string }) {
  // map shadcn-ish classes to a soft gradient; fallback to brand greens
  if (pc.bg.includes("green")) return "#22C55E,#10B981";
  if (pc.bg.includes("blue")) return "#3B82F6,#2563EB";
  if (pc.bg.includes("amber") || pc.bg.includes("yellow")) return "#F59E0B,#D97706";
  if (pc.bg.includes("rose") || pc.bg.includes("red")) return "#F43F5E,#E11D48";
  return "#22C55E,#10B981";
}

function SectionHeader({
  title,
  to,
  seeAllLabel,
  accent = false,
}: {
  title: string;
  to: string;
  seeAllLabel: string;
  accent?: boolean;
}) {
  return (
    <div className="mb-3 mt-2 flex items-center justify-between">
      <h2
        className="text-[16px] font-bold tracking-tight"
        style={{ color: "#1F2937" }}
      >
        {accent && (
          <span
            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
            style={{ background: "#10B981" }}
          />
        )}
        {title}
      </h2>
      <Link
        to={to as never}
        className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold"
        style={{ color: "#10B981" }}
      >
        {seeAllLabel} <ChevronRight size={14} />
      </Link>
    </div>
  );
}

function HorizontalRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="scrollbar-hide -mx-5 mb-5 flex gap-3 overflow-x-auto px-5 pb-2"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {children}
    </div>
  );
}

function BigRecipeCard({
  recipe,
  index,
  aiLabel,
}: {
  recipe: Recipe;
  index: number;
  aiLabel: string;
}) {
  return (
    <Link
      to="/recette/$id"
      params={{ id: recipe.id }}
      className="relative block shrink-0 animate-fade-up overflow-hidden transition active:scale-[0.97]"
      style={{
        width: 220,
        background: "#fff",
        borderRadius: 24,
        boxShadow: "var(--shadow-soft)",
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div className="relative">
        <RecipeImage titre={recipe.titre} program={recipe.program} height={140} />
        <div className="absolute left-2.5 top-2.5">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-bold uppercase tracking-wide backdrop-blur-md"
            style={{
              background: "rgba(255,255,255,0.92)",
              color: "#047857",
            }}
          >
            <Sparkles size={9} strokeWidth={2.6} /> {aiLabel}
          </span>
        </div>
      </div>
      <div className="p-3.5">
        <h3
          className="line-clamp-2 text-[14px] font-bold leading-tight"
          style={{ color: "#1F2937" }}
        >
          {recipe.titre}
        </h3>
        <div className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: "#6B7280" }}>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> {recipe.temps}
          </span>
          <span className="inline-flex items-center gap-1">
            <Flame size={12} /> {recipe.difficulte}
          </span>
        </div>
      </div>
    </Link>
  );
}

function FavoriteThumb({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      to="/recette/$id"
      params={{ id: recipe.id }}
      className="relative block shrink-0 overflow-hidden transition active:scale-[0.97]"
      style={{
        width: 150,
        background: "#fff",
        borderRadius: 20,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="relative">
        <RecipeImage titre={recipe.titre} program={recipe.program} height={100} />
        <div
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full backdrop-blur-md"
          style={{ background: "rgba(255,255,255,0.92)", color: "#F43F5E" }}
          aria-hidden
        >
          <Heart size={13} fill="currentColor" strokeWidth={0} />
        </div>
      </div>
      <div className="p-2.5">
        <p
          className="line-clamp-2 text-[12.5px] font-semibold leading-tight"
          style={{ color: "#1F2937" }}
        >
          {recipe.titre}
        </p>
        <p className="mt-1 text-[10.5px]" style={{ color: "#6B7280" }}>
          {recipe.calories} kcal
        </p>
      </div>
    </Link>
  );
}

function EmptyRecipes({
  title,
  sub,
  cta,
  onClick,
}: {
  title: string;
  sub: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div
      className="mb-5 animate-fade-up"
      style={{
        background: "#fff",
        borderRadius: 24,
        padding: 20,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 place-items-center rounded-2xl text-2xl"
          style={{ background: "linear-gradient(135deg,#ECFDF5,#D1FAE5)" }}
          aria-hidden
        >
          🍳
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold" style={{ color: "#1F2937" }}>
            {title}
          </p>
          <p className="text-[12px]" style={{ color: "#6B7280" }}>
            {sub}
          </p>
        </div>
      </div>
      <button
        onClick={onClick}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold text-white transition active:scale-[0.97]"
        style={{
          background: "var(--gradient-hero)",
          boxShadow: "var(--shadow-hero)",
        }}
      >
        <Plus size={16} strokeWidth={2.6} /> {cta}
      </button>
    </div>
  );
}
