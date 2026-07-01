/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#EFF6FF', 100: '#DBEAFE', 600: '#2563EB', 700: '#1D4ED8' },
        navy:    { 50: '#F0F4F8', 700: '#2C4F7C', 900: '#1E3A5F' },
        gold:    { 100: '#FDF6DC', 500: '#C8A951' },
      },
      borderRadius: { card: '16px', btn: '12px', input: '10px' },
      height: { 'btn-lg': '56px', 'btn-md': '48px', input: '52px', nav: '64px', header: '56px' },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10)',
        btn: '0 2px 8px rgba(37,99,235,0.25)',
      },
    },
  },
  plugins: [],
};
