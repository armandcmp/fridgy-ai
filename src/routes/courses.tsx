import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ShoppingBasket, Share2, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { storage } from "@/lib/storage";
import { generateShoppingList } from "@/lib/ai.functions";
import type { Recipe } from "@/lib/types";
import { useGate } from "@/lib/useGate";
import {
  formatShoppingFlat,
  formatShoppingForWhatsApp,
  shareToWhatsApp,
} from "@/lib/share";
import { RETAILERS, RetailerSheet, type Retailer } from "@/components/RetailerSheet";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/courses")({
  component: Courses,
});

type Cat = { nom: string; items: string[] };

function Courses() {
  const { t } = useTranslation();
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [activeRetailer, setActiveRetailer] = useState<Retailer | null>(null);
  const gen = useServerFn(generateShoppingList);
  const gate = useGate("shopping");

  const run = async (count = true) => {
    if (count && !gate.allowed) {
      gate.showPaywall();
      return;
    }
    const planning = storage.getPlanning();
    const recipes: Recipe[] = planning
      ? (planning.days.map((d) => d.recette).filter(Boolean) as Recipe[])
      : storage.getRecipes();
    if (recipes.length === 0) {
      setCats([]);
      return;
    }
    setLoading(true);
    try {
      const res = await gen({
        data: {
          recipes: recipes.map((r) => ({ titre: r.titre, ingredients: r.ingredients })),
          lang: i18n.language,
        },
      });
      setCats(res.categories);
      if (count) gate.consume();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run(false); /* eslint-disable-next-line */
  }, []);

  const toggle = (k: string) => {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  const flatList = cats ? formatShoppingFlat(cats) : "";

  return (
    <div className="px-5 pt-8">
      <header className="mb-5 flex items-center gap-3">
        <ShoppingBasket className="text-primary" size={24} />
        <div>
          <h1 className="text-2xl font-bold">{t("home.shopping_list")}</h1>
          <p className="text-sm text-muted-foreground">
            À partir de vos recettes planifiées
          </p>
        </div>
      </header>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="fc-card h-24 animate-pulse p-4" />
          ))}
        </div>
      )}

      {!loading && cats && cats.length === 0 && (
        <div className="fc-card p-6 text-center text-sm text-muted-foreground">
          Aucune recette à utiliser. <br />
          <Link to="/planning" className="mt-3 inline-block text-primary">
            → Aller au planning
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
                    <label
                      key={k}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
                    >
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

          {/* Share actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => shareToWhatsApp(formatShoppingForWhatsApp(cats))}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 py-2.5 text-xs font-semibold text-white"
            >
              <MessageCircle size={14} /> {t("share.whatsapp")}
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(formatShoppingForWhatsApp(cats));
                toast.success(t("share.copied"));
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-input py-2.5 text-xs font-semibold"
            >
              <Copy size={14} /> {t("share.copy")}
            </button>
          </div>

          {/* Retailers */}
          <section>
            <h3 className="mb-2 text-sm font-semibold">{t("retailer.title")}</h3>
            <div className="grid grid-cols-3 gap-2">
              {RETAILERS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setActiveRetailer(r)}
                  className="fc-card flex flex-col items-center gap-1 p-3 text-center transition active:scale-[0.97]"
                >
                  <span
                    className="text-[11px] font-extrabold leading-tight"
                    style={{ color: r.color }}
                  >
                    {r.name.split(" ")[0]}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {r.name.split(" ").slice(1).join(" ")}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={() => run(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary py-3 text-sm font-semibold text-primary"
          >
            <Share2 size={14} /> Régénérer la liste
          </button>
        </div>
      )}

      <RetailerSheet
        retailer={activeRetailer}
        list={flatList}
        onClose={() => setActiveRetailer(null)}
      />
    </div>
  );
}
