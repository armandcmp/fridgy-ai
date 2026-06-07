import { useMemo, useState } from "react";

export function getRecipeImageUrl(titre: string, width = 400, height = 300): string {
  const clean = (titre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(",");
  return `https://source.unsplash.com/${width}x${height}/?${clean},food,dish,meal,cooking`;
}

export function programGradient(program: string): string {
  const p = (program || "").toLowerCase();
  if (p.includes("masse") || p.includes("bulk"))
    return "linear-gradient(135deg, #1D4ED8, #3B82F6)";
  if (p.includes("sèche") || p.includes("seche") || p.includes("cut"))
    return "linear-gradient(135deg, #C2410C, #F97316)";
  if (p.includes("perte") || p.includes("loss"))
    return "linear-gradient(135deg, #166534, #4CAF82)";
  if (p.includes("maintien") || p.includes("maintain"))
    return "linear-gradient(135deg, #0F766E, #14B8A6)";
  return "linear-gradient(135deg, #166534, #4CAF82)";
}

export function RecipeImage({
  titre,
  program,
  width = 400,
  height = 160,
  rounded = "16px 16px 0 0",
  className,
  overlay = false,
  vignette = true,
}: {
  titre: string;
  program: string;
  width?: number;
  height?: number;
  rounded?: string;
  className?: string;
  overlay?: boolean;
  vignette?: boolean;
}) {
  const url = useMemo(() => getRecipeImageUrl(titre, width, Math.max(height, 200)), [titre, width, height]);
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
      {!loaded && !errored && (
        <div
          aria-hidden
          className="animate-pulse"
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.06)" }}
        />
      )}
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
            transition: "opacity 400ms ease",
          }}
        />
      )}
      {errored && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontSize: 48,
            color: "rgba(255,255,255,0.95)",
          }}
        >
          🍽
        </div>
      )}
      {vignette && !overlay && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.18) 100%)",
            pointerEvents: "none",
          }}
        />
      )}
      {overlay && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.75) 100%)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
