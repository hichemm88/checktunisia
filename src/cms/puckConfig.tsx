import type { Config } from '@measured/puck';
import {
  HeroBlock, HeroProps,
  TrustBarBlock, TrustBarProps,
  StatsBarBlock, StatsBarProps,
  SectionHeadingBlock, SectionHeadingProps,
  RichTextBlock, RichTextProps,
  ImageBlock, ImageProps,
  FeaturesGridBlock, FeaturesGridProps,
  StepsBlock, StepsProps,
  FicheShowcaseBlock, FicheShowcaseProps,
  SecurityBlock, SecurityProps,
  PricingBlock, PricingBlockProps,
  TestimonialsBlock, TestimonialsProps,
  FaqBlock, FaqProps,
  CtaBandBlock, CtaBandProps,
  MockupBlock, MockupProps,
  ProseBlock, ProseProps,
  SpacerBlock,
} from './blocks';
import { MOCKUP_CHOICES } from './mockups';

const backgroundField = {
  type: 'radio' as const,
  options: [
    { label: 'Fond papier', value: 'default' },
    { label: 'Fond alterné', value: 'alt' },
  ],
};

type Props = {
  Hero: HeroProps;
  TrustBar: TrustBarProps;
  StatsBar: StatsBarProps;
  SectionHeading: SectionHeadingProps;
  RichText: RichTextProps;
  Image: ImageProps;
  FeaturesGrid: FeaturesGridProps;
  Steps: StepsProps;
  FicheShowcase: FicheShowcaseProps;
  Security: SecurityProps;
  Pricing: PricingBlockProps;
  Testimonials: TestimonialsProps;
  Faq: FaqProps;
  CtaBand: CtaBandProps;
  Mockup: MockupProps;
  Prose: ProseProps;
  Spacer: { height: number };
};

/**
 * Catalogue de blocs du builder Puck — les libellés de champs sont en
 * français (l'admin est francophone) ; le CONTENU saisi est par langue,
 * géré au niveau de la page (un arbre Puck par langue).
 */
export const puckConfig: Config<Props> = {
  components: {
    Hero: {
      label: 'Hero (en-tête de page)',
      fields: {
        eyebrow: { type: 'text', label: 'Sur-titre' },
        titleLines: {
          type: 'array', label: 'Lignes du titre',
          arrayFields: {
            text: { type: 'text', label: 'Texte' },
            accent: { type: 'radio', label: 'Style', options: [{ label: 'Normal', value: false }, { label: 'Accentué (italique)', value: true }] },
          },
          defaultItemProps: { text: '', accent: false },
        },
        arabicLine: { type: 'text', label: 'Ligne en arabe (optionnel)' },
        description: { type: 'textarea', label: 'Description' },
        primaryLabel: { type: 'text', label: 'Bouton principal — libellé' },
        primaryHref: { type: 'text', label: 'Bouton principal — lien' },
        secondaryLabel: { type: 'text', label: 'Bouton secondaire — libellé' },
        secondaryHref: { type: 'text', label: 'Bouton secondaire — lien' },
        mockup: {
          type: 'select', label: 'Visuel',
          options: [{ label: 'Aucun', value: 'none' }, ...MOCKUP_CHOICES.map((m) => ({ label: m.label, value: m.value }))],
        },
      },
      defaultProps: {
        eyebrow: '', titleLines: [{ text: 'Titre', accent: false }], description: '',
        primaryLabel: 'Essayer gratuitement', primaryHref: '/register',
        secondaryLabel: '', secondaryHref: '', mockup: 'none', showWave: false,
      },
      render: HeroBlock,
    },
    TrustBar: {
      label: 'Bande de confiance',
      fields: {
        items: {
          type: 'array', label: 'Éléments',
          arrayFields: { text: { type: 'text', label: 'Texte' } },
          defaultItemProps: { text: '' },
          getItemSummary: (item) => item.text || 'Élément',
        },
      },
      defaultProps: { items: [] },
      render: TrustBarBlock,
    },
    StatsBar: {
      label: 'Bandeau de chiffres',
      fields: {
        items: {
          type: 'array', label: 'Chiffres',
          arrayFields: {
            num: { type: 'text', label: 'Chiffre' },
            sup: { type: 'text', label: 'Exposant (ex. s)' },
            label: { type: 'text', label: 'Libellé' },
          },
          defaultItemProps: { num: '', sup: '', label: '' },
          getItemSummary: (item) => item.num || 'Chiffre',
        },
        background: { ...backgroundField, label: 'Fond' },
      },
      defaultProps: { items: [], background: 'default' },
      render: StatsBarBlock,
    },
    SectionHeading: {
      label: 'Titre de section',
      fields: {
        anchor: { type: 'text', label: 'Ancre (ex. tarifs)' },
        eyebrow: { type: 'text', label: 'Sur-titre' },
        title: { type: 'text', label: 'Titre' },
        lead: { type: 'textarea', label: 'Chapeau' },
        centered: { type: 'radio', label: 'Alignement', options: [{ label: 'Gauche', value: false }, { label: 'Centré', value: true }] },
        background: { ...backgroundField, label: 'Fond' },
      },
      defaultProps: { anchor: '', eyebrow: '', title: 'Titre de section', lead: '', centered: false, background: 'default' },
      render: SectionHeadingBlock,
    },
    RichText: {
      label: 'Texte',
      fields: {
        text: { type: 'textarea', label: 'Texte (paragraphe vide = saut)' },
        centered: { type: 'radio', label: 'Alignement', options: [{ label: 'Gauche', value: false }, { label: 'Centré', value: true }] },
        background: { ...backgroundField, label: 'Fond' },
      },
      defaultProps: { text: '', centered: false, background: 'default' },
      render: RichTextBlock,
    },
    Image: {
      label: 'Image',
      fields: {
        url: { type: 'text', label: 'URL (bibliothèque de médias)' },
        alt: { type: 'text', label: 'Texte alternatif' },
        maxWidth: { type: 'number', label: 'Largeur max (px)' },
        background: { ...backgroundField, label: 'Fond' },
      },
      defaultProps: { url: '', alt: '', maxWidth: 800, background: 'default' },
      render: ImageBlock,
    },
    FeaturesGrid: {
      label: 'Grille de cartes',
      fields: {
        items: {
          type: 'array', label: 'Cartes',
          arrayFields: {
            emoji: { type: 'text', label: 'Emoji / icône' },
            title: { type: 'text', label: 'Titre' },
            text: { type: 'textarea', label: 'Texte' },
          },
          defaultItemProps: { emoji: '✓', title: '', text: '' },
          getItemSummary: (item) => item.title || 'Carte',
        },
        variant: {
          type: 'radio', label: 'Style',
          options: [{ label: 'Fonctionnalités (6 compactes)', value: 'feature' }, { label: 'Audience (3 grandes)', value: 'audience' }],
        },
        note: { type: 'textarea', label: 'Note en bas (avec bouclier, optionnel)' },
        background: { ...backgroundField, label: 'Fond' },
      },
      defaultProps: { items: [], variant: 'feature', note: '', background: 'default' },
      render: FeaturesGridBlock,
    },
    FicheShowcase: {
      label: 'Vitrine fiche (texte + visuel)',
      fields: {
        eyebrow: { type: 'text', label: 'Sur-titre' },
        title: { type: 'text', label: 'Titre' },
        text: { type: 'textarea', label: 'Paragraphes (ligne vide = saut)' },
        background: { ...backgroundField, label: 'Fond' },
      },
      defaultProps: { eyebrow: '', title: '', text: '', background: 'default' },
      render: FicheShowcaseBlock,
    },
    Security: {
      label: 'Conformité & sécurité (sombre)',
      fields: {
        anchor: { type: 'text', label: 'Ancre (ex. securite)' },
        eyebrow: { type: 'text', label: 'Sur-titre' },
        title: { type: 'textarea', label: 'Titre (retour ligne possible)' },
        lead: { type: 'textarea', label: 'Chapeau' },
        items: {
          type: 'array', label: 'Points',
          arrayFields: {
            emoji: { type: 'text', label: 'Emoji' },
            title: { type: 'text', label: 'Titre' },
            text: { type: 'textarea', label: 'Texte' },
          },
          defaultItemProps: { emoji: '🛡️', title: '', text: '' },
          getItemSummary: (item) => item.title || 'Point',
        },
        showMockup: { type: 'radio', label: 'Dashboard autorités', options: [{ label: 'Afficher', value: true }, { label: 'Masquer', value: false }] },
      },
      defaultProps: { anchor: '', eyebrow: '', title: '', lead: '', items: [], showMockup: true },
      render: SecurityBlock,
    },
    Steps: {
      label: 'Étapes (comment ça marche)',
      fields: {
        items: {
          type: 'array', label: 'Étapes',
          arrayFields: {
            title: { type: 'text', label: 'Titre' },
            text: { type: 'textarea', label: 'Texte' },
          },
          defaultItemProps: { title: '', text: '' },
          getItemSummary: (item) => item.title || 'Étape',
        },
        showScreens: { type: 'radio', label: 'Écrans produit', options: [{ label: 'Afficher', value: true }, { label: 'Masquer', value: false }] },
        background: { ...backgroundField, label: 'Fond' },
      },
      defaultProps: { items: [], showScreens: true, background: 'default' },
      render: StepsBlock,
    },
    Pricing: {
      label: 'Tarifs (packs — données admin)',
      fields: {
        eyebrow: { type: 'text', label: 'Sur-titre' },
        title: { type: 'text', label: 'Titre' },
        lead: { type: 'textarea', label: 'Chapeau' },
        monthlyLabel: { type: 'text', label: 'Bascule — Mensuel' },
        yearlyLabel: { type: 'text', label: 'Bascule — Annuel' },
        yearlyBadge: { type: 'text', label: 'Badge annuel' },
        footnote: { type: 'text', label: 'Note de bas de section' },
      },
      defaultProps: {
        eyebrow: 'Abonnement', title: 'Simple et transparent.',
        lead: 'Sans engagement. Sans frais cachés. Changez de plan à tout moment.',
        monthlyLabel: 'Mensuel', yearlyLabel: 'Annuel', yearlyBadge: '1 mois offert',
        footnote: "Aucune carte bancaire requise pour démarrer l'essai · Résiliable à tout moment",
      },
      render: PricingBlock,
    },
    Testimonials: {
      label: 'Témoignages',
      fields: {
        items: {
          type: 'array', label: 'Témoignages',
          arrayFields: {
            quote: { type: 'textarea', label: 'Citation' },
            name: { type: 'text', label: 'Nom' },
            role: { type: 'text', label: 'Fonction · Établissement' },
            initials: { type: 'text', label: 'Initiales (avatar)' },
          },
          defaultItemProps: { quote: '', name: '', role: '', initials: '' },
          getItemSummary: (item) => item.name || 'Témoignage',
        },
        background: { ...backgroundField, label: 'Fond' },
      },
      defaultProps: { items: [], background: 'default' },
      render: TestimonialsBlock,
    },
    Faq: {
      label: 'FAQ',
      fields: {
        items: {
          type: 'array', label: 'Questions',
          arrayFields: {
            question: { type: 'text', label: 'Question' },
            answer: { type: 'textarea', label: 'Réponse' },
          },
          defaultItemProps: { question: '', answer: '' },
          getItemSummary: (item) => item.question || 'Question',
        },
        background: { ...backgroundField, label: 'Fond' },
      },
      defaultProps: { items: [], background: 'default' },
      render: FaqBlock,
    },
    CtaBand: {
      label: 'Bande d\'appel à l\'action',
      fields: {
        anchor: { type: 'text', label: 'Ancre (ex. contact)' },
        title: { type: 'text', label: 'Titre' },
        text: { type: 'textarea', label: 'Texte' },
        buttonLabel: { type: 'text', label: 'Bouton — libellé' },
        buttonHref: { type: 'text', label: 'Bouton — lien' },
        note: { type: 'text', label: 'Note (petit texte)' },
      },
      defaultProps: { anchor: '', title: '', text: '', buttonLabel: 'Essayer gratuitement', buttonHref: '/register', note: '' },
      render: CtaBandBlock,
    },
    Mockup: {
      label: 'Visuel produit (figé)',
      fields: {
        mockup: { type: 'select', label: 'Visuel', options: MOCKUP_CHOICES.map((m) => ({ label: m.label, value: m.value })) },
        background: {
          type: 'radio', label: 'Fond',
          options: [
            { label: 'Papier', value: 'default' },
            { label: 'Alterné', value: 'alt' },
            { label: 'Encre (sombre)', value: 'dark' },
          ],
        },
      },
      defaultProps: { mockup: 'fiche-police', background: 'default' },
      render: MockupBlock,
    },
    Prose: {
      label: 'Prose (texte légal / article)',
      fields: {
        title: { type: 'text', label: 'Titre (optionnel)' },
        text: { type: 'textarea', label: 'Texte — ligne vide = nouveau paragraphe, lignes commençant par « - » = liste' },
        background: { ...backgroundField, label: 'Fond' },
      },
      defaultProps: { title: '', text: '', background: 'default' },
      render: ProseBlock,
    },
    Spacer: {
      label: 'Espaceur',
      fields: { height: { type: 'number', label: 'Hauteur (px)' } },
      defaultProps: { height: 40 },
      render: SpacerBlock,
    },
  },
};
