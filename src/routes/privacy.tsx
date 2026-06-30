import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Fridgy" },
      {
        name: "description",
        content:
          "Politique de confidentialité de Fridgy : données collectées, finalités, conservation, droits RGPD et contact.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="px-5 pb-24 pt-10">
      <Link to="/auth" className="text-[12.5px] font-semibold text-primary">
        ← Retour
      </Link>
      <h1 className="mt-4 text-[26px] font-extrabold tracking-tight" style={{ color: "#0F172A" }}>
        Politique de confidentialité
      </h1>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Dernière mise à jour : 30 juin 2026
      </p>

      <div className="prose mt-6 space-y-5 text-[14px] leading-relaxed text-foreground">
        <Section title="1. Responsable du traitement">
          Fridgy (« nous ») exploite l'application Fridgy. Pour toute question relative à vos
          données personnelles, contactez : <strong>support@fridgy.app</strong>.
        </Section>

        <Section title="2. Données que nous collectons">
          <ul className="ml-5 list-disc space-y-1">
            <li>Compte : prénom, email, mot de passe (chiffré).</li>
            <li>Profil corporel (facultatif) : âge, sexe, taille, poids, niveau d'activité.</li>
            <li>Préférences alimentaires, programme nutritionnel et objectifs.</li>
            <li>Historique des recettes générées, planning, listes de courses et favoris.</li>
            <li>
              Données techniques : journal d'erreurs, identifiant d'appareil (notifications push).
            </li>
          </ul>
        </Section>

        <Section title="3. Caméra et microphone">
          L'accès à la <strong>caméra</strong> (scan du frigo) et au <strong>microphone</strong>{" "}
          (dictée vocale) n'est demandé qu'au moment où vous utilisez ces fonctions. Les flux
          audio/vidéo sont envoyés à notre service d'IA pour reconnaissance, puis{" "}
          <strong>immédiatement supprimés</strong>. Aucun enregistrement n'est conservé.
        </Section>

        <Section title="4. Finalités">
          Génération de recettes personnalisées, suivi nutritionnel, synchronisation multi-appareils,
          notifications, support client et amélioration du service.
        </Section>

        <Section title="5. Base légale (RGPD)">
          Exécution du contrat (compte, recettes), consentement (notifications, micro, caméra),
          intérêt légitime (sécurité et amélioration).
        </Section>

        <Section title="6. Sous-traitants">
          <ul className="ml-5 list-disc space-y-1">
            <li>Hébergement & base de données : Supabase (UE).</li>
            <li>IA : Anthropic, OpenAI (transcription, vision).</li>
            <li>Notifications push : OneSignal.</li>
          </ul>
        </Section>

        <Section title="7. Conservation">
          Vos données sont conservées tant que votre compte est actif. Vous pouvez le supprimer
          à tout moment depuis Paramètres → Réinitialiser, ou nous écrire.
        </Section>

        <Section title="8. Vos droits">
          Accès, rectification, effacement, portabilité, opposition, retrait du consentement.
          Écrivez-nous à <strong>support@fridgy.app</strong>. Vous pouvez également déposer une
          réclamation auprès de la CNIL.
        </Section>

        <Section title="9. Mineurs">
          Fridgy n'est pas destiné aux moins de 13 ans.
        </Section>

        <Section title="10. Modifications">
          Cette politique peut évoluer. Vous serez informé en cas de changement substantiel.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[15px] font-extrabold" style={{ color: "#0F172A" }}>
        {title}
      </h2>
      <div className="mt-1 text-[13.5px] text-muted-foreground">{children}</div>
    </section>
  );
}
