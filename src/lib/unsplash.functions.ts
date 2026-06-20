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
          data.query + " food dish"
        )}&per_page=1&orientation=landscape&content_filter=high`,
        { headers: { Authorization: `Client-ID ${key}` } }
      );
      if (!res.ok) return { url: null };
      const json: any = await res.json();
      const photo = json?.results?.[0];
      const url: string | null = photo?.urls?.regular ?? photo?.urls?.small ?? null;
      return { url };
    } catch {
      return { url: null };
    }
  });
