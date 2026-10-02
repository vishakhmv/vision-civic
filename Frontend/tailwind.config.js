/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'civic-navy': {
          950: '#040714',
          900: '#0a1128',
          800: '#0f1936',
          700: '#14234b',
          600: '#1e3264',
        },
        'civic-teal': {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
        'civic-slate': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'civic-glow': '0 0 25px rgba(6, 182, 212, 0.25)',
        'civic-card': '0 10px 30px -10px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
};
