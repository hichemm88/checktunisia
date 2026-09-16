import { useMemo } from 'react';
import { SiteChrome } from '@/cms/SiteChrome';

/**
 * Doc développeurs de l'API publique v1 + widget embarqué (§7).
 *
 * Page maintenue à la main (pas un rendu OpenAPI interactif type Swagger UI —
 * choix délibéré pour ne pas ajouter de dépendance lourde à l'app principale
 * pour un seul écran, voir API-V1-DECISIONS.md). Le contrat détaillé complet
 * reste dans backend/docs/api/openapi.yaml, servi tel quel et lié ci-dessous
 * pour import direct dans Postman/Insomnia ou un générateur de client.
 */

const backendOrigin = () => {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
  try {
    return new URL(apiUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
};

const ENDPOINTS: { method: string; path: string; desc: string }[] = [
  { method: 'POST', path: '/v1/establishment-links', desc: 'Échange un code de liaison contre un accès à un établissement.' },
  { method: 'GET', path: '/v1/establishments', desc: 'Liste les établissements liés à cette clé, avec leur quota.' },
  { method: 'POST', path: '/v1/fiche-sessions', desc: 'Crée (ou réutilise) une session de fiche pour une réservation.' },
  { method: 'GET', path: '/v1/fiche-sessions/{session_id}', desc: 'Statut d\'une session (pending / submitted / expired).' },
  { method: 'GET', path: '/v1/fiches/{fiche_id}', desc: 'Détail d\'une fiche soumise.' },
];

const ERROR_CODES: { code: string; status: number; desc: string }[] = [
  { code: 'invalid_api_key', status: 401, desc: 'Clé API invalide ou révoquée.' },
  { code: 'invalid_link_code', status: 422, desc: 'Code de liaison invalide.' },
  { code: 'link_code_expired', status: 422, desc: 'Code de liaison expiré (validité 24h).' },
  { code: 'link_code_already_used', status: 422, desc: 'Code de liaison déjà utilisé.' },
  { code: 'establishment_not_linked', status: 403, desc: 'Établissement non lié à ce partenaire.' },
  { code: 'api_access_disabled', status: 403, desc: 'Accès API non activé pour cet établissement.' },
  { code: 'quota_exceeded', status: 422, desc: 'Réservé — non utilisé en v1 (le quota de fiches n\'est jamais bloquant).' },
  { code: 'session_expired', status: 410, desc: 'Session ou lien de widget expiré / déjà utilisé.' },
  { code: 'session_not_found', status: 404, desc: 'Session introuvable.' },
  { code: 'fiche_not_found', status: 404, desc: 'Fiche introuvable.' },
  { code: 'invalid_signature', status: 401, desc: 'Jeton de widget invalide.' },
  { code: 'rate_limited', status: 429, desc: 'Trop de requêtes.' },
  { code: 'validation_error', status: 422, desc: 'Erreur de validation des champs envoyés.' },
];

const CodeBlock = ({ children }: { children: string }) => (
  <pre className="rounded-xl bg-qayed-encre text-white/90 text-xs p-4 overflow-x-auto"><code>{children}</code></pre>
);

export const DocsApiPage = () => {
  const origin = useMemo(backendOrigin, []);

  return (
    <SiteChrome>
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-10">
        <header>
          <h1 className="font-display text-3xl font-bold text-qayed-encre">API publique Qayed v1</h1>
          <p className="mt-2 text-qayed-fiche">
            Créez et soumettez des fiches de police depuis votre logiciel, sans jamais dupliquer le formulaire
            réglementaire hors de Qayed — sur le modèle Stripe Checkout : votre backend crée une session, un widget
            embarqué (le vrai formulaire Qayed) fait le travail, un webhook vous notifie du résultat.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a className="text-qayed-cachet underline" href={`${origin}/v1/openapi.yaml`}>Spec OpenAPI 3.1</a>
            <a className="text-qayed-cachet underline" href={`${origin}/docs/snippets/widget-integration.html`}>Snippet d'intégration du widget</a>
            <a className="text-qayed-cachet underline" href={`${origin}/v1/examples/verify-webhook.js`}>Exemple Node.js (webhooks)</a>
            <a className="text-qayed-cachet underline" href={`${origin}/v1/examples/verify-webhook.php`}>Exemple PHP (webhooks)</a>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-qayed-encre">Démarrage rapide (mode test)</h2>
          <ol className="list-decimal list-inside space-y-4 text-sm text-qayed-encre">
            <li>
              <strong>Liaison</strong> — l'établissement génère un code de liaison depuis son dashboard Qayed
              (Paramètres → Intégrations), valable 24h et à usage unique. Échangez-le contre un accès :
              <CodeBlock>{`curl -X POST ${origin}/v1/establishment-links \\
  -H "Authorization: Bearer qyd_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"link_code": "ABCD1234EF"}'`}</CodeBlock>
            </li>
            <li>
              <strong>Session</strong> — à chaque arrivée, créez une session de fiche :
              <CodeBlock>{`curl -X POST ${origin}/v1/fiche-sessions \\
  -H "Authorization: Bearer qyd_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "establishment_id": "<establishment_id>",
    "booking_ref": "BOOKING-XYZ-123",
    "arrival_date": "2026-09-20",
    "departure_date": "2026-09-23",
    "room": "204",
    "guests": [],
    "metadata": {}
  }'`}</CodeBlock>
              Un second appel avec le même <code>booking_ref</code> pendant que la session est encore ouverte renvoie
              la même session (200, pas 201) — un double clic ne crée jamais de doublon.
            </li>
            <li>
              <strong>Widget</strong> — ouvrez <code>widget_url</code> dans une iframe (voir le snippet d'intégration
              ci-dessus). Le réceptionniste y retrouve le vrai formulaire Qayed, pré-rempli, et peut ajouter/retirer
              des voyageurs avant de soumettre.
            </li>
            <li>
              <strong>Webhook</strong> — configurez une URL de webhook depuis le panel admin Qayed (côté partenaire).
              À la soumission, vous recevez <code>fiche.submitted</code>, signé (voir la section Webhooks ci-dessous).
            </li>
          </ol>
          <p className="text-sm text-qayed-fiche">
            En mode test (clé <code>qyd_test_...</code>) : aucune fiche n'est transmise à l'autorité et aucun quota
            n'est décompté — isolation complète, idéal pour développer votre intégration.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-qayed-encre">Authentification</h2>
          <p className="text-sm text-qayed-encre">
            Toutes les requêtes portent l'en-tête <code>Authorization: Bearer qyd_live_...</code> (production) ou{' '}
            <code>qyd_test_...</code> (test). Les clés sont émises depuis le panel admin Qayed et ne s'affichent en
            clair qu'à leur création — conservez-les côté serveur uniquement, jamais dans du code exécuté dans un
            navigateur.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-qayed-encre">Référence des endpoints</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {ENDPOINTS.map((e) => (
                  <tr key={e.path + e.method} className="border-b border-qayed-ligne">
                    <td className="py-2 pe-3 font-mono text-xs font-bold text-qayed-cachet whitespace-nowrap">{e.method}</td>
                    <td className="py-2 pe-3 font-mono text-xs whitespace-nowrap">{e.path}</td>
                    <td className="py-2 text-qayed-fiche">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-qayed-fiche">Détail complet des schémas de requête/réponse : voir la spec OpenAPI.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-qayed-encre">Webhooks</h2>
          <p className="text-sm text-qayed-encre">
            Événements : <code>fiche.submitted</code>, <code>fiche.failed</code>, <code>session.expired</code>.
            Chaque livraison porte l'en-tête <code>Qayed-Signature: t=&#123;timestamp&#125;,v1=&#123;hex&#125;</code>, où{' '}
            <code>hex = HMAC-SHA256(secret, "&#123;timestamp&#125;.&#123;corps brut&#125;")</code>. Vérifiez la
            signature ET que <code>timestamp</code> n'a pas plus de 5 minutes avant de traiter le corps — voir les
            exemples Node et PHP en haut de page. Répondez 2xx pour accuser réception ; tout le reste est retenté
            (au moins 5 tentatives sur 24h).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-qayed-encre">Codes d'erreur</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {ERROR_CODES.map((e) => (
                  <tr key={e.code} className="border-b border-qayed-ligne">
                    <td className="py-2 pe-3 font-mono text-xs whitespace-nowrap">{e.code}</td>
                    <td className="py-2 pe-3 text-xs text-qayed-fiche whitespace-nowrap">{e.status}</td>
                    <td className="py-2 text-qayed-fiche">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-qayed-fiche">
            Format d'erreur uniforme : <code>&#123;"error":&#123;"code","message","doc_url"&#125;&#125;</code>.
          </p>
        </section>
      </div>
    </SiteChrome>
  );
};
