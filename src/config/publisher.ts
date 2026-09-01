/**
 * Identité légale de l'éditeur du site — source unique.
 *
 * Ces informations sont une obligation d'affichage : un examinateur (organisme
 * de paiement, autorité, place de marché) doit pouvoir rattacher qayed.tn à une
 * personne morale identifiable, en texte lisible, sans se connecter. Elles sont
 * donc figées ICI, dans le dépôt, et non dans le CMS : une page éditable en
 * base peut être vidée par erreur, un déploiement ne la répare pas.
 *
 * Trois consommateurs, une seule vérité :
 *   - la ligne de pied de page de toutes les pages publiques ;
 *   - la page /mentions-legales (bloc « Éditeur ») ;
 *   - le JSON-LD Organization de index.html.
 *
 * Le JSON-LD statique d'index.html est volontairement DUPLIQUÉ à la main plutôt
 * qu'importé : le <head> est servi avant tout JavaScript, c'est ce qui le rend
 * lisible par les robots qui n'exécutent pas de script. Toute modification ici
 * doit être reportée dans index.html — le test `publisher.test.ts` échoue si les
 * deux divergent.
 */

export const PUBLISHER = {
  /** Raison sociale exacte, telle qu'immatriculée. Jamais dans une image. */
  legalName: 'SOCIETE UW AGENCY',
  /** Forme juridique. */
  legalForm: 'SUARL',
  /** Identifiant unique au Registre National des Entreprises. */
  rne: '1715656S',
  address: {
    street: '02 Rue Abdallah El Mahdi, Carthage Byrsa',
    postalCode: '2016',
    locality: 'Carthage',
    country: 'Tunisie',
    /** Code pays ISO 3166-1 alpha-2, pour le JSON-LD. */
    countryCode: 'TN',
  },
  email: 'contact@qayed.tn',
  phone: '+216 93 116 000',
  /** Directeur de la publication. */
  publicationDirector: 'Hichem Mathlouthi',
  siteUrl: 'https://qayed.tn',
  brand: 'Qayed',
} as const;

/** Adresse postale sur une ligne : « 02 Rue …, 2016 Carthage, Tunisie ». */
export const publisherAddressLine = (): string =>
  `${PUBLISHER.address.street}, ${PUBLISHER.address.postalCode} ${PUBLISHER.address.locality}, ${PUBLISHER.address.country}`;

type Lang = 'fr' | 'en' | 'ar';

/** « édité par » — le verbe qui rattache le site à la personne morale. */
const EDITED_BY: Record<Lang, string> = {
  fr: 'est édité par',
  en: 'is published by',
  ar: 'تصدرها',
};

/**
 * Ligne d'éditeur du pied de page, en une phrase.
 *
 * Format identique dans les trois langues — raison sociale, forme, RNE, siège —
 * pour qu'un examinateur retrouve les mêmes repères quelle que soit la langue
 * dans laquelle il ouvre le site.
 */
export const publisherFooterLine = (lang: string): string => {
  const l: Lang = lang === 'en' || lang === 'ar' ? lang : 'fr';
  return `${PUBLISHER.brand} ${EDITED_BY[l]} ${PUBLISHER.legalName} (${PUBLISHER.legalForm}) — RNE ${PUBLISHER.rne} — ${publisherAddressLine()}`;
};

/**
 * Nœud schema.org Organization de l'éditeur.
 *
 * `@id` stable : les autres nœuds du graphe (WebSite, SoftwareApplication) s'y
 * réfèrent au lieu de redéclarer l'organisation. Aucune donnée personnelle
 * au-delà des coordonnées de contact de la société.
 */
export const ORGANIZATION_LD: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${PUBLISHER.siteUrl}/#organization`,
  name: PUBLISHER.brand,
  legalName: PUBLISHER.legalName,
  url: PUBLISHER.siteUrl,
  logo: `${PUBLISHER.siteUrl}/icon-512.png`,
  email: PUBLISHER.email,
  telephone: PUBLISHER.phone,
  address: {
    '@type': 'PostalAddress',
    streetAddress: PUBLISHER.address.street,
    addressLocality: PUBLISHER.address.locality,
    postalCode: PUBLISHER.address.postalCode,
    addressCountry: PUBLISHER.address.countryCode,
  },
};
