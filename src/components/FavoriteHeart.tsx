import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import type { Recipe } from "@/lib/types";
import { useLocalReactive } from "@/lib/hooks";

interface Props {
 recipe: Recipe;
 className?: string;
 variant?: "default" | "light";
}

export function FavoriteHeart({ recipe, className = "", variant = "default" }: Props) {
 const favs = useLocalReactive(() => storage.getFavorites());
 const isFav = favs.some((r) => r.id === recipe.id);
 const [pop, setPop] = useState(false);

 const onClick = (e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();
 const added = storage.toggleFavorite(recipe);
 setPop(true);
 setTimeout(() => setPop(false), 220);
 toast(added ? "Recette sauvegardée " : "Recette retirée");
 };

 const color = isFav
 ? "text-[oklch(var(--favorite))]"
 : variant === "light"
 ? "text-white/80"
 : "text-muted-foreground";

 return (
 <button
 onClick={onClick}
 aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
 className={`grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition ${className} ${pop ? "animate-pop" : ""}`}
 >
 <Heart
 size={18}
 className={color}
 fill={isFav ? "currentColor" : "none"}
 strokeWidth={2}
 />
 </button>
 );
}
