import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { generateShoppingList } from "@/lib/ai.functions";
import type { Recipe } from "@/lib/types";

export const Route = createFileRoute("/courses")({
  component: Courses,
});

type Cat = { nom: string; items: string[] };

function Courses() {
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const gen = useServerFn(generateShoppingList);

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
        },
      });
      setCats(res.categories);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  const toggle = (k: string) => {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  return (
    <div className="px-5 pt-8">
      <header className="mb-5 flex items-center gap-3">
        <ShoppingBasket className="text-primary" size={24} />
        <div>
          <h1 className="text-2xl font-bold">Liste de courses</h1>
          <p className="text-sm text-muted-foreground">À partir de vos recettes planifiées</p>
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
          <Link to="/planning" className="mt-3 inline-block text-primary">→ Aller au planning</Link>
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
                        className="h-4 w-4 accent-[oklch(var(--primary))]"
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
            onClick={run}
            className="w-full rounded-full border border-primary py-3 text-sm font-semibold text-primary"
          >
            Régénérer la liste
          </button>
        </div>
      )}
    </div>
  );
}
