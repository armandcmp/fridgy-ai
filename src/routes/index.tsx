import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, ChevronRight, Clock, Flame, Heart, Plus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storage } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { useUsage, usePremium, LIMITS } from "@/lib/freemium";
import { RecipeImage } from "@/components/RecipeImage";
import { PaywallModal } from "@/components/PaywallModal";
import { Avatar } from "@/components/Avatar";
import heroFood from "@/assets/hero-food.jpg.asset.json";

import { StatsSection } from "@/components/StatsSection";
import type { Recipe } from "@/lib/types";

import { getTrialInfo } from "@/lib/trial";

function UpgradeCard({ onOpen }: { onOpen: () => void }) {
  const trial = getTrialInfo();
  const inTrial = trial.active;
  return (
    <button
      onClick={onOpen}
      className="mt-4 block w-full overflow-hidden rounded-[22px] p-[1.5px] text-left transition active:scale-[0.99]"
      style={{
        background: "linear-gradient(135deg,#FCD34D 0%,#F59E0B 55%,#B45309 100%)",
        boxShadow: "0 12px 30px -14px rgba(180,83,9,0.45)",
      }}
    >
      <div
        className="rounded-[20px] px-4 py-4"
        style={{ background: "linear-gradient(135deg,#FFFFFF 0%,#FFF6E2 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-white"
            style={{ background: "linear-gradient(135deg,#F59E0B,#B45309)" }}
          >
            <Crown size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-tight" style={{ color: "#0F1B17" }}>
              Fridgy Pro
            </p>
            <p className="text-[11.5px] font-medium" style={{ color: "#7C5A2A" }}>
              {inTrial
                ? `Essai gratuit · ${trial.daysLeft} j restant${trial.daysLeft > 1 ? "s" : ""}`
                : "Recettes illimitées & plus encore"}
            </p>
          </div>
          {inTrial && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#F59E0B,#B45309)" }}
            >
              <Sparkles size={10} /> Essai gratuit
            </span>
          )}
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[12.5px]" style={{ color: "#334155" }}>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#B45309" }} />
            Recettes illimitées chaque jour
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#B45309" }} />
            Planning, historique & liste de courses
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#B45309" }} />
            Génération prioritaire & sans pub
          </li>
        </ul>
        <div
          className="mt-3 grid place-items-center rounded-full py-2.5 text-[13px] font-extrabold text-white"
          style={{ background: "linear-gradient(135deg,#F59E0B,#B45309)" }}
        >
          {inTrial ? "Voir les formules" : "Découvrir l'abonnement"} →
        </div>
      </div>
    </button>
  );
}

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { t, ready } = useTranslation();
  const nav = useNavigate();
  const [mounted, setMounted] = useState(false);
  const sess = useLocalReactive(() => storage.getSessionUser());
  const user = useLocalReactive(() => storage.getUser());
  const favorites = useLocalReactive(() => storage.getFavorites());
  const allRecipes = useLocalReactive(() => storage.getAllRecipes());
  const usage = useUsage();
  const premium = usePremium();
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  if (!mounted || !ready || !sess || !user) {
    return <div style={{ minHeight: "100vh", background: "#FFFFFF" }} />;
  }

  void user;
  const remaining = Math.max(0, LIMITS.recipes - usage.recipesGenerated);
  const recommended = allRecipes.slice(0, 6);

  return (
    <div style={{ background: "#FFFFFF" }} className="min-h-screen pb-28">
      <div className="px-5 pt-6">
        {/* TOP BAR */}
        <header className="mb-6 flex items-center justify-between animate-fade-up">
          <Link to="/parametres" className="flex items-center gap-3 min-w-0">
            <Avatar name={sess.prenom} id={sess.id} color={sess.avatarColor} photo={sess.avatarPhoto || undefined} size={42} />
            <div className="min-w-0 flex items-center">
              <p className="truncate text-[15px] font-bold tracking-tight" style={{ color: "#0F1B17" }}>
                {sess.prenom}
              </p>
            </div>

          </Link>
          <div className="flex items-center gap-2">
            {premium && (
              <span
                className="inline-grid h-7 w-7 place-items-center rounded-full text-white"
                style={{ background: "var(--primary)" }}
                aria-label="Pro"
              >
                <Crown size={14} />
              </span>
            )}
          </div>
        </header>

        {/* HERO — title only, refined image */}
        <section className="animate-fade-up mb-8">
          <div
            className="relative overflow-hidden mb-5"
            style={{
              borderRadius: 24,
              aspectRatio: "16 / 10",
              background: "linear-gradient(180deg,#F4F6F5 0%,#E6FAF4 100%)",
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
            />
          </div>

          <h1 className="display-title text-[28px]">
            {t("home.heroTitle")}
          </h1>
          {!premium && (
            <button
              onClick={() => remaining === 0 && setPaywall(true)}
              className="mt-2 block text-[12px] font-medium"
              style={{ color: "#7A8A85" }}
            >
              {t("home.usageLeft", { count: remaining })}
            </button>
          )}

          {!premium && <UpgradeCard onOpen={() => setPaywall(true)} />}
        </section>



        {/* Today meal pill intentionally removed */}

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
              <BigRecipeCard key={r.id} recipe={r} index={i} />
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
}: {
  recipe: Recipe;
  index: number;
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
          className="grid h-12 w-12 place-items-center rounded-2xl"
          style={{ background: "linear-gradient(135deg,#ECFDF5,#D1FAE5)" }}
          aria-hidden
        >
          <span style={{ width: 18, height: 18, borderRadius: 9, background: "var(--primary)", display: "block" }} />
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
