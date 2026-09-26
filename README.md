# Mon Frigo Malin

this builds on top of my existing FridgeChef V1 project.Upgrade FridgeChef with a full V2 memory and personalization 

system. This builds on top of the existing MVP (V1) without 

breaking any existing screen or feature.

All data is stored in localStorage (no backend, no auth).

All content is in French.

---

## WHAT TO BUILD — 6 NEW FEATURES

1. Meal history (historique des repas)

2. Smart fridge memory (frigo intelligent)

3. Weekly nutrition tracking (suivi nutritionnel)

4. Voice input (dictée vocale)

5. Favorite recipes (recettes favorites)

6. Weekly meal planner (planning semaine)

---

## FEATURE 1 — Historique des repas

### Where

New tab "Historique" accessible from the bottom navigation bar.

### Data structure

Each time the user taps "J'ai cuisiné cette recette ✅" 

on a recipe detail screen, save this to localStorage 

"fridgechef_history" (array):

{

  id: string (timestamp),

  date: string (ISO),

  recette: {

    titre: string,

    calories: number,

    proteines: number,

    glucides: number,

    lipides: number,

    program: string

  }

}

### UI — Historique screen

Header:

- Title: "Mon historique"

- Subtitle: "[N] repas cette semaine"

Weekly summary card at top:

- Light green banner

- "Cette semaine : [N] repas · [X] kcal moy/jour"

- Mini progress bar showing consistency 

  (days with a logged meal = filled dot, 

   days without = empty dot, 7 dots total)

Meal list:

- Grouped by date (today, hier, + date for older)

- Each meal row:

  - Recipe title (bold)

  - Program badge (colored pill)

  - Calories (right-aligned, gray)

  - Macros in small: P:[x]g G:[x]g L:[x]g

  - Small trash icon to delete the entry

Empty state:

- Illustration placeholder (simple plate emoji, large)

- Text: "Aucun repas enregistré"

- Subtext: "Cuisinez une recette et appuyez sur 

  'J'ai cuisiné cette recette' pour la retrouver ici"

### Add to RecipeDetail screen

Add a new button in the sticky footer of RecipeDetailScreen:

- "✅ J'ai cuisiné cette recette"

- Outlined green button

- On tap: saves meal to history + shows toast:

  "Repas ajouté à votre historique 🎉"

---

## FEATURE 2 — Frigo intelligent

### Logic

Every time the user confirms ingredients 

(from photo or manual), save them to:

localStorage "fridgechef_memory" :

{

  ingredients: [

    {

      nom: string,

      count: number,     // how many times seen

      lastSeen: string   // ISO date

    }

  ]

}

### Auto-suggest on FridgeScreen

When the user opens the ingredient input screen:

- Show a new section above the manual input:

  "🧠 Vos habitudes"

  Subtitle: "Ingrédients que vous avez souvent"

- Display top 6 most frequent ingredients 

  as tappable chips (sorted by count desc)

- Each chip: ingredient name + small "+" icon

- On tap: ingredient is added directly to the 

  current session list (same as manual add)

- Small label under the section: 

  "Basé sur vos [N] dernières sessions"

### Update logic

On every session confirmation:

- Loop through confirmed ingredients

- If ingredient exists in memory → increment count, 

  update lastSeen

- If new → add with count: 1

- Keep only top 20 ingredients in memory 

  (remove least frequent when > 20)

---

## FEATURE 3 — Suivi nutritionnel hebdomadaire

### Where

New "Stats" tab in bottom navigation.

### Data source

Read from localStorage "fridgechef_history"

Filter entries from the last 7 days.

### UI — Stats screen

Header:

- Title: "Mon suivi"

- Week range subtitle: "Du [date] au [date]"

Section 1 — Weekly overview card:

4 metric boxes in 2x2 grid:

- 🍽 Repas : [N] cette semaine

- 🔥 Calories moy : [X] kcal/jour

- 💪 Protéines moy : [X]g/jour

- ⚖️ Objectif : [program name]

Section 2 — Daily calories bar chart:

- 7 vertical bars (Mon → Sun)

- Each bar height proportional to total calories that day

- Bar color: green if data exists, light gray if no meal logged

- Day label below each bar (L M M J V S D)

- Horizontal dashed line showing the average

- No external chart library — build with pure CSS/SVG bars

Section 3 — Macro breakdown (this week average):

- Same horizontal 3-segment bar as recipe detail screen

  (Protéines blue / Glucides amber / Lipides red)

- Values below: P:[x]g · G:[x]g · L:[x]g (weekly averages)

- Title: "Répartition macros (moyenne)"

Section 4 — Program consistency:

- Title: "Cohérence avec votre objectif"

- A simple score out of 10 (large, bold, green)

- Calculated as: 

  (days with at least 1 meal / 7) * 10, rounded

- Motivational message below the score:

  10   → "Semaine parfaite 🏆"

  7-9  → "Très bonne semaine 💪"

  4-6  → "Peut mieux faire 📈"

  1-3  → "Allez, on repart ! 🔥"

  0    → "Commencez à cuisiner ! 👨‍🍳"

Empty state (no history yet):

- Text: "Cuisinez vos premières recettes 

   pour voir vos statistiques apparaître ici"

---

## FEATURE 4 — Dictée vocale

### Where

Add a third method card on FridgeScreen 

alongside Photo and Manual input.

### UI

New card:

- Icon: microphone

- Label: "Dicter mes ingrédients"

- Sublabel: "Parlez et l'app détecte vos ingrédients"

On tap → starts recording:

- Card border turns red (recording state)

- Animated red dot (pulsing CSS)

- Text: "À vous... parlez maintenant"

- Tap again → stops recording

### Implementation using Web Speech API:

```javascript

function startVoiceRecognition(onResult, onError) {

  const SpeechRecognition = 

    window.SpeechRecognition || 

    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    onError('non_supporté');

    return;

  }

  const recognition = new SpeechRecognition();

  recognition.lang = 'fr-FR';

  recognition.continuous = false;

  recognition.interimResults = false;

  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {

    const transcript = 

      event.results[0][0].transcript;

    onResult(transcript);

  };

  recognition.onerror = (event) => {

    onError(event.error);

  };

  recognition.start();

  return recognition;

}

```

### After recording:

Send the transcript to Claude API to extract ingredients:

SYSTEM PROMPT:

"Tu extrais des ingrédients alimentaires depuis 

un texte parlé en français. Tu réponds UNIQUEMENT 

en JSON valide."

USER PROMPT:

"Extrait tous les ingrédients alimentaires de ce 

texte : '[transcript]'

Réponds avec ce JSON :

{ 'ingredients': string[] }"

Then display extracted ingredients as chips 

(same UI as photo analysis results).

If Web Speech API not supported:

Show a small info card:

"🎤 La dictée vocale n'est pas supportée 

sur ce navigateur. Utilisez Chrome ou Safari."

---

## FEATURE 5 — Recettes favorites

### Data structure

localStorage "fridgechef_favorites" : Recipe[]

(same Recipe object structure as V1)

### Add to RecipeCard (recipe list screen)

- Add a heart icon (♡) top right of each recipe card

- On tap: toggles favorite state

- Filled heart (♥) = saved, red color #EF4444

- Empty heart (♡) = not saved, gray

- Small animation on tap (scale up 1.3 → 1.0, 200ms)

- Toast: "Recette sauvegardée ❤️" or "Recette retirée"

### Add to RecipeDetail screen

- Same heart icon in the hero banner (top right, 

  next to share icon)

- White heart icon on colored banner background

### New "Favoris" section on home screen

On the main home screen, add a section:

"❤️ Mes recettes favorites"

- Horizontal scrollable row of small recipe cards

- Each mini card: title + calories + program badge

- On tap: opens RecipeDetail directly

- Empty state: "Aucun favori pour l'instant. 

  Ajoutez des recettes en tapant le ♡"

---

## FEATURE 6 — Planning semaine

### Where

New "Planning" tab in bottom navigation.

### UI — Planning screen

Header:

- Title: "Mon planning"

- Subtitle: "Semaine du [date au date]"

- Button top right: "✨ Générer la semaine" 

7 day rows (Lundi → Dimanche):

Each day row contains:

- Day name + date (bold, 15px)

- If meal planned: 

  Recipe card inline (title + calories + program badge)

  Small trash icon to remove

- If no meal planned:

  Dashed placeholder box: "+ Ajouter un repas"

  On tap: opens a bottom sheet to pick from:

    a) Recent recipes (from history)

    b) Favorites

    c) "Générer une recette pour ce jour"

### "Générer la semaine" button

Calls Claude API with:

SYSTEM PROMPT:

"Tu es un nutritionniste expert. Tu planifies des 

semaines de repas équilibrées en français. 

Tu réponds UNIQUEMENT en JSON valide."

USER PROMPT:

"Programme : [program]

Génère un planning de 7 repas variés (1 par jour) 

adaptés à ce programme.

Ingrédients habituels disponibles : [top 6 from memory]

Réponds avec ce JSON :

{

  'planning': [

    {

      'jour': string,

      'recette': {

        'titre': string,

        'calories': number,

        'proteines': number,

        'glucides': number,

        'lipides': number,

        'temps': string,

        'difficulte': string,

        'description': string

      }

    }

  ]

}"

Show loading state while generating.

On success: populate all 7 days at once with animation

(staggered fade-in, 80ms between each day)

### Shopping list from planning

Below the 7 day rows:

Button: "🛒 Liste de courses de la semaine"

→ Calls Claude API with all 7 planned recipes

→ Generates a consolidated shopping list

→ Navigates to ShoppingListScreen with this data

### Data structure

localStorage "fridgechef_planning":

{

  weekStart: string (ISO Monday date),

  days: [

    {

      jour: string,

      recette: Recipe | null

    }

  ]

}

---

## BOTTOM NAVIGATION BAR

Add a persistent bottom navigation bar 

visible on all main screens:

5 tabs:

- 🏠 Accueil    → Home screen

- 🍽 Recettes   → last generated recipe list

- 📅 Planning   → weekly planner

- 📊 Stats      → nutrition tracking

- 🕘 Historique → meal history

Design:

- White background, thin top border

- Active tab: green icon + green label (#4CAF82)

- Inactive tab: gray icon + gray label (#9CA3AF)

- Icon size: 22px

- Label size: 10px below icon

- Height: 64px

- Safe area padding for mobile 

  (padding-bottom: env(safe-area-inset-bottom))

---

## UPDATED HOME SCREEN

Redesign the home screen to be a real dashboard:

Header:

- "Bonjour [name] 👋"

- Program badge: "Programme : [program]"

- Date: today's date in French

Section 1 — Quick action cards (2 columns):

- "📷 Scanner mon frigo" → FridgeScreen

- "📅 Voir mon planning" → PlanningScreen

Section 2 — Today's stats (if history exists):

- "Aujourd'hui : [X] kcal · [X]g protéines"

- Small green progress bar vs daily goal

Section 3 — Favorites (horizontal scroll)

Section 4 — Last generated recipes (if exists)

---

## TECHNICAL REQUIREMENTS

- All new features use localStorage only (no backend)

- All API calls use the same pattern as V1:

  fetch('https://api.anthropic.com/v1/messages')

  No API key in code (handled by platform)

  Model: claude-sonnet-4-20250514

  Always try/catch + JSON cleanup before parse

- New localStorage keys:

  "fridgechef_history"  : MealEntry[]

  "fridgechef_memory"   : IngredientMemory

  "fridgechef_favorites": Recipe[]

  "fridgechef_planning" : WeekPlanning

- Do NOT break or modify:

  "fridgechef_user"    (onboarding data)

  "fridgechef_session" (current ingredients)

  "fridgechef_recipes" (last generated recipes)

- All existing screens (V1) must remain functional

---

## DESIGN REQUIREMENTS

- Same design system throughout:

  Background: #FAFAF8

  Primary: #4CAF82

  Cards: white, border-radius 16px

  Shadow: 0 4px 20px rgba(0,0,0,0.08)

- Bottom nav always visible (position: fixed, bottom: 0)

- All screens have padding-bottom: 80px 

  to avoid content hidden behind bottom nav

- Staggered animations on list items 

  (80-100ms delay between items)

- Skeleton loaders on any async content

---

## WHAT NOT TO DO

- No backend, no database, no authentication

- No push notifications (V3)

- No social features (V3)

- No dark mode

- No external chart libraries

- Do not remove or break any V1 feature

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fridgy-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cdc3c7ec-7959-4dd8-b678-57acbe7e8e1f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
