import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const LANG_NAMES: Record<string, string> = {
  fr: "français",
  en: "English",
  es: "español",
  pt: "português",
  zh: "中文",
};

function langName(lang?: string): string {
  if (!lang) return "français";
  return LANG_NAMES[lang.slice(0, 2)] ?? "français";
}

async function callAI(body: Record<string, unknown>): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY non configurée");
  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("Limite atteinte, réessayez plus tard.");
    if (resp.status === 402) throw new Error("Crédits IA épuisés. Ajoutez du crédit.");
    throw new Error(`Erreur IA (${resp.status})`);
  }
  const json = await resp.json();
  return json.choices?.[0]?.message?.content ?? "";
}

function extractJSON<T>(text: string): T {
  let s = text.trim();
  s = s.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  const first = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    first === -1 ? firstArr : firstArr === -1 ? first : Math.min(first, firstArr);
  if (start > 0) s = s.slice(start);
  const lastBrace = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (lastBrace > 0) s = s.slice(0, lastBrace + 1);
  return JSON.parse(s) as T;
}

const RecipeSchema = z.object({
  titre: z.string(),
  description: z.string().default(""),
  calories: z.number(),
  proteines: z.number(),
  glucides: z.number(),
  lipides: z.number(),
  temps: z.string(),
  difficulte: z.string(),
  ingredients: z.array(z.string()).default([]),
  etapes: z.array(z.string()).default([]),
});

const langField = z.string().optional();

export const generateRecipes = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ingredients: z.array(z.string()).min(1),
      program: z.string(),
      lang: langField,
    }),
  )
  .handler(async ({ data }) => {
    const lang = langName(data.lang);
    const text = await callAI({
      messages: [
        {
          role: "system",
          content: `You are an expert nutritionist. Propose recipes adapted to a program. Always respond in this language: ${lang}. Reply ONLY with valid JSON, no markdown.`,
        },
        {
          role: "user",
          content: `Program: ${data.program}
Available ingredients: ${data.ingredients.join(", ")}

Propose 4 varied, balanced recipes using these ingredients.
Keep field names exactly as in this JSON schema (keys in French) but write the VALUES in ${lang}:
{
  "recettes": [
    {
      "titre": "string",
      "description": "string (1 short sentence)",
      "calories": number,
      "proteines": number,
      "glucides": number,
      "lipides": number,
      "temps": "string (e.g. 25 min)",
      "difficulte": "string",
      "ingredients": ["string"],
      "etapes": ["string"]
    }
  ]
}`,
        },
      ],
    });
    const parsed = extractJSON<{ recettes: unknown[] }>(text);
    const list = (parsed.recettes ?? []).map((r) => RecipeSchema.parse(r));
    return { recettes: list };
  });

export const extractIngredients = createServerFn({ method: "POST" })
  .inputValidator(z.object({ text: z.string().min(1).max(2000), lang: langField }))
  .handler(async ({ data }) => {
    const lang = langName(data.lang);
    const text = await callAI({
      messages: [
        {
          role: "system",
          content: `Extract food ingredients from spoken text. Always respond in this language: ${lang}. Reply ONLY with valid JSON.`,
        },
        {
          role: "user",
          content: `Extract all food ingredients from this text: "${data.text}"

Reply: { "ingredients": ["string"] }`,
        },
      ],
    });
    const parsed = extractJSON<{ ingredients: string[] }>(text);
    return { ingredients: parsed.ingredients ?? [] };
  });

export const extractFromImage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ imageBase64: z.string().min(20), lang: langField }))
  .handler(async ({ data }) => {
    const lang = langName(data.lang);
    const text = await callAI({
      messages: [
        {
          role: "system",
          content: `Identify food ingredients visible in an image of a fridge or pantry. Always respond in this language: ${lang}. Reply ONLY with valid JSON.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Identify all visible food ingredients. Reply: { "ingredients": ["string"] }',
            },
            { type: "image_url", image_url: { url: data.imageBase64 } },
          ],
        },
      ],
    });
    const parsed = extractJSON<{ ingredients: string[] }>(text);
    return { ingredients: parsed.ingredients ?? [] };
  });

export const generateWeekPlan = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      program: z.string(),
      habitualIngredients: z.array(z.string()).default([]),
      lang: langField,
    }),
  )
  .handler(async ({ data }) => {
    const lang = langName(data.lang);
    const text = await callAI({
      messages: [
        {
          role: "system",
          content: `You are an expert nutritionist. Plan balanced weeks of meals. Always respond in this language: ${lang}. Reply ONLY with valid JSON.`,
        },
        {
          role: "user",
          content: `Program: ${data.program}
Generate a planning of 7 meals (one per day, Monday to Sunday) adapted to this program.
Habitual ingredients available: ${data.habitualIngredients.join(", ") || "(none)"}

Keep JSON keys exactly as below but write VALUES in ${lang} (day names like "Lundi/Mardi..." translated):
{
  "planning": [
    {
      "jour": "Lundi",
      "recette": {
        "titre": "string",
        "description": "string",
        "calories": number,
        "proteines": number,
        "glucides": number,
        "lipides": number,
        "temps": "string",
        "difficulte": "string",
        "ingredients": ["string"],
        "etapes": ["string"]
      }
    }
  ]
}`,
        },
      ],
    });
    const parsed = extractJSON<{ planning: { jour: string; recette: unknown }[] }>(
      text,
    );
    const planning = parsed.planning.map((p) => ({
      jour: p.jour,
      recette: RecipeSchema.parse(p.recette),
    }));
    return { planning };
  });

export const generateShoppingList = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      recipes: z.array(
        z.object({ titre: z.string(), ingredients: z.array(z.string()) }),
      ),
      lang: langField,
    }),
  )
  .handler(async ({ data }) => {
    const lang = langName(data.lang);
    const text = await callAI({
      messages: [
        {
          role: "system",
          content: `Consolidate ingredient lists into a shopping list grouped by category. Always respond in this language: ${lang}. Reply ONLY with valid JSON.`,
        },
        {
          role: "user",
          content: `Here are ${data.recipes.length} recipes. Consolidate into a shopping list grouped by category (Fruits & vegetables, Meat & fish, Dairy, Pantry, Other) — translate category names to ${lang}.

Recipes:
${data.recipes.map((r, i) => `${i + 1}. ${r.titre}: ${r.ingredients.join(", ")}`).join("\n")}

Reply with this JSON:
{ "categories": [ { "nom": "string", "items": ["string"] } ] }`,
        },
      ],
    });
    const parsed = extractJSON<{
      categories: { nom: string; items: string[] }[];
    }>(text);
    return parsed;
  });

const CommunityRecipeSchema = z.object({
  titre: z.string(),
  auteur: z.string(),
  avatar: z.string(),
  avatarColor: z.string(),
  likes: z.number(),
  calories: z.number(),
  proteines: z.number(),
  glucides: z.number(),
  lipides: z.number(),
  temps: z.string(),
  difficulte: z.string(),
  description: z.string(),
  program: z.string(),
});

export const generateCommunityFeed = createServerFn({ method: "POST" })
  .inputValidator(z.object({ program: z.string(), lang: langField }))
  .handler(async ({ data }) => {
    const lang = langName(data.lang);
    const text = await callAI({
      messages: [
        {
          role: "system",
          content: `You simulate a community feed for a cooking & nutrition app. Generate realistic recipes with fake French users. Always respond in this language: ${lang}. Reply ONLY with valid JSON, no markdown.`,
        },
        {
          role: "user",
          content: `Active user program: ${data.program}
Generate 6 trending recipes shared by fake users with realistic French first names.

Exact JSON (keep keys, write values in ${lang}; "avatar" = 2 uppercase initials; "avatarColor" = hex like "#4CAF82"; "likes" = number 12..847):
{
  "recettes": [
    {
      "titre": "string",
      "auteur": "string",
      "avatar": "string",
      "avatarColor": "string",
      "likes": number,
      "calories": number,
      "proteines": number,
      "glucides": number,
      "lipides": number,
      "temps": "string",
      "difficulte": "string",
      "description": "string (max 80 chars)",
      "program": "string"
    }
  ]
}`,
        },
      ],
    });
    const parsed = extractJSON<{ recettes: unknown[] }>(text);
    const list = (parsed.recettes ?? []).map((r) => CommunityRecipeSchema.parse(r));
    return { recettes: list };
  });

export const generateFullRecipeFromTitle = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ titre: z.string(), program: z.string(), lang: langField }),
  )
  .handler(async ({ data }) => {
    const lang = langName(data.lang);
    const text = await callAI({
      messages: [
        {
          role: "system",
          content: `You are an expert nutritionist. Always respond in this language: ${lang}. Reply ONLY with valid JSON.`,
        },
        {
          role: "user",
          content: `Write the full recipe for "${data.titre}" suited to program "${data.program}".
Reply with this exact JSON (keep keys, write VALUES in ${lang}):
{
  "titre": "string",
  "description": "string",
  "calories": number,
  "proteines": number,
  "glucides": number,
  "lipides": number,
  "temps": "string",
  "difficulte": "string",
  "ingredients": ["string"],
  "etapes": ["string"]
}`,
        },
      ],
    });
    return RecipeSchema.parse(extractJSON(text));
  });
