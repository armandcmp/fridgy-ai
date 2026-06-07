import { useMemo, useState } from "react";

export function getRecipeImageUrl(titre: string): string {
  const q = encodeURIComponent(
    titre
      .toLowerCase()
      .replace(/[àâä]/g, "a")
      .replace(/[éèêë]/g, "e")
      .replace(/[îï]/g, "i")
      .replace(/[ôö]/g, "o")
      .replace(/[ùûü]/g, "u")
      .split(/\s+/)
      .slice(0, 3)
      .join(" "),
  );
  // Unsplash source URL — free, no API key
  return `https://source.unsplash.com/400x300/?food,${q},meal,cooking`;
}

export function programGradient(program: string): string {
  const p = (program || "").toLowerCase();
  if (p.includes("masse") || p.includes("bulk"))
    return "linear-gradient(135deg, #1D4ED8, #3B82F6)";
  if (p.includes("sèche") || p.includes("seche") || p.includes("cut"))
    return "linear-gradient(135deg, #C2410C, #F97316)";
  if (p.includes("perte") || p.includes("loss"))
    return "linear-gradient(135deg, #166534, #4CAF82)";
  if (p.includes("maintien") || p.includes("maintain") || p.includes("mantén") || p.includes("manuten") || p.includes("维持"))
    return "linear-gradient(135deg, #0F766E, #14B8A6)";
  return "linear-gradient(135deg, #166534, #4CAF82)";
}

export function RecipeImage({
  titre,
  program,
  height = 160,
  rounded = "16px 16px 0 0",
  className,
  overlay = false,
}: {
  titre: string;
  program: string;
  height?: number;
  rounded?: string;
  className?: string;
  overlay?: boolean;
}) {
  const url = useMemo(() => getRecipeImageUrl(titre), [titre]);
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const gradient = programGradient(program);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: rounded,
        overflow: "hidden",
        background: gradient,
      }}
    >
      {!errored && (
        <img
          src={url}
          alt={titre}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 300ms",
          }}
        />
      )}
      {(errored || !loaded) && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontSize: 48,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          🍽
        </div>
      )}
      {overlay && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)",
          }}
        />
      )}
    </div>
  );
}
