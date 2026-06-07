import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const LANG_NAME: Record<string, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  zh: "Chinese (Simplified)",
};

function langInstruction(lang?: string): string {
  const name = LANG_NAME[lang ?? "fr"] ?? "French";
  return ` Always respond in this language: ${name}.`;
}

async function callAI(body: Record<string, unknown>): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY non configurée");
  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("Rate limit, try again later.");
    if (resp.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI error (${resp.status})`);
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

const LangIn = z.string().optional();

export const generateRecipes = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ingredients: z.array(z.string()).min(1),
      program: z.string(),
      lang: LangIn,
    }),
  )
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Tu es un nutritionniste expert. Tu proposes des recettes adaptées à un programme. Réponds UNIQUEMENT en JSON valide, sans markdown." +
            langInstruction(data.lang),
        },
        {
          role: "user",
          content: `Programme: ${data.program}
Ingredients available: ${data.ingredients.join(", ")}

Provide 4 varied balanced recipes. Reply with exact JSON:
{"recettes":[{"titre":"","description":"","calories":0,"proteines":0,"glucides":0,"lipides":0,"temps":"","difficulte":"","ingredients":[""],"etapes":[""]}]}`,
        },
      ],
    });
    const parsed = extractJSON<{ recettes: unknown[] }>(text);
    return { recettes: (parsed.recettes ?? []).map((r) => RecipeSchema.parse(r)) };
  });

export const extractIngredients = createServerFn({ method: "POST" })
  .inputValidator(z.object({ text: z.string().min(1).max(2000), lang: LangIn }))
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "You extract food ingredients from spoken text. Reply ONLY in valid JSON." +
            langInstruction(data.lang),
        },
        {
          role: "user",
          content: `Extract all food ingredients from this text: "${data.text}"
Reply with: {"ingredients":["string"]}`,
        },
      ],
    });
    const parsed = extractJSON<{ ingredients: string[] }>(text);
    return { ingredients: parsed.ingredients ?? [] };
  });

export const extractFromImage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ imageBase64: z.string().min(20), lang: LangIn }))
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "You identify food ingredients visible in a fridge/pantry image. Reply ONLY in valid JSON." +
            langInstruction(data.lang),
        },
        {
          role: "user",
          content: [
            { type: "text", text: 'Identify all visible food ingredients. Reply: {"ingredients":["string"]}' },
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
      lang: LangIn,
    }),
  )
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "You plan balanced weekly meals. Reply ONLY in valid JSON." +
            langInstruction(data.lang),
        },
        {
          role: "user",
          content: `Program: ${data.program}
Generate 7 varied meals (one per day, Lundi to Dimanche) for this program.
Frequent ingredients: ${data.habitualIngredients.join(", ") || "(none)"}
Reply with:
{"planning":[{"jour":"Lundi","recette":{"titre":"","description":"","calories":0,"proteines":0,"glucides":0,"lipides":0,"temps":"","difficulte":"","ingredients":[""],"etapes":[""]}}]}`,
        },
      ],
    });
    const parsed = extractJSON<{ planning: { jour: string; recette: unknown }[] }>(text);
    return {
      planning: parsed.planning.map((p) => ({
        jour: p.jour,
        recette: RecipeSchema.parse(p.recette),
      })),
    };
  });

export const generateShoppingList = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      recipes: z.array(z.object({ titre: z.string(), ingredients: z.array(z.string()) })),
      lang: LangIn,
    }),
  )
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "You consolidate ingredients into a categorized shopping list. Reply ONLY in valid JSON." +
            langInstruction(data.lang),
        },
        {
          role: "user",
          content: `Here are ${data.recipes.length} recipes. Build a consolidated shopping list grouped by category (Fruits & légumes, Viandes & protéines, Produits laitiers, Épicerie, Autres).

Recipes:
${data.recipes.map((r, i) => `${i + 1}. ${r.titre}: ${r.ingredients.join(", ")}`).join("\n")}

Reply:
{"categories":[{"nom":"","items":[""]}]}`,
        },
      ],
    });
    return extractJSON<{ categories: { nom: string; items: string[] }[] }>(text);
  });

// Community feed
export const generateCommunityFeed = createServerFn({ method: "POST" })
  .inputValidator(z.object({ program: z.string(), lang: LangIn }))
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Tu simules un feed communautaire d'une app de cuisine et nutrition. Tu génères des recettes réalistes avec de faux utilisateurs aux prénoms internationaux. Réponds UNIQUEMENT en JSON valide sans markdown." +
            langInstruction(data.lang),
        },
        {
          role: "user",
          content: `Programme actif: ${data.program}
Generate 6 trending recipes shared by fake users with realistic first names.

Exact JSON:
{"recettes":[{"titre":"","auteur":"","avatar":"AB","avatarColor":"#FF6B6B","likes":42,"calories":500,"proteines":30,"glucides":40,"lipides":15,"temps":"25 min","difficulte":"Facile","description":"","program":""}]}`,
        },
      ],
    });
    const parsed = extractJSON<{
      recettes: {
        titre: string;
        auteur: string;
        avatar: string;
        avatarColor: string;
        likes: number;
        calories: number;
        proteines: number;
        glucides: number;
        lipides: number;
        temps: string;
        difficulte: string;
        description: string;
        program: string;
      }[];
    }>(text);
    return { recettes: parsed.recettes ?? [] };
  });

// Tips for recipe detail
export const generateChefTips = createServerFn({ method: "POST" })
  .inputValidator(z.object({ recipeTitle: z.string(), lang: LangIn }))
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Tu es un chef expérimenté. Tu donnes 3 astuces courtes et pratiques pour réussir une recette. Réponds UNIQUEMENT en JSON valide." +
            langInstruction(data.lang),
        },
        {
          role: "user",
          content: `Recette: "${data.recipeTitle}"
Donne 3 astuces de chef courtes (1 phrase chacune).
JSON: {"tips":["",""]}`,
        },
      ],
    });
    const parsed = extractJSON<{ tips: string[] }>(text);
    return { tips: (parsed.tips ?? []).slice(0, 3) };
  });

// Full recipe from a community card (no ingredients/steps in feed)
export const expandCommunityRecipe = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      titre: z.string(),
      description: z.string(),
      program: z.string(),
      lang: LangIn,
    }),
  )
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Tu détailles une recette avec ingrédients et étapes. Réponds UNIQUEMENT en JSON valide." +
            langInstruction(data.lang),
        },
        {
          role: "user",
          content: `Titre: ${data.titre}
Description: ${data.description}
Programme: ${data.program}
JSON: {"recette":{"titre":"","description":"","calories":0,"proteines":0,"glucides":0,"lipides":0,"temps":"","difficulte":"","ingredients":[""],"etapes":[""]}}`,
        },
      ],
    });
    const parsed = extractJSON<{ recette: unknown }>(text);
    return { recette: RecipeSchema.parse(parsed.recette) };
  });
