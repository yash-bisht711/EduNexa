/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        brand: '#6d5dfc',
        mint: '#39d6b4',
      },
      boxShadow: {
        soft: '0 12px 40px rgba(15,23,42,.08)',
      },
    },
  },
  plugins: [],
};
