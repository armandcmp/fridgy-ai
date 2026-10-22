## Fridgy — sécuriser les comptes et terminer les abonnements

### Règles retenues
- Un seul Fridgy Pro : **3,89 €/mois ou 35,88 €/an, TVA incluse** ; comparaison annuelle barrée : 46,68 €.
- **7 jours d’essai, une seule fois**, démarrés à la souscription Stripe (plus de compte à rebours local).
- Sans Pro : **une génération gratuite tous les trois jours** (72 h entre deux générations réussies). Pro : illimité.
- Passage mensuel ↔ annuel **à la prochaine échéance**, sans facturation intermédiaire ni nouvel essai.
- Annuler : accès conservé jusqu’à l’échéance. Supprimer le compte : annulation immédiate et effacement des données personnelles ; pièces comptables obligatoires conservées chez Stripe.
- FR/EN, sans emojis, sans refonte visuelle.

### 1. Comptes et confidentialité
- Retirer l’ancien système de comptes enregistrés sur l’appareil (mots de passe réversibles, reconnexion automatique).
- Séparer les données par compte (profil corporel, recettes, favoris, historique, planning, listes) et les synchroniser dans le cloud.
- Vider l’indication Pro et ignorer les réponses retardées à la déconnexion ou au changement de compte.
- Signaler les sauvegardes échouées ; export complet ; distinguer « remise à zéro » et « supprimer mon compte ».
- Liens de réinitialisation expirés gérés ; réactiver la confirmation d’e-mail à l’inscription.

### 2. Accès et essai fiables
- Connexion et droits vérifiés côté serveur avant chaque appel IA et dictée.
- Quota de 72 h enregistré côté serveur, non consommé en cas d’échec, avec prochaine disponibilité affichée.
- Pro uniquement depuis les abonnements enregistrés par Stripe ; suppression de la valeur Pro modifiable du profil.
- Rafraîchir l’accès au retour du paiement, à la reprise de l’app et à l’échéance ; bandeau en cas de paiement refusé.

### 3. Paiement et formules
- Prix Stripe remplacés en TVA incluse (mêmes identifiants).
- Bloquer les doubles abonnements ; essai unique garanti ; association compte/client Stripe protégée ; adresses de retour vérifiées.
- Page de retour : succès, attente, échec ou expiration avec reprise — plus d’attente infinie.
- Espace client Stripe configuré (factures, carte, annulation), accessible même sans Pro.
- Changement de formule programmé à l’échéance, visible et annulable.
- Prise en charge fiscale conservée (+3,5 %, libellé bancaire `LINK.COM*`).

### 4. Renouvellements et suppression
- Événements Stripe : erreurs renvoyées pour nouvelle livraison, doublons/retards sans effet, état réconcilié avec Stripe.
- Suppression : confirmation, annulation vérifiée, puis effacement ; si l’annulation échoue, rien n’est supprimé.

### 5. Langues et contrôles
- Écrans de compte, essai, paiement et erreurs traduits en FR/EN.
- Tests : prix, essai unique de 7 jours, quota 72 h, doubles clics, isolation des comptes, renouvellement, annulation, changement différé, suppression.

### Détails techniques
- Stripe via `createStripeClient` (passerelle), `ui_mode: embedded_page`, fonctions serveur `requireSupabaseAuth`.
- Nouvelles tables (usage, données utilisateur, événements traités) avec RLS par propriétaire et GRANT explicites ; écritures d’abonnement réservées au webhook signé.
- Changement différé via subscription schedule Stripe ; `tax_behavior: inclusive` sur les nouveaux prix.

### Tests dans l’aperçu
1. FR puis EN ; créer un compte, remplir le profil, se reconnecter.
2. Fridgy Pro en mode test, carte **4242 4242 4242 4242**, date future, CVC à 3 chiffres.
3. Mensuel et annuel (comptes distincts) : montant TTC, 7 jours d’essai, Pro actif après rechargement.
4. Double clic : un seul abonnement ; nouvelle souscription : pas de second essai.
5. Refus **4000 0000 0000 0002**, authentification **4000 0025 0000 3155**.
6. Espace client : factures, annulation, changement à l’échéance.
7. Compte A → déconnexion → compte B : aucune donnée de A visible ; supprimer un compte test.

### À ta charge
L’encaissement réel attend la revendication du compte Stripe, sa vérification et l’installation de Lovable sur le compte réel.