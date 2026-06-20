import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ShoppingBasket, MessageCircle, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { generateShoppingList } from "@/lib/ai.functions";
import { getLanguage } from "@/lib/i18n";
import { useLocalReactive } from "@/lib/hooks";
import type { Recipe } from "@/lib/types";

export const Route = createFileRoute("/courses")({
 component: Courses,
});

type Cat = { nom: string; items: string[] };

const RETAILERS = [
 { id: "leclerc", name: "E.Leclerc Drive", emoji: "", color: "border-l-emerald-500", url: "https://www.leclercdrive.fr" },
 { id: "carrefour", name: "Carrefour Drive", emoji: "", color: "border-l-sky-500", url: "https://www.carrefour.fr/drive" },
 { id: "amazon", name: "Amazon Fresh", emoji: "", color: "border-l-orange-500", url: "https://www.amazon.fr/fresh" },
];

function Courses() {
 const { t } = useTranslation();
 const [cats, setCats] = useState<Cat[] | null>(null);
 const [checked, setChecked] = useState<Set<string>>(new Set());
 const [loading, setLoading] = useState(false);
 const gen = useServerFn(generateShoppingList);
 const user = useLocalReactive(() => storage.getUser());

 const run = async () => {
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
 lang: getLanguage(),
 },
 });
 setCats(res.categories);
 } catch (e) {
 toast.error(e instanceof Error ? e.message : "Erreur");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 run(); /* eslint-disable-next-line */
 }, []);

 const toggle = (k: string) => {
 setChecked((prev) => {
 const n = new Set(prev);
 if (n.has(k)) n.delete(k);
 else n.add(k);
 return n;
 });
 };

 const buildWhatsAppText = () => {
 if (!cats) return "";
 let txt = t("shopping.shareHeader") + "\n";
 if (user) txt += t("shopping.shareProgram", { program: user.program }) + "\n";
 txt += "---\n";
 for (const c of cats) {
 txt += `\n*${c.nom}*\n`;
 for (const item of c.items) txt += ` ${item}\n`;
 }
 return txt;
 };

 const buildPlainList = () => {
 if (!cats) return "";
 return cats.flatMap((c) => c.items).join(", ");
 };

 const shareWhatsApp = () => {
 const url = `https://wa.me/?text=${encodeURIComponent(buildWhatsAppText())}`;
 window.open(url, "_blank", "noopener,noreferrer");
 };

 const openRetailer = async (r: (typeof RETAILERS)[number]) => {
 try {
 await navigator.clipboard.writeText(buildPlainList());
 } catch {
 /* ignore */
 }
 window.open(r.url, "_blank", "noopener,noreferrer");
 toast.success(t("shopping.copied", { retailer: r.name }));
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
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="fc-card h-24 animate-pulse p-4" />
 ))}
 </div>
 )}

 {!loading && cats && cats.length === 0 && (
 <div className="fc-card p-6 text-center text-sm text-muted-foreground">
 {t("shopping.empty")}
 <br />
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
 onClick={shareWhatsApp}
 className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white"
 >
 <MessageCircle size={16} />
 {t("shopping.whatsapp")}
 </button>

 <button
 onClick={run}
 className="w-full rounded-full border border-primary py-3 text-sm font-semibold text-primary"
 >
 {t("shopping.regenerate")}
 </button>

 {/* Online retailers */}
 <section className="mt-2">
 <h3 className="text-sm font-semibold">{t("shopping.online")}</h3>
 <p className="mt-1 text-xs text-muted-foreground">{t("shopping.onlineSub")}</p>
 <div className="mt-3 space-y-2">
 {RETAILERS.map((r) => (
 <button
 key={r.id}
 onClick={() => openRetailer(r)}
 className={`fc-card flex w-full items-center gap-3 border-l-4 p-4 text-left ${r.color} active:scale-[0.98]`}
 >
 <span className="text-xl">{r.emoji}</span>
 <span className="flex-1 text-sm font-semibold">{r.name}</span>
 <ExternalLink size={14} className="text-muted-foreground" />
 </button>
 ))}
 </div>
 </section>
 </div>
 )}
 </div>
 );
}
