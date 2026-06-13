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

const MealEnum = z.enum(["petit-dejeuner", "dejeuner", "diner"]).optional();

function mealInstructions(meal?: string): string {
  switch (meal) {
    case "petit-dejeuner":
      return `Type de repas : petit-dejeuner.
Génère UNIQUEMENT des recettes matinales (œufs, smoothies, porridge, pancakes, tartines, yaourts, fruits, granola...). Jamais de plats de résistance lourds.`;
    case "diner":
      return `Type de repas : diner.
Génère UNIQUEMENT des repas légers et digestes (soupes, salades, poissons, légumes, omelettes, plats peu caloriques).`;
    case "dejeuner":
    default:
      return `Type de repas : dejeuner.
Génère UNIQUEMENT des repas complets et rassasiants (viandes, féculents, légumes, salades composées, plats chauds).`;
  }
}

const BodyProfileSchema = z
  .object({
    age: z.number(),
    sexe: z.enum(["homme", "femme"]),
    tailleCm: z.number(),
    poidsKg: z.number(),
    poidsObjectifKg: z.number().nullable().optional(),
    imc: z.number(),
    imcCategory: z.string(),
    activityLevel: z.string(),
    tdee: z.number(),
  })
  .optional();

function mealRatio(meal?: string): number {
  if (meal === "petit-dejeuner") return 0.25;
  if (meal === "diner") return 0.3;
  return 0.4;
}

function proteinPerKg(level?: string): number {
  switch (level) {
    case "sedentaire": return 0.8;
    case "leger": return 1.2;
    case "modere": return 1.6;
    case "tres_actif": return 2.0;
    default: return 1.2;
  }
}

function profileInstructions(
  meal: string | undefined,
  p: z.infer<typeof BodyProfileSchema>,
): string {
  if (!p) return "";
  const targetKcal = Math.round(p.tdee * mealRatio(meal));
  const protein = Math.round(proteinPerKg(p.activityLevel) * p.poidsKg);
  const goal = p.poidsObjectifKg ? `${p.poidsObjectifKg} kg` : "maintien";
  return `
Profil de l'utilisateur :
- Âge : ${p.age} ans
- Sexe : ${p.sexe}
- IMC : ${p.imc} (${p.imcCategory})
- Besoin calorique journalier : ${p.tdee} kcal
- Objectif de poids : ${goal}
- Niveau d'activité : ${p.activityLevel}

Adapte les recettes à ce profil :
- Portions et calories calibrées sur ${p.tdee} kcal/jour.
- Pour ce repas, vise environ ${targetKcal} kcal par portion.
- Si IMC > 25 : favorise les recettes à faible densité calorique.
- Si IMC < 18.5 : augmente les portions et la densité nutritionnelle.
- Protéines visées : environ ${protein} g par portion.`;
}

const IngredientItemSchema = z.object({
  nom: z.string(),
  quantite: z.string().default(""),
  disponible: z.boolean().default(false),
});

const RichRecipeSchema = z.object({
  titre: z.string(),
  description: z.string().default(""),
  temps: z.string().default("20 min"),
  difficulte: z.string().default("Facile"),
  mealType: z.string().optional(),
  program: z.string().optional(),
  calories: z.number(),
  proteines: z.number(),
  glucides: z.number(),
  lipides: z.number(),
  fibres: z.number().optional().default(0),
  indexGlycemique: z.string().optional().default("Moyen"),
  ingredients: z.array(IngredientItemSchema).default([]),
  etapes: z.array(z.string()).default([]),
  conseil_nutritionnel: z.string().optional().default(""),
  pourquoi_adapte: z.string().optional().default(""),
});

type RichRecipe = z.infer<typeof RichRecipeSchema>;

function targetCalories(tdee: number | undefined, meal?: string): number {
  const base = tdee && tdee > 0 ? tdee : 2000;
  const ratio = meal === "petit-dejeuner" ? 0.25 : meal === "diner" ? 0.3 : 0.4;
  return Math.round(base * ratio);
}

function validateDiversity(recipes: RichRecipe[], target: number): boolean {
  if (recipes.length < 3) return false;
  const mains = recipes
    .slice(0, 3)
    .map((r) => (r.ingredients[0]?.nom ?? "").toLowerCase().trim())
    .filter(Boolean);
  if (new Set(mains).size < 3) return false;
  return recipes.slice(0, 3).every(
    (r) => r.calories >= target * 0.8 && r.calories <= target * 1.2,
  );
}

function programDirectives(program: string, bp: z.infer<typeof BodyProfileSchema>): string {
  const tdee = bp?.tdee ?? 2000;
  const w = bp?.poidsKg ?? 70;
  const p = program.toLowerCase();
  if (p.includes("masse") || p.includes("bulk")) {
    return `Programme Prise de masse :
→ Vise ${Math.round(tdee * 1.1)} kcal par jour total.
→ Protéines : ${Math.round(w * 2.0)} g minimum.
→ Inclure des sources de glucides complexes (riz, pâtes, avoine, légumineuses).
→ Portions généreuses, ajout de graisses saines (huile, oléagineux, fromage).
→ Privilégier : riz, pâtes, avoine, œufs, poulet, bœuf, légumineuses, fromage blanc, beurre de cacahuète.`;
  }
  if (p.includes("sèche") || p.includes("seche") || p.includes("cut")) {
    return `Programme Sèche :
→ Vise ${Math.round(tdee * 0.85)} kcal par jour.
→ Protéines : ${Math.round(w * 2.2)} g minimum.
→ Glucides : maximum 100 g par jour.
→ Légumes, protéines maigres ; éviter sucres rapides et graisses saturées.
→ Privilégier : blanc de poulet, poisson, œufs, légumes verts, fromage blanc 0 %, riz basmati en petite quantité.`;
  }
  if (p.includes("perte") || p.includes("loss")) {
    return `Programme Perte de poids :
→ Vise ${Math.round(tdee * 0.8)} kcal par jour.
→ Index glycémique bas, fibres élevées pour la satiété.
→ Favoriser aliments volumeux peu caloriques.
→ Privilégier : légumes, légumineuses, poisson blanc, volaille sans peau, produits laitiers allégés.`;
  }
  return `Programme Maintien :
→ Vise exactement ${tdee} kcal par jour.
→ Répartition 40 % glucides / 30 % protéines / 30 % lipides.
→ Recettes variées et équilibrées, qualité nutritionnelle prioritaire.`;
}

function buildUserPrompt(
  program: string,
  mealType: string | undefined,
  ingredients: string[],
  bp: z.infer<typeof BodyProfileSchema>,
  recentTitles: string[],
  retryHint: string,
): string {
  const profile = bp
    ? `Profil corporel :
- IMC : ${bp.imc} (${bp.imcCategory})
- TDEE : ${bp.tdee} kcal/jour
- Objectif poids : ${bp.poidsObjectifKg ? `${bp.poidsObjectifKg} kg` : "maintien"}
- Activité : ${bp.activityLevel}
- Sexe : ${bp.sexe}, Âge : ${bp.age} ans
- Poids : ${bp.poidsKg} kg`
    : `Profil corporel : non renseigné (utiliser valeurs standards 2000 kcal/jour).`;

  const recent = recentTitles.length
    ? `\nIMPORTANT : Ne génère PAS ces recettes qui ont déjà été proposées récemment :
${recentTitles.slice(0, 6).join(", ")}
Propose des recettes originales et variées.`
    : "";

  return `Programme nutritionnel : ${program}
Type de repas : ${mealType ?? "dejeuner"}

${profile}

Ingrédients disponibles : ${ingredients.join(", ")}

INSTRUCTIONS SPÉCIFIQUES pour ce profil :
${programDirectives(program, bp)}
${recent}
${retryHint}

Génère EXACTEMENT 3 recettes RADICALEMENT DIFFÉRENTES entre elles, adaptées à ${mealType ?? "dejeuner"} et au programme ${program}.
Chaque recette a un ingrédient principal différent, une famille différente (pas deux salades, pas deux omelettes) et un mode de cuisson différent (cru / cuit / grillé / vapeur / four).

Pour chaque ingrédient, indique "disponible: true" s'il fait partie de la liste de l'utilisateur (correspondance souple, accents/pluriels tolérés), sinon "disponible: false" (à acheter).

Réponds UNIQUEMENT avec ce JSON exact (aucun markdown, aucun texte avant/après) :
{
  "recettes": [
    {
      "titre": "string",
      "description": "string (max 100 chars)",
      "temps": "string (ex: 25 min)",
      "difficulte": "Facile|Moyen|Difficile",
      "mealType": "${mealType ?? "dejeuner"}",
      "program": "${program}",
      "calories": number,
      "proteines": number,
      "glucides": number,
      "lipides": number,
      "fibres": number,
      "indexGlycemique": "Bas|Moyen|Élevé",
      "ingredients": [
        { "nom": "string", "quantite": "string", "disponible": true }
      ],
      "etapes": ["string"],
      "conseil_nutritionnel": "string",
      "pourquoi_adapte": "string (1 courte phrase expliquant pourquoi ce plat est adapté au profil)"
    }
  ],
  "resume_nutritionnel": {
    "calories_cible": number,
    "proteines_cible": number,
    "adaptation_profil": "string"
  }
}`;
}

const SYSTEM_PROMPT = `Tu es un chef cuisinier et nutritionniste expert spécialisé dans la nutrition sportive et le rééquilibrage alimentaire. Tu génères des recettes STRICTEMENT personnalisées en français selon le programme nutritionnel, le profil corporel et le type de repas.

RÈGLES ABSOLUES :
1. Recettes RADICALEMENT différentes selon le programme :
   - Prise de masse → surplus calorique, beaucoup de protéines ET glucides, portions généreuses, ingrédients denses.
   - Sèche → protéines élevées, glucides bas, lipides modérés, faible densité calorique, beaucoup de légumes.
   - Perte de poids → déficit calorique, fibres élevées, peu de graisses saturées, aliments rassasiants peu caloriques.
   - Maintien → macros équilibrées 40/30/30 (glucides/protéines/lipides), varié.
2. Recettes DIFFÉRENTES selon le type de repas :
   - petit-dejeuner → JAMAIS de viande rouge, jamais de plats du soir, toujours des ingrédients matinaux.
   - dejeuner → plat complet avec source de protéines + féculents + légumes.
   - diner → JAMAIS de glucides lourds, privilégier légumes et protéines maigres.
3. Les 3 recettes doivent être TOUTES DIFFÉRENTES entre elles : ingrédient principal différent, famille de plats différente, mode de cuisson différent.
4. Calibrer les calories selon le TDEE fourni (petit-dejeuner ×0.25, dejeuner ×0.40, diner ×0.30). Sinon valeurs standards (2000 kcal/jour).
5. Utiliser EN PRIORITÉ les ingrédients disponibles. Marquer disponible=false pour les ingrédients à acheter.

Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.`;

export const generateRecipes = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ingredients: z.array(z.string()).min(1),
      program: z.string(),
      lang: langField,
      mealType: MealEnum,
      bodyProfile: BodyProfileSchema,
      recentTitles: z.array(z.string()).optional().default([]),
    }),
  )
  .handler(async ({ data }) => {
    const target = targetCalories(data.bodyProfile?.tdee, data.mealType);

    async function runOnce(retryHint: string): Promise<RichRecipe[]> {
      const text = await callAI({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: buildUserPrompt(
              data.program,
              data.mealType,
              data.ingredients,
              data.bodyProfile,
              data.recentTitles ?? [],
              retryHint,
            ),
          },
        ],
      });
      const parsed = extractJSON<{ recettes: unknown[] }>(text);
      return (parsed.recettes ?? [])
        .map((r) => {
          try {
            return RichRecipeSchema.parse(r);
          } catch {
            return null;
          }
        })
        .filter((r): r is RichRecipe => r !== null);
    }

    let list = await runOnce("");
    if (!validateDiversity(list, target)) {
      const retryHint = `\nLa génération précédente n'était pas assez variée ou hors cible calorique.
Vise précisément ~${target} kcal par recette (tolérance ±20 %). Force 3 ingrédients principaux différents et 3 modes de cuisson différents.`;
      try {
        const retry = await runOnce(retryHint);
        if (retry.length >= 3) list = retry;
      } catch {
        // keep first attempt
      }
    }

    const recettes = list.slice(0, 3).map((r) => ({
      titre: r.titre,
      description: r.description,
      calories: r.calories,
      proteines: r.proteines,
      glucides: r.glucides,
      lipides: r.lipides,
      fibres: r.fibres,
      indexGlycemique: r.indexGlycemique,
      temps: r.temps,
      difficulte: r.difficulte,
      ingredients: r.ingredients.map((i) =>
        i.quantite ? `${i.quantite} ${i.nom}` : i.nom,
      ),
      ingredientsDetail: r.ingredients,
      etapes: r.etapes,
      conseilNutritionnel: r.conseil_nutritionnel,
      pourquoiAdapte: r.pourquoi_adapte,
    }));

    return { recettes };
  });

export const extractIngredients = createServerFn({ method: "POST" })
  .inputValidator(z.object({ text: z.string().min(1).max(2000), lang: langField }))
  .handler(async ({ data }) => {
    const lang = langName(data.lang);
    const text = await callAI({
      messages: [
        {
          role: "system",
          content: `Extract food ingredients from spoken text. Always respond entirely in ${lang}. All recipe names, ingredient names, instructions and labels must be in ${lang}. Reply ONLY with valid JSON.`,
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
          content: `Identify food ingredients visible in an image of a fridge or pantry. Always respond entirely in ${lang}. All recipe names, ingredient names, instructions and labels must be in ${lang}. Reply ONLY with valid JSON.`,
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
          content: `You are an expert nutritionist. Plan balanced weeks of meals. Only 4 programs exist: Prise de masse, Sèche, Perte de poids, Maintien. Always respond entirely in ${lang}. All recipe names, ingredient names, instructions and labels must be in ${lang}. Reply ONLY with valid JSON.`,
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
          content: `Consolidate ingredient lists into a shopping list grouped by category. Always respond entirely in ${lang}. All recipe names, ingredient names, instructions and labels must be in ${lang}. Reply ONLY with valid JSON.`,
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
          content: `You simulate a community feed for a cooking & nutrition app. Generate realistic recipes with fake French users. Always respond entirely in ${lang}. All recipe names, ingredient names, instructions and labels must be in ${lang}. Reply ONLY with valid JSON, no markdown.`,
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
          content: `You are an expert nutritionist. Always respond entirely in ${lang}. All recipe names, ingredient names, instructions and labels must be in ${lang}. Reply ONLY with valid JSON.`,
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
