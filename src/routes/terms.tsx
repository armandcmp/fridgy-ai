import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — Fridgy" },
      {
        name: "description",
        content:
          "Conditions générales d'utilisation de Fridgy : compte, abonnements, essai gratuit, paiement, résiliation.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="px-5 pb-24 pt-10">
      <Link to="/auth" className="text-[12.5px] font-semibold text-primary">
        ← Retour
      </Link>
      <h1 className="mt-4 text-[26px] font-extrabold tracking-tight" style={{ color: "#0F172A" }}>
        Conditions d'utilisation
      </h1>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Dernière mise à jour : 30 juin 2026
      </p>

      <div className="mt-6 space-y-5 text-[14px] leading-relaxed text-foreground">
        <Section title="1. Acceptation">
          En créant un compte, vous acceptez ces conditions et notre politique de confidentialité.
        </Section>

        <Section title="2. Le service">
          Fridgy est un assistant culinaire qui génère des recettes à partir des ingrédients que
          vous déclarez. Les suggestions sont indicatives et ne constituent pas un avis médical
          ou diététique. Vérifiez toujours allergies, dates de péremption et cuissons.
        </Section>

        <Section title="3. Compte">
          Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité
          sur votre compte. Un seul compte par personne.
        </Section>

        <Section title="4. Abonnement Fridgy Pro">
          <ul className="ml-5 list-disc space-y-1">
            <li>Essai gratuit de 14 jours, sans engagement.</li>
            <li>Mensuel : 3,89 €/mois — Annuel : 35,88 €/an (au lieu de 46,68 €).</li>
            <li>
              Renouvellement automatique à la fin de chaque période, sauf résiliation au moins
              24 h avant l'échéance.
            </li>
            <li>
              Résiliation à tout moment dans Paramètres → Abonnement. L'accès Pro reste actif
              jusqu'à la fin de la période payée.
            </li>
            <li>Aucun remboursement au prorata, sauf obligation légale.</li>
          </ul>
        </Section>

        <Section title="5. Usage acceptable">
          Pas d'usage frauduleux, de revente, de scraping ni de tentative de contourner les
          limites du plan gratuit.
        </Section>

        <Section title="6. Propriété intellectuelle">
          L'application, son code, son design et sa marque restent la propriété de Fridgy. Les
          recettes générées sont libres d'usage personnel.
        </Section>

        <Section title="7. Limitation de responsabilité">
          Fridgy est fourni « en l'état ». Nous ne garantissons pas l'exactitude nutritionnelle
          absolue des recettes et déclinons toute responsabilité en cas d'allergie ou incident
          alimentaire lié à un mauvais usage.
        </Section>

        <Section title="8. Résiliation">
          Vous pouvez supprimer votre compte à tout moment. Nous pouvons suspendre un compte en
          cas de violation de ces conditions.
        </Section>

        <Section title="9. Droit applicable">
          Droit français. Tout litige est soumis aux tribunaux compétents, sans préjudice des
          droits du consommateur.
        </Section>

        <Section title="10. Contact">
          <strong>support@fridgy.app</strong>
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
