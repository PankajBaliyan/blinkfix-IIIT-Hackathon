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
        obsidian: {
          950: 'rgb(var(--color-obsidian-950) / <alpha-value>)',
          900: 'rgb(var(--color-obsidian-900) / <alpha-value>)',
          850: 'rgb(var(--color-obsidian-850) / <alpha-value>)',
          800: 'rgb(var(--color-obsidian-800) / <alpha-value>)',
          750: 'rgb(var(--color-obsidian-750) / <alpha-value>)',
          700: 'rgb(var(--color-obsidian-700) / <alpha-value>)',
          600: 'rgb(var(--color-obsidian-600) / <alpha-value>)',
        },
        terminal: {
          green: '#10b981',
          cyan: '#06b6d4',
          blue: '#38bdf8',
          purple: '#a855f7',
          amber: '#f59e0b',
          red: '#ef4444',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      keyframes: {
        pulseFast: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(1.05)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        }
      },
      animation: {
        'pulse-fast': 'pulseFast 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      }
    },
  },
  plugins: [],
}
