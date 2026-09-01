import type { CmsLang } from '@/api/cms';
import { PUBLISHER, publisherAddressLine } from '@/config/publisher';

/**
 * Texte des mentions légales, en données pures.
 *
 * Séparé du composant pour une raison précise : c'est le contenu qui engage,
 * pas le rendu. Sous cette forme il se relit en revue, et se vérifie par un
 * test sans DOM (`mentionsLegalesContent.test.ts`) — la suite du dépôt tourne
 * en environnement `node`, sans outillage de rendu.
 */

export interface LegalSection {
  title: string;
  text: string;
}

export interface LegalContent {
  pageTitle: string;
  metaTitle: string;
  metaDescription: string;
  sections: LegalSection[];
}

/** Libellés du bloc « Éditeur », dans l'ordre d'affichage. */
interface PublisherLabels {
  legalName: string;
  legalForm: string;
  rne: string;
  address: string;
  email: string;
  phone: string;
  director: string;
  website: string;
}

/**
 * Bloc « Éditeur » : les champs exigés, dans le même ordre quelle que soit la
 * langue, pour qu'un examinateur retrouve les mêmes repères. Les valeurs
 * viennent toutes de PUBLISHER — aucune n'est recopiée ici.
 */
const publisherBlock = (l: PublisherLabels): string => [
  `${l.legalName} : ${PUBLISHER.legalName}`,
  `${l.legalForm} : ${PUBLISHER.legalForm}`,
  `${l.rne} : ${PUBLISHER.rne}`,
  `${l.address} : ${publisherAddressLine()}`,
  `${l.email} : ${PUBLISHER.email}`,
  `${l.phone} : ${PUBLISHER.phone}`,
  `${l.director} : ${PUBLISHER.publicationDirector}`,
  `${l.website} : ${PUBLISHER.siteUrl}`,
].join('\n\n');

export const MENTIONS_LEGALES: Record<CmsLang, LegalContent> = {
  fr: {
    pageTitle: 'Mentions légales',
    metaTitle: 'Mentions légales — Qayed',
    metaDescription: `Mentions légales de la plateforme Qayed, éditée par ${PUBLISHER.legalName} (${PUBLISHER.legalForm}), RNE ${PUBLISHER.rne}.`,
    sections: [
      {
        title: 'Éditeur',
        text: publisherBlock({
          legalName: 'Raison sociale',
          legalForm: 'Forme juridique',
          rne: 'Identifiant unique (RNE)',
          address: 'Siège social',
          email: 'Contact',
          phone: 'Téléphone',
          director: 'Directeur de la publication',
          website: 'Site web',
        }),
      },
      {
        title: 'Hébergement',
        text: 'Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com).\n\nLes services applicatifs et les données sont hébergés par Railway Corp. (railway.com).',
      },
      {
        title: 'Propriété intellectuelle',
        text: `Tous les contenus du site (textes, vidéos, supports, marques, logos, design) sont protégés par le droit de la propriété intellectuelle.\n\nToute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, est strictement interdite sans autorisation écrite préalable de ${PUBLISHER.legalName} (${PUBLISHER.legalForm}).`,
      },
    ],
  },
  en: {
    pageTitle: 'Legal notice',
    metaTitle: 'Legal notice — Qayed',
    metaDescription: `Legal notice of the Qayed platform, published by ${PUBLISHER.legalName} (${PUBLISHER.legalForm}), RNE ${PUBLISHER.rne}.`,
    sections: [
      {
        title: 'Publisher',
        text: publisherBlock({
          legalName: 'Company name',
          legalForm: 'Legal form',
          rne: 'Unique identifier (RNE)',
          address: 'Registered office',
          email: 'Contact',
          phone: 'Phone',
          director: 'Publication director',
          website: 'Website',
        }),
      },
      {
        title: 'Hosting',
        text: 'The website is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA (vercel.com).\n\nApplication services and data are hosted by Railway Corp. (railway.com).',
      },
      {
        title: 'Intellectual property',
        text: `All content on this site (texts, videos, materials, trademarks, logos, design) is protected by intellectual property law.\n\nAny reproduction, representation, modification, publication or adaptation, in whole or in part, is strictly prohibited without the prior written authorisation of ${PUBLISHER.legalName} (${PUBLISHER.legalForm}).`,
      },
    ],
  },
  ar: {
    pageTitle: 'إشعار قانوني',
    metaTitle: 'إشعار قانوني — قيد',
    metaDescription: `الإشعار القانوني لمنصة قيد، الصادرة عن ${PUBLISHER.legalName} (${PUBLISHER.legalForm})، معرّف السجل الوطني للمؤسسات ${PUBLISHER.rne}.`,
    sections: [
      {
        title: 'الناشر',
        text: publisherBlock({
          legalName: 'الاسم الاجتماعي',
          legalForm: 'الشكل القانوني',
          rne: 'المعرّف الوحيد (السجل الوطني للمؤسسات)',
          address: 'المقر الاجتماعي',
          email: 'الاتصال',
          phone: 'الهاتف',
          director: 'مدير النشر',
          website: 'الموقع الإلكتروني',
        }),
      },
      {
        title: 'الاستضافة',
        text: 'يُستضاف الموقع لدى Vercel Inc.، 440 N Barranca Ave #4133, Covina, CA 91723، الولايات المتحدة (vercel.com).\n\nتُستضاف الخدمات التطبيقية والبيانات لدى Railway Corp. (railway.com).',
      },
      {
        title: 'الملكية الفكرية',
        text: `جميع محتويات الموقع (نصوص، فيديوهات، دعائم، علامات تجارية، شعارات، تصميم) محمية بقانون الملكية الفكرية.\n\nيُمنع منعًا باتًا أي نسخ أو عرض أو تعديل أو نشر أو اقتباس، كليًا أو جزئيًا، دون إذن كتابي مسبق من ${PUBLISHER.legalName} (${PUBLISHER.legalForm}).`,
      },
    ],
  },
};
