import { useEffect, useState } from "react";

const API_KEY = import.meta.env.VITE_PEXELS_API_KEY as string | undefined;

function normalize(titre: string): string {
  return (titre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

async function pexelsSearch(query: string): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: API_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.photos?.length > 0) return data.photos[0].src.medium as string;
  } catch {
    // ignore
  }
  return null;
}

export async function fetchRecipeImage(recipeTitre: string): Promise<string | null> {
  const query = normalize(recipeTitre);
  if (!query) return null;

  const cacheKey = `pexels_${query}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch {
    // sessionStorage may be unavailable (SSR)
  }

  let url = await pexelsSearch(`${query} food dish plate`);
  if (!url) {
    const first = query.split(" ")[0];
    if (first) url = await pexelsSearch(`${first} food`);
  }

  if (url) {
    try {
      sessionStorage.setItem(cacheKey, url);
    } catch {
      // ignore
    }
  }
  return url;
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

// Back-compat (no longer used for Pexels; returns empty so consumers should switch to RecipeImage)
export function getRecipeImageUrl(_titre: string): string {
  return "";
}

export function RecipeImage({
  titre,
  program,
  height = 180,
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const gradient = programGradient(program);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setImageUrl(null);

    fetchRecipeImage(titre)
      .then((url) => {
        if (cancelled) return;
        if (url) {
          setImageUrl(url);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [titre]);

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
      {loading && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s linear infinite",
          }}
        />
      )}
      {!loading && imageUrl && !error && (
        <img
          src={imageUrl}
          alt={titre}
          loading="lazy"
          onError={() => setError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            animation: "fadeIn 400ms ease",
          }}
        />
      )}
      {!loading && (error || !imageUrl) && (
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
      {vignette && !overlay && imageUrl && !error && (
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
