# FridgeChef V3 — Plan d'implémentation

Construit par-dessus V1 + V2 sans rien casser. Tout en localStorage, IA via Lovable AI Gateway (pas de Stripe réel, pas de push réel, pas de backend).

## 1. i18n (Feature 1)

- `bun add i18next react-i18next`
- `src/locales/{fr,en,es,pt,zh}.json` — toutes les clés UI (home, onboarding, recettes, planning, stats, historique, frigo, courses, communauté, paramètres, paywall, notifs, groupe)
- `src/lib/i18n.ts` — init i18next, langue lue depuis `localStorage["fridgechef_lang"]` (défaut `fr`), `changeLanguage` réécrit la clé
- Importer `i18n.ts` dans `src/router.tsx` (avant rendu)
- Refactor de TOUS les composants existants : remplacer les strings en dur par `t('clef')`
- Ajout `language` aux `system` prompts dans `src/lib/ai.functions.ts` (paramètre passé depuis le client)

## 2. Partage social (Feature 2)

- `src/lib/share.ts` :
  - `buildRecipeCardPng(recipe, premium)` : canvas 375x500, dégradé selon programme, titre, 3 macros, watermark si non premium, QR placeholder
  - `shareRecipe(recipe)` : Web Share API niveau fichiers + fallback download
  - `whatsappShoppingList(categories)` : message Markdown WhatsApp + `wa.me/?text=`
- Bouton "Partager" dans `recette.$id.tsx` + dans `courses.tsx`
- Nouvelle route `src/routes/communaute.tsx` :
  - Nouvelle server fn `generateCommunityFeed(program, lang)` dans `ai.functions.ts`
  - 6 cartes (auteur, likes, programme, macros), bouton refresh, bouton "Essayer cette recette" qui appelle `generateRecipes` avec le titre comme contexte et redirige vers la page recette

## 3. Freemium (Feature 3)

- `src/lib/types.ts` : `UsageData`, `GroupData`, `NotifSettings`
- `src/lib/storage.ts` : helpers `getUsage()` (reset si date≠aujourd'hui), `incrementUsage(kind)`, `isPremium()`, `setPremium(bool)`
- `src/lib/useGate.ts` : hook `useGate(feature: 'recipes'|'shopping'|'planning'|'history')` → `{ allowed, remaining, showPaywall }`
- `src/components/Paywall.tsx` : Drawer (`vaul`) avec bandeau dégradé, bénéfices, pricing mensuel/annuel, CTA "Essai 7 jours" → toast "Paiement bientôt disponible 🚀"
- Brancher gate dans `recettes.tsx`, `courses.tsx`, `planning.tsx`, `historique.tsx`, `stats.tsx`
- Badge couronne dorée dans `index.tsx` à côté du nom

## 4. Notifications (Feature 4)

- `src/lib/notifications.ts` :
  - `requestPermissionFlow()` — modal custom puis `Notification.requestPermission()`
  - `scheduleMealReminder(hhmm)`, `scheduleWeeklyReminder()`, `maybeStreakNotification()`
  - `setTimeout` au mount + persistance des prefs dans `fridgechef_notif`
- Modal de demande au premier mount post-onboarding (`src/routes/__root.tsx` ou `index.tsx`), réaffiché dans 3 jours si reporté
- Réglages dans Paramètres : toggles + time picker (`<input type="time">`)

## 5. Courses en ligne (Feature 5)

- Dans `courses.tsx` :
  - Section "🛒 Commander en ligne" — 3 boutons Leclerc/Carrefour/Amazon
  - Bottom sheet (`Drawer`) : titre, liste plate, bouton "Copier" + "Ouvrir [Retailer]" (`window.open`)
- Format plat : `poulet, tomates, riz, ...` consolidé depuis toutes les catégories

## 6. Comptes liés / frigo partagé (Feature 6)

- `src/lib/storage.ts` : helpers groupe (`createGroup`, `joinGroup`, `leaveGroup`, `exportGroup`, `importGroup`)
- Création : code 6 caractères alphanumériques, rôle `owner`
- Rejoindre : input 6 chars, rôle `member`
- Section Mon groupe dans Paramètres : affichage code + copy, membres, bouton "Synchroniser" (génère JSON + copie / parse JSON collé), bouton quitter

## 7. Settings + nouvelle nav (transverse)

- Nouvelle route `src/routes/parametres.tsx` avec sections :
  - Mon profil (nom éditable, programme, avatar = initiales + couleur)
  - Préférences (langue, notifs, unités métrique/impérial via `fridgechef_units`)
  - Mon groupe
  - Abonnement (plan actuel, upgrade ou "[Dev] Activer Premium")
  - Données (effacer historique, reset app, exporter JSON)
  - À propos (3.0.0, mailto, liens placeholders)
- `BottomNav.tsx` : nouveaux onglets Accueil / Recettes / Communauté / Stats / Paramètres
- Sur Accueil et Stats : actions rapides vers Planning et Historique (préservés)
- Icône engrenage en haut à droite de `index.tsx` aussi

## 8. Sécurité non-régression

- Aucune suppression de clés localStorage V1/V2
- Toutes les routes existantes (`/recettes`, `/planning`, `/historique`, `/frigo`, `/recette/$id`, `/courses`, `/onboarding`) restent fonctionnelles
- Les server fns existantes conservent leur signature, on AJOUTE un champ optionnel `lang`

## Détails techniques

- Pas de lib externe pour QR / charts / push / paiement
- Canvas natif pour partage image
- Drawer existant (`vaul`) pour paywall + retailer sheet
- i18next sans suspense, init synchrone avec ressources inlined
- Hook `useGate` retourne aussi un `consume()` à appeler après succès de génération
- Reset usage : comparer `data.date` à `new Date().toISOString().slice(0,10)`

## Ce qui ne sera PAS fait

- Pas de Stripe / paiement réel (toast placeholder)
- Pas de vraies push notifications (Web Notifications API seulement)
- Pas de sync temps réel (export/import JSON manuel)
- Pas de backend
- Pas de dark mode

Estimation : ~15 nouveaux fichiers + édits sur ~10 existants. Je procède dès approbation.
