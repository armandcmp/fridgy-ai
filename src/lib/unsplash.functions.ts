import { createServerFn } from "@tanstack/react-start";

export const fetchUnsplashImage = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string }) => {
    if (!data || typeof data.query !== "string") throw new Error("Invalid query");
    return { query: data.query.slice(0, 120) };
  })
  .handler(async ({ data }) => {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return { url: null as string | null };
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          data.query + " plated gourmet food"
        )}&per_page=5&orientation=landscape&content_filter=high&order_by=relevant`,
        { headers: { Authorization: `Client-ID ${key}` } }
      );
      if (!res.ok) return { url: null };
      const json: any = await res.json();
      const results = json?.results ?? [];
      const photo = results[Math.floor(Math.random() * Math.min(results.length, 5))] ?? results[0];
      const url: string | null = photo?.urls?.regular ?? photo?.urls?.small ?? null;
      return { url };
    } catch {
      return { url: null };
    }
  });
