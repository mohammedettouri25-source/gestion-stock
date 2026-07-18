/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          550: '#64748b',
          500: '#0f172a', // deep slate
          600: '#020617',
          700: '#000000',
        },
        accent: {
          blue: '#0071e3',      // Apple Blue
          pink: '#ff2d55',      // Apple Red/Pink
          green: '#34c759',     // Apple Green
          purple: '#af52de',    // Apple Purple
          orange: '#ff9500',    // Apple Orange
          gold: '#c5a880',      // Premium Gold
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        premium: '0 20px 40px -15px rgba(0,0,0,0.1)',
      }
    },
  },
  plugins: [],
}
