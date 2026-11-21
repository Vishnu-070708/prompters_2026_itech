/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkbg: '#0b1220', // near-black navy
        darkcard: '#0f172a', // slate-900
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // teal primary
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        accent: {
          cyan: '#22d3ee',
          teal: '#14b8a6',
          indigo: '#6366f1',
          blue: '#38bdf8',
        },
        surface: {
          50: '#0f172a',
          100: '#1e293b',
          200: '#334155',
        },
        priority: {
          low: '#10b981', // emerald
          medium: '#f59e0b', // amber
          high: '#f97316', // orange
          critical: '#ef4444', // red with faint glow
        },
        status: {
          reported: '#f59e0b', // amber
          inProgress: '#38bdf8', // sky
          resolved: '#10b981', // emerald
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        'glow-teal': '0 0 25px -3px rgba(20, 184, 166, 0.35)',
        'glow-cyan': '0 0 25px -3px rgba(34, 211, 238, 0.35)',
        'glow-indigo': '0 0 25px -3px rgba(99, 102, 241, 0.35)',
        'glow-critical': '0 0 24px -2px rgba(239, 68, 68, 0.4)',
        'subtle-dark': '0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 2px 10px -2px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
