import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShoppingBasket, MessageCircle, ExternalLink, Crown } from "lucide-react";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { generateShoppingList } from "@/lib/ai.functions";
import type { Recipe } from "@/lib/types";
import { useLocalReactive } from "@/lib/hooks";
import { checkGate, bumpUsage, isPremium } from "@/lib/usage";
import { Paywall } from "@/components/Paywall";
import { formatShoppingForWhatsApp, formatShoppingPlain, openWhatsApp } from "@/lib/whatsapp";
import { getLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/courses")({
  component: Courses,
});

type Cat = { nom: string; items: string[] };

const RETAILERS = [
  { key: "leclerc", name: "E.Leclerc Drive", emoji: "🟢", url: "https://www.leclercdrive.fr", color: "#00684A" },
  { key: "carrefour", name: "Carrefour Drive", emoji: "🔵", url: "https://www.carrefour.fr/drive", color: "#0066CC" },
  { key: "amazon", name: "Amazon Fresh", emoji: "🟠", url: "https://www.amazon.fr/fresh", color: "#FF9900" },
];

function Courses() {
  const { t } = useTranslation();
  const user = useLocalReactive(() => storage.getUser());
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const gen = useServerFn(generateShoppingList);

  const run = async () => {
    const g = checkGate("shopping");
    if (!g.allowed) { setPaywall(true); return; }
    const planning = storage.getPlanning();
    const recipes: Recipe[] = planning
      ? (planning.days.map((d) => d.recette).filter(Boolean) as Recipe[])
      : storage.getRecipes();
    if (recipes.length === 0) { setCats([]); return; }
    setLoading(true);
    try {
      const res = await gen({
        data: {
          recipes: recipes.map((r) => ({ titre: r.titre, ingredients: r.ingredients })),
          lang: getLanguage(),
        },
      });
      setCats(res.categories);
      bumpUsage("shopping");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setLoading(false); }
  };

  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  const toggle = (k: string) =>
    setChecked((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const openRetailer = async (name: string, url: string) => {
    if (!cats) return;
    const plain = formatShoppingPlain(cats);
    try {
      await navigator.clipboard.writeText(plain);
      toast.success(t("shopping.copied", { retailer: name }));
    } catch { /* ignore */ }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareWA = () => {
    if (!cats || !user) return;
    openWhatsApp(formatShoppingForWhatsApp(cats, user.program));
  };

  return (
    <div className="px-5 pt-8">
      <header className="mb-5 flex items-center gap-3">
        <ShoppingBasket className="text-primary" size={24} />
        <div>
          <h1 className="text-2xl font-bold">{t("shopping.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("shopping.sub")}</p>
        </div>
      </header>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="fc-card h-24 animate-pulse" />)}
        </div>
      )}

      {!loading && cats && cats.length === 0 && (
        <div className="fc-card p-6 text-center text-sm text-muted-foreground">
          {t("shopping.empty")} <br />
          <Link to="/planning" className="mt-3 inline-block text-primary">
            {t("shopping.goPlanning")}
          </Link>
        </div>
      )}

      {!loading && cats && cats.length > 0 && (
        <div className="space-y-5">
          {cats.map((c) => (
            <section key={c.nom}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.nom}
              </h3>
              <div className="fc-card divide-y divide-border p-1">
                {c.items.map((it, i) => {
                  const k = `${c.nom}-${i}`;
                  const on = checked.has(k);
                  return (
                    <label key={k} className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(k)}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      <span className={`text-sm ${on ? "text-muted-foreground line-through" : ""}`}>
                        {it}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          <button
            onClick={shareWA}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-sm font-semibold text-white"
          >
            <MessageCircle size={16} /> {t("shopping.shareWhatsApp")}
          </button>

          <button
            onClick={run}
            className="w-full rounded-full border border-primary py-3 text-sm font-semibold text-primary"
          >
            {t("shopping.regenerate")}
            {!isPremium() && <Crown size={12} className="ml-1 inline text-amber-500" />}
          </button>

          <section className="mt-8">
            <h3 className="text-sm font-semibold">{t("shopping.orderOnline")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("shopping.orderSub")}</p>
            <div className="mt-3 space-y-2">
              {RETAILERS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => openRetailer(r.name, r.url)}
                  className="fc-card flex w-full items-center justify-between p-4 text-left active:scale-[0.98]"
                  style={{ borderLeft: `4px solid ${r.color}` }}
                >
                  <span className="flex items-center gap-3 text-sm font-medium">
                    <span className="text-lg">{r.emoji}</span> {r.name}
                  </span>
                  <ExternalLink size={16} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <Paywall open={paywall} onClose={() => setPaywall(false)} />
    </div>
  );
}
