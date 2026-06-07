## FridgeChef V5 — Auth, Images, Nav, Home

Large multi-feature update. I'll implement it in five coordinated changes, preserving all V1–V4 behavior.

### 1. Account system (localStorage-only)
- New types: `Account`, `CurrentUser` in `src/lib/types.ts`.
- New `src/lib/auth.ts`: helpers for `fridgechef_accounts`, `fridgechef_session_user`, `btoa` password hashing, avatar color from id, login/register/logout, migration from legacy `fridgechef_user`.
- Onboarding flow becomes: Language → Auth (register/login toggle) → Program selection. Remove the old name-only screen. Register screen has prénom/email/password/confirm with inline blur validation, eye toggle. Login screen has email/password, "forgot password" toast, switch link.
- Session check in `src/routes/index.tsx` (and elsewhere reading user) prefers `fridgechef_session_user`, falls back to migrated legacy user; routes to `/onboarding` if missing, or program step if no program.
- `storage.getUser()` updated to read session user (with legacy migration) so existing screens keep working without rewrites.

### 2. Recipe images everywhere
- Update existing `src/components/RecipeImage.tsx`:
  - `getRecipeImageUrl(titre, width, height)` with the exact normalization shown.
  - Skeleton pulse while loading, fade-in 400ms, error → program gradient + 🍽 emoji.
  - Subtle dark vignette overlay at the bottom 50%.
- `RecipeCard` uses image 180px top, rounded `16px 16px 0 0`.
- `recette.$id.tsx` hero: 280px image with dark gradient overlay, white title + description over image, white back/share/heart buttons.
- Community cards: 160px. Favorites/recent on home: 120px.

### 3. Navigation refactor
- `BottomNav` tabs: Accueil, Recettes, ➕ (center), Planning, Paramètres. Removes Communauté + Stats from nav. Active state: green icon, green label, small green dot under icon.
- Center ➕ unchanged (bottom sheet → photo / voice / manual → `/frigo?mode=…`).

### 4. New `/recettes` screen + global recipe store
- New localStorage key `fridgechef_all_recipes` (cap 50, dedupe by titre, newest first). `storage.addAllRecipes(recipes[])` helper called from every place we currently call `storage.setRecipes` (Claude generation paths in `frigo.tsx`, `communaute.tsx` "try recipe", etc.).
- `src/routes/recettes.tsx` rewritten: title, search bar, filter pills (Toutes / 4 programs / Favoris), vertical list of cards with images and heart toggle, empty state with "Scanner mon frigo →" opening the same bottom sheet (reuse pattern from BottomNav or just link to `/frigo?mode=photo`).

### 5. Home screen redesign + Community full-screen
- `src/routes/index.tsx` rebuilt with sections in order: header (avatar circle with initials + colored bg, greeting, program pill, date), Aujourd'hui card (green if meal logged, dashed gray if not), Communauté row (3 cards, "Voir tout →" → `/communaute`), Mes favoris row, Récemment générées row (last 5 from `fridgechef_all_recipes`), Mon suivi rapide card (only if ≥3 history entries).
- `/communaute` stays as a full-screen route (already exists) — add a back arrow + title + refresh button header; remove from BottomNav.
- One-time migration banner on home for legacy users prompting account creation.

### Files to add/edit
- Add: `src/lib/auth.ts`, `src/components/Avatar.tsx` (initials circle).
- Edit: `src/lib/types.ts`, `src/lib/storage.ts`, `src/lib/ai.functions.ts` (no logic change — just ensure we persist via new helper at call sites), `src/components/RecipeImage.tsx`, `src/components/RecipeCard.tsx`, `src/components/BottomNav.tsx`, `src/routes/onboarding.tsx`, `src/routes/index.tsx`, `src/routes/recettes.tsx`, `src/routes/recette.$id.tsx`, `src/routes/communaute.tsx`, `src/routes/parametres.tsx` (logout + confirm dialog), `src/routes/frigo.tsx` (call `storage.addAllRecipes` after generation), `src/locales/*.json` (new keys for auth, nav.recipes, home sections, sheet, etc.).

### Out of scope (per spec)
Language screen, program selection, FridgeScreen logic, Claude API calls/parsing, shopping list, recipe detail content (only hero), planning, history, freemium, group, existing i18n setup.

### Hydration fix (incidental)
Current preview shows raw `nav.planning` text — translation keys are missing in `fr.json`. I'll add missing nav/sheet keys while updating locales so the hydration mismatch resolves.
