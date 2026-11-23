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

/**
 * Hôte public de l'API et du widget. Jamais https://qayed.tn : il redirige
 * (308) vers le site vitrine, qui ne sert aucune route d'API. En dev, on
 * pointe sur le backend local pour que les liens restent cliquables.
 */
const PUBLIC_API_ORIGIN = 'https://api.qayed.tn';

const backendOrigin = () => {
  if (!import.meta.env.DEV) return PUBLIC_API_ORIGIN;
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
  { method: 'GET', path: '/v1/operators', desc: 'Utilisateurs actifs des hébergeurs liés (id, name, role ; jamais d\'e-mail ni de téléphone) — pour relier vos comptes aux comptes Qayed et envoyer operator.user_id.' },
  { method: 'GET', path: '/v1/establishments/{hotel_id}/rooms', desc: 'Chambres réelles de l\'établissement — pour construire votre table de correspondance et envoyer room_id.' },
  { method: 'POST', path: '/v1/fiche-sessions', desc: 'Crée (ou réutilise) une session de fiche pour une réservation.' },
  { method: 'GET', path: '/v1/fiche-sessions/by-booking-ref', desc: 'Retrouve la dernière session connue sans avoir gardé le session_id.' },
  { method: 'GET', path: '/v1/fiche-sessions/{session_id}', desc: 'Statut d\'une session (pending / submitted / expired), avec guest_count et expected_guest_count.' },
  { method: 'GET', path: '/v1/fiches', desc: 'Fiches validées d\'un établissement lié, saisies via l\'API ou directement dans Qayed (source), paginées par curseur ; filtres arrival_from, arrival_to, updated_since. Aucun numéro de document ni date de naissance.' },
  { method: 'GET', path: '/v1/fiches/{fiche_id}', desc: 'Détail d\'une fiche soumise, avec son séjour (arrival_date, departure_date, checked_out_at, room_id, stay_status), son delivery_status et guests (prénom et nom de chaque voyageur, rien d\'autre).' },
  { method: 'PATCH', path: '/v1/fiches/{fiche_id}', desc: 'Prolongation, départ anticipé ou changement de chambre (departure_date, room_id, room), sans widget ; booking_ref rattache une fiche saisie dans Qayed à votre réservation.' },
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
          <p className="mt-1 text-xs text-qayed-fiche">
            Version 1.2.0 — hôte <code>{PUBLIC_API_ORIGIN}</code> (API et widget). N'utilisez pas{' '}
            <code>https://qayed.tn</code>, qui redirige vers le site vitrine et ne sert aucune API.
          </p>
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
    "room_id": "<room_id>",
    "guests": [],
    "metadata": {},
    "operator": { "user_id": "<user_id de GET /v1/operators>", "name": "Sami" },
    "locale": "fr"
  }'`}</CodeBlock>
              Un second appel avec le même <code>booking_ref</code> pendant que la session est encore ouverte renvoie
              la même session (200, pas 201) — un double clic ne crée jamais de doublon.
              <ul className="mt-2 list-disc list-inside space-y-1 text-qayed-fiche">
                <li>
                  <code>operator</code> et <code>locale</code> (<code>fr</code> par défaut, <code>ar</code>,{' '}
                  <code>en</code>) sont optionnels. Si <code>operator.user_id</code> désigne un utilisateur actif du
                  même hébergeur, la fiche lui est attribuée exactement comme s'il l'avait saisie dans Qayed
                  (historique, journal d'audit, statistiques) et la réponse porte <code>operator_matched: true</code>.
                  Sinon (absent, inconnu, désactivé, autre hébergeur, mal formé) : jamais d'erreur, repli sur
                  l'utilisateur d'intégration, <code>operator.name</code> conservé dans le journal d'audit,{' '}
                  <code>operator_matched: false</code>. Un compte désactivé avant la soumission retombe aussi sur
                  l'utilisateur d'intégration.
                </li>
                <li>
                  Un <code>room_id</code> dont la chambre a encore un séjour ouvert n'est jamais refusé : ce séjour est
                  clos (à sa date de départ prévue si elle est passée, sinon à la date du jour) et la session est
                  créée.
                </li>
              </ul>
            </li>
            <li>
              <strong>Widget</strong> — ouvrez <code>widget_url</code> dans une iframe (voir le snippet d'intégration
              ci-dessus), avec <code>allow="camera"</code>. Le widget s'ouvre directement sur le scan du premier
              voyageur, avec un bandeau pré-rempli (dates, chambre, noms), un seul bouton principal par écran et un
              compteur « 2 sur 3 ». La validation partielle est permise (« Valider avec 2 voyageurs sur 3 ») : pour
              compléter plus tard, recréez une session pour le même <code>booking_ref</code> (mode{' '}
              <code>amend</code>, toujours la même fiche).
            </li>
            <li>
              <strong>Webhook</strong> — configurez une URL de webhook depuis le panel admin Qayed (côté partenaire).
              À la soumission, vous recevez <code>fiche.submitted</code>, signé (voir la section Webhooks ci-dessous).
            </li>
          </ol>
          <p className="text-sm text-qayed-fiche">
            En mode test (clé <code>qyd_test_...</code>) : aucune fiche n'est transmise à l'autorité et aucun quota
            n'est décompté — isolation complète, idéal pour développer votre intégration. Le webhook{' '}
            <code>fiche.submitted</code> n'est <strong>pas</strong> envoyé en mode test : validez votre intégration de
            bout en bout en relisant le statut avec <code>GET /v1/fiche-sessions/&#123;session_id&#125;</code> ou{' '}
            <code>GET /v1/fiche-sessions/by-booking-ref</code>, qui renvoient <code>guest_count</code> (voyageurs
            effectivement déclarés ; 0 tant que la fiche est un brouillon) et <code>expected_guest_count</code>{' '}
            (voyageurs passés à la création, minimum 1), en test comme en live.
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
          <h2 className="font-display text-xl font-bold text-qayed-encre">Séjours et départs automatiques</h2>
          <p className="text-sm text-qayed-encre">
            Votre logiciel est la source de vérité des séjours créés via l'API. Pour une prolongation, un départ
            anticipé ou un changement de chambre, sans widget :
          </p>
          <CodeBlock>{`curl -X PATCH ${origin}/v1/fiches/<fiche_id> \\
  -H "Authorization: Bearer qyd_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"departure_date": "2026-09-25", "room_id": "<room_id>"}'`}</CodeBlock>
          <ul className="list-disc list-inside space-y-1 text-sm text-qayed-fiche">
            <li>
              Champs : <code>departure_date</code>, <code>room_id</code> (issu de{' '}
              <code>GET /v1/establishments/&#123;id&#125;/rooms</code>), <code>room</code> (libellé, peut être{' '}
              <code>null</code>). <code>422 validation_error</code> si le corps est vide, si{' '}
              <code>departure_date</code> précède l'arrivée ou si <code>room_id</code> est inconnu ;{' '}
              <code>404 fiche_not_found</code> pour une fiche non créée par vous.
            </li>
            <li>
              Un changement de chambre clôt tout séjour encore ouvert dans la chambre cible. Prolonger jusqu'à
              aujourd'hui ou plus tard un séjour déjà clos automatiquement le rouvre. Chaque modification est tracée
              dans le journal d'audit.
            </li>
            <li>
              La réponse est celle de <code>GET /v1/fiches/&#123;fiche_id&#125;</code> : <code>arrival_date</code>,{' '}
              <code>departure_date</code>, <code>checked_out_at</code> (date ou <code>null</code>),{' '}
              <code>room_id</code>, <code>stay_status</code> (<code>draft</code>, <code>active</code>,{' '}
              <code>completed</code>, <code>cancelled</code>).
            </li>
          </ul>
          <p className="text-sm text-qayed-encre">
            Chaque jour à 05:30 (heure de Tunis), les séjours créés via l'API dont la date de départ prévue est atteinte
            sont clos à cette date, avec exactement les effets d'un départ saisi dans Qayed (journal d'audit,
            notification au manager ; rien n'est envoyé à l'autorité, aucun quota). Les séjours saisis dans Qayed ne
            sont pas concernés. L'occupation d'une chambre étant dérivée des séjours ouverts, elle reste occupée si un
            autre séjour y est ouvert. Une nouvelle fiche le jour J sur une chambre dont le séjour précédent se termine
            le jour J ou avant n'est jamais refusée ni retardée. Tenez donc <code>departure_date</code> exacte avec{' '}
            <code>PATCH</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-qayed-encre">Rattacher une fiche saisie dans Qayed</h2>
          <p className="text-sm text-qayed-encre">
            Une fiche saisie directement dans Qayed (<code>source: "qayed"</code> dans <code>GET /v1/fiches</code>) et
            sans référence de réservation peut être rattachée à votre réservation, pour ne jamais en créer une seconde :
          </p>
          <CodeBlock>{`curl -X PATCH ${origin}/v1/fiches/<fiche_id> \\
  -H "Authorization: Bearer qyd_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"booking_ref": "RES-2026-0042"}'`}</CodeBlock>
          <ul className="list-disc list-inside space-y-1 text-sm text-qayed-fiche">
            <li>
              Ensuite, <code>POST /v1/fiche-sessions</code> avec ce <code>booking_ref</code> rouvre cette fiche en mode{' '}
              <code>amend</code> (complément) au lieu d'en créer une nouvelle. La fiche garde <code>source: "qayed"</code>{' '}
              et devient lisible par <code>GET /v1/fiches/&#123;fiche_id&#125;</code>.
            </li>
            <li>
              <code>409 booking_ref_conflict</code> si une autre fiche du même établissement porte déjà ce{' '}
              <code>booking_ref</code> ; <code>409 booking_ref_already_set</code> si la fiche a déjà une autre
              référence (rejouer la même valeur est sans effet) ; <code>404 fiche_not_found</code> pour un brouillon, une
              fiche d'un établissement non lié ou déjà rattachée à un autre partenaire.
            </li>
            <li>Clé live uniquement : une clé de test ne voit pas les fiches réelles.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-qayed-encre">Messages du widget (postMessage)</h2>
          <p className="text-sm text-qayed-encre">
            Le widget envoie à la fenêtre parente <code>qayed:submitted</code>{' '}
            <code>&#123;type, session_id, fiche_id, guest_count&#125;</code>, <code>qayed:closed</code>{' '}
            <code>&#123;type, session_id&#125;</code> et <code>qayed:error</code> <code>&#123;type, code&#125;</code>.
            Ils sont émis avec <code>targetOrigin '*'</code> : vérifiez toujours{' '}
            <code>event.origin === '{PUBLIC_API_ORIGIN}'</code> (le plus sûr : <code>new URL(widget_url).origin</code>).
            Ce sont des signaux d'interface ; la source de vérité est le webhook signé (live) ou le{' '}
            <code>GET</code> du statut de session (test et live).
          </p>
          <CodeBlock>{`const QAYED_ORIGIN = new URL(widgetUrl).origin; // ${PUBLIC_API_ORIGIN}
window.addEventListener('message', (event) => {
  if (event.origin !== QAYED_ORIGIN) return;
  if (event.data?.type === 'qayed:submitted') { /* rafraîchir l'UI */ }
});`}</CodeBlock>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-qayed-encre">Webhooks</h2>
          <p className="text-sm text-qayed-encre">
            Événements : <code>fiche.submitted</code>, <code>fiche.failed</code>, <code>session.expired</code>,{' '}
            <code>fiche.delivered</code> et <code>fiche.delivery_failed</code> (1.2.0 : envoi de la fiche à l'autorité
            abouti ou en échec définitif ; live uniquement, une seule fois par fiche, sans donnée personnelle).
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

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-qayed-encre">Nouveautés 1.2.0</h2>
          <p className="text-sm text-qayed-fiche">Ajouts uniquement, aucun changement incompatible :</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-qayed-encre">
            <li><code>GET /v1/fiches</code> : liste des fiches d'un établissement lié, saisies via votre intégration ou directement dans Qayed, paginée par curseur (<code>next_cursor</code>, <code>has_more</code>). Brouillons exclus ; une clé test ne voit que ses fiches de test.</li>
            <li><code>delivery_status</code> (<code>sent</code>, <code>pending</code>, <code>failed</code>, <code>not_applicable</code>) sur les fiches et les sessions : <code>failed</code> dès qu'un envoi est en échec définitif, sinon <code>pending</code> tant qu'un envoi est en cours, sinon <code>sent</code>.</li>
            <li>Webhooks <code>fiche.delivered</code> et <code>fiche.delivery_failed</code> (un endpoint existant doit y être abonné : demandez-le à Qayed).</li>
            <li><code>GET /v1/fiches/&#123;fiche_id&#125;</code> renvoie <code>guests</code> : <code>first_name</code> et <code>last_name</code> de chaque voyageur déclaré (principal en tête), aucune autre donnée.</li>
            <li><code>PATCH /v1/fiches/&#123;fiche_id&#125;</code> accepte <code>booking_ref</code> pour rattacher une fiche saisie dans Qayed ; <code>POST /v1/fiche-sessions</code> la rouvre alors en complément.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-qayed-encre">Nouveautés 1.1.0</h2>
          <p className="text-sm text-qayed-fiche">Ajouts optionnels uniquement, aucun changement incompatible :</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-qayed-encre">
            <li>Hôte corrigé : <code>{PUBLIC_API_ORIGIN}</code> pour l'API, <code>widget_url</code> et l'origine des messages <code>postMessage</code>.</li>
            <li><code>GET /v1/operators</code> : utilisateurs des hébergeurs liés, pour relier vos comptes aux comptes Qayed.</li>
            <li><code>POST /v1/fiche-sessions</code> : champs optionnels <code>operator</code> et <code>locale</code>, réponse <code>operator_matched</code> ; un <code>room_id</code> dont la chambre est occupée n'est plus jamais refusé.</li>
            <li><code>GET /v1/fiche-sessions/…</code> : <code>guest_count</code> et <code>expected_guest_count</code>, en test comme en live.</li>
            <li><code>PATCH /v1/fiches/&#123;fiche_id&#125;</code> ; <code>GET /v1/fiches/&#123;fiche_id&#125;</code> renvoie le séjour.</li>
            <li>Départs automatiques quotidiens (05:30, heure de Tunis) des séjours créés via l'API.</li>
            <li>Widget : ouverture directe sur le scan, compteur de voyageurs, validation partielle complétée plus tard en mode <code>amend</code>, messages <code>postMessage</code> documentés.</li>
          </ul>
        </section>
      </div>
    </SiteChrome>
  );
};
