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
        dark: {
          950: '#07090e',
          900: '#0b0f19',
          850: '#111726',
          800: '#172033',
          700: '#1e293b',
          600: '#334155',
        },
        dbRead: {
          light: '#38bdf8',
          DEFAULT: '#0284c7',
          dark: '#0369a1',
          bg: '#082f49',
        },
        dbWrite: {
          light: '#fb7185',
          DEFAULT: '#e11d48',
          dark: '#be123c',
          bg: '#4c0519',
        },
        accent: {
          cyan: '#06b6d4',
          emerald: '#10b981',
          indigo: '#6366f1',
          violet: '#8b5cf6',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(6, 182, 212, 0.5)',
        'glow-amber': '0 0 20px -5px rgba(245, 158, 11, 0.5)',
        'glow-rose': '0 0 20px -5px rgba(244, 63, 94, 0.5)',
        'glow-indigo': '0 0 20px -5px rgba(99, 102, 241, 0.5)',
      }
    },
  },
  plugins: [],
}
