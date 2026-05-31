import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

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

// ----- Generate recipes from ingredients -----
export const generateRecipes = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ingredients: z.array(z.string()).min(1),
      program: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Tu es un nutritionniste expert. Tu proposes des recettes en français adaptées à un programme. Réponds UNIQUEMENT en JSON valide, sans markdown.",
        },
        {
          role: "user",
          content: `Programme : ${data.program}
Ingrédients disponibles : ${data.ingredients.join(", ")}

Propose 4 recettes variées et équilibrées utilisant ces ingrédients. Réponds avec ce JSON exact :
{
  "recettes": [
    {
      "titre": "string",
      "description": "string (1 phrase courte)",
      "calories": number,
      "proteines": number,
      "glucides": number,
      "lipides": number,
      "temps": "string (ex: 25 min)",
      "difficulte": "string (Facile/Moyen/Difficile)",
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

// ----- Extract ingredients from text -----
export const extractIngredients = createServerFn({ method: "POST" })
  .inputValidator(z.object({ text: z.string().min(1).max(2000) }))
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Tu extrais des ingrédients alimentaires depuis un texte parlé en français. Tu réponds UNIQUEMENT en JSON valide.",
        },
        {
          role: "user",
          content: `Extrait tous les ingrédients alimentaires de ce texte : "${data.text}"

Réponds avec ce JSON :
{ "ingredients": ["string"] }`,
        },
      ],
    });
    const parsed = extractJSON<{ ingredients: string[] }>(text);
    return { ingredients: parsed.ingredients ?? [] };
  });

// ----- Extract ingredients from image -----
export const extractFromImage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ imageBase64: z.string().min(20) }))
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Tu identifies les ingrédients alimentaires visibles dans une image de frigo ou de placard. Réponds UNIQUEMENT en JSON valide.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Identifie tous les ingrédients alimentaires visibles. Réponds avec : { "ingredients": ["string"] }',
            },
            {
              type: "image_url",
              image_url: { url: data.imageBase64 },
            },
          ],
        },
      ],
    });
    const parsed = extractJSON<{ ingredients: string[] }>(text);
    return { ingredients: parsed.ingredients ?? [] };
  });

// ----- Weekly meal plan -----
export const generateWeekPlan = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      program: z.string(),
      habitualIngredients: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Tu es un nutritionniste expert. Tu planifies des semaines de repas équilibrées en français. Tu réponds UNIQUEMENT en JSON valide.",
        },
        {
          role: "user",
          content: `Programme : ${data.program}
Génère un planning de 7 repas variés (1 par jour, Lundi à Dimanche) adaptés à ce programme.
Ingrédients habituels disponibles : ${data.habitualIngredients.join(", ") || "(aucun)"}

Réponds avec ce JSON :
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

// ----- Shopping list from recipes -----
export const generateShoppingList = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      recipes: z.array(
        z.object({ titre: z.string(), ingredients: z.array(z.string()) }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const text = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Tu consolides des listes d'ingrédients en une liste de courses regroupée par catégorie. Réponds UNIQUEMENT en JSON valide.",
        },
        {
          role: "user",
          content: `Voici ${data.recipes.length} recettes. Consolide une liste de courses regroupée par catégorie (Fruits & légumes, Viande & poisson, Produits laitiers, Épicerie, Autres).

Recettes :
${data.recipes.map((r, i) => `${i + 1}. ${r.titre}: ${r.ingredients.join(", ")}`).join("\n")}

Réponds avec ce JSON :
{
  "categories": [
    { "nom": "string", "items": ["string"] }
  ]
}`,
        },
      ],
    });
    const parsed = extractJSON<{
      categories: { nom: string; items: string[] }[];
    }>(text);
    return parsed;
  });
