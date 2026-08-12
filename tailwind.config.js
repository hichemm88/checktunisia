/**
 * Les rampes ci-dessous REMPLACENT les palettes par défaut de Tailwind.
 *
 * Le code comptait ~1 400 classes hors charte (`gray-*`, `red-*`, `green-*`,
 * `amber-*`, `blue-*`…). Plutôt que de réécrire 1 400 occurrences — long, et
 * source de régressions visuelles page par page — chaque famille est remappée
 * sur la palette Qayed. Une classe `text-gray-500` produit désormais un gris
 * teinté encre conforme, `bg-red-50` un fond d'erreur institutionnel, etc.
 *
 * Les valeurs viennent de src/styles/tokens.css, qui reste la source unique.
 * Elles sont dupliquées ici parce que Tailwind a besoin de littéraux pour
 * générer ses classes et ses opacités (`bg-red-500/20`) : une `var()` casse
 * le modificateur d'opacité.
 *
 * Ordre de luminosité conservé (50 clair → 900 sombre) : aucune mise en page
 * ne change, seules les teintes bougent.
 *
 * @type {import('tailwindcss').Config}
 */

// Neutres teintés vers l'encre. gris-400 = 3,3:1 sur blanc (icônes et grands
// textes), gris-500 = 5,4:1 (texte courant). Les anciens gris Tailwind étaient
// respectivement à 2,5:1 et 4,8:1.
const gris = {
  50:  '#F7F8F9',
  100: '#EFF1F3',
  200: '#E1E5E9',
  300: '#C7CDD3',
  400: '#868F99',
  500: '#616B75',
  600: '#566068',
  700: '#3F484F',
  800: '#2A323A',
  900: '#10222E',
  950: '#0A161E',
};

// Erreur — absente de la charte v1.0. Rouge institutionnel désaturé, choisi
// pour rester distinct de l'ambre de vigilance à l'œil comme au daltonisme.
const erreur = {
  50:  '#FCEEEC',
  100: '#F9DEDC',
  200: '#F2B8B5',
  300: '#EC928E',
  400: '#E46962',
  500: '#DC362E',
  600: '#B3261E',
  700: '#8C1D18',
  800: '#601410',
  900: '#410E0B',
  950: '#2D0A08',
};

// Vert conforme.
const conforme = {
  50:  '#E4F5EC',
  100: '#CDEBDC',
  200: '#9BD7BB',
  300: '#66C39A',
  400: '#38AE7E',
  500: '#1F9D6B',
  600: '#178057',
  700: '#137453',
  800: '#0E5A40',
  900: '#093B2B',
  950: '#06271C',
};

// Ambre vigilance. Rappel : les teintes 400 et 500 ne passent pas AA en texte —
// pour du texte, utiliser 700 (`text-amber-700`, 5,5:1 sur blanc).
const vigilance = {
  50:  '#FBF0D7',
  100: '#F8E4B4',
  200: '#F1CD73',
  300: '#EBB93D',
  400: '#E3A008',
  500: '#C88C07',
  600: '#A87506',
  700: '#8A6206',
  800: '#6B4C05',
  900: '#4A3403',
  950: '#332402',
};

// Violet cachet — absorbe aussi les familles froides (blue, indigo, violet…)
// qui n'ont aucune existence dans la charte.
const cachet = {
  50:  '#EEEBFA',
  100: '#E3DEF7',
  200: '#C9C1EE',
  300: '#AFA9EC',
  400: '#8B7FE0',
  500: '#6A5BC4',
  600: '#5346A8',
  700: '#443896',
  800: '#362C78',
  900: '#241D52',
  950: '#181338',
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Archivo', 'sans-serif'],
        arabic: ['IBM Plex Sans Arabic', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        // Qayed brand — "l'encre du cachet officiel" (v1.0, juillet 2026)
        qayed: {
          encre:          '#10222E',
          papier:         '#F6F5F1',
          cachet:         '#5346A8',
          'cachet-fonce': '#443896',
          'cachet-sombre':'#8B7FE0',
          'cachet-dilue': '#EEEBFA',
          conforme:       '#1F9D6B',
          'conforme-fond':'#E4F5EC',
          'conforme-texte':'#137453',
          vigilance:      '#E3A008',
          'vigilance-fond':'#FBF0D7',
          'vigilance-texte':'#8A6206',
          erreur:         '#B3261E',
          'erreur-fond':  '#FCEEEC',
          'erreur-texte': '#8C1D18',
          // Remonté de #8A94A0 (2,8:1 sur papier, en échec) à #616B75 (5,0:1).
          // Aligne l'application sur la valeur déjà retenue par le site public.
          fiche:          '#616B75',
          'fiche-faible': '#868F99',
          desactive:      '#566068',
          ligne:          '#DDD9CF',
          'sur-encre':    '#A8B4BE',
          'sur-encre-bas':'#8794A0',
        },

        // ── Remappage des familles Tailwind hors charte ──────────────────
        // Neutres
        gray: gris,
        slate: gris,
        zinc: gris,
        neutral: gris,
        stone: gris,
        // Erreur
        red: erreur,
        rose: erreur,
        // Succès
        green: conforme,
        emerald: conforme,
        teal: conforme,
        // Avertissement
        amber: vigilance,
        yellow: vigilance,
        orange: vigilance,
        // Froids — aucun bleu dans la charte : tout part sur le violet cachet
        blue: cachet,
        indigo: cachet,
        violet: cachet,
        purple: cachet,
        sky: cachet,
        cyan: cachet,
        fuchsia: cachet,
        pink: cachet,

        // Alias historiques conservés : de nombreux `bg-navy-*` / `bg-warm-*`
        // subsistent dans l'admin et l'autorité. Ils résolvent sur la palette
        // de marque, donc restent conformes.
        primary: {
          50:  '#EEEBFA',
          100: '#EEEBFA',
          200: '#D9D2F0',
          500: '#8B7FE0',
          600: '#5346A8',
          700: '#443896',
          800: '#10222E',
        },
        navy: {
          50:  '#EEEBFA',
          100: '#EEEBFA',
          600: '#8B7FE0',
          700: '#5346A8',
          800: '#443896',
          900: '#10222E',
        },
        gold: {
          50:  '#EEEBFA',
          100: '#EEEBFA',
          200: '#D9D2F0',
          300: '#B8ABE8',
          400: '#8B7FE0',
          500: '#5346A8',
          600: '#443896',
        },
        warm: {
          50:  '#FAFAF7',
          100: '#F6F5F1',
          200: '#EFEDE7',
          300: '#DDD9CF',
          400: '#C4BFB4',
          500: '#616B75',
        },
      },
      // Trois rayons, pas sept. `xl`/`2xl`/`3xl` sont alignés dessus pour que
      // les ~330 usages existants convergent sans réécriture.
      borderRadius: {
        card:  '20px',
        btn:   '14px',
        input: '10px',
        lg:    '10px',
        xl:    '14px',
        '2xl': '20px',
        '3xl': '20px',
      },
      height: {
        'btn-lg': '56px',
        'btn-md': '48px',
        'btn-sm': '40px',
        input:    '52px',
        nav:      '72px',
        header:   '61px',
      },
      boxShadow: {
        card:         '0 1px 3px rgba(16,34,46,0.05), 0 0 0 1px rgba(16,34,46,0.04)',
        'card-hover': '0 4px 16px rgba(16,34,46,0.08)',
        btn:          '0 2px 8px rgba(83,70,168,0.25)',
        'btn-gold':   '0 2px 8px rgba(83,70,168,0.25)',
        nav:          '0 -1px 8px rgba(16,34,46,0.05)',
        header:       '0 1px 0 rgba(16,34,46,0.06)',
        float:        '0 12px 40px rgba(16,34,46,0.14)',
        sm:           '0 1px 2px rgba(16,34,46,0.06)',
      },
    },
  },
  plugins: [],
};
