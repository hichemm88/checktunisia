/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Navy — primary brand (deep Mediterranean blue)
        primary: {
          50:  '#EDF2FA',
          100: '#D4E1F4',
          200: '#A8C4E9',
          500: '#3A6FA0',
          600: '#1B3A5F',
          700: '#142C49',
          800: '#0E1E32',
        },
        navy: {
          50:  '#EDF2FA',
          100: '#D4E1F4',
          600: '#2A5090',
          700: '#1E3A5F',
          800: '#1B3654',
          900: '#0F2236',
        },
        // Gold — warm Tunisian accent
        gold: {
          50:  '#FEF6E6',
          100: '#FDEAC3',
          200: '#FAD28A',
          300: '#F0B84A',
          400: '#E0A040',
          500: '#C8943A',
          600: '#A8721A',
        },
        // Warm neutral background
        warm: {
          50:  '#FAFAF7',
          100: '#F5F4EF',
          200: '#ECEAE4',
          300: '#E0DDD7',
          400: '#C8C4BC',
          500: '#9A968E',
        },
      },
      borderRadius: {
        card:  '20px',
        btn:   '14px',
        input: '12px',
        '2xl': '20px',
        '3xl': '24px',
      },
      height: {
        'btn-lg': '56px',
        'btn-md': '48px',
        'btn-sm': '40px',
        input:    '52px',
        nav:      '72px',
        header:   '63px',
      },
      boxShadow: {
        card:         '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.12)',
        btn:          '0 4px 14px rgba(27,54,84,0.35)',
        'btn-gold':   '0 4px 14px rgba(200,148,58,0.40)',
        nav:          '0 -2px 20px rgba(0,0,0,0.07)',
        header:       '0 1px 0 rgba(0,0,0,0.07)',
        float:        '0 8px 32px rgba(0,0,0,0.16)',
        sm:           '0 1px 3px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
