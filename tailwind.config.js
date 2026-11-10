/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        recovr: {
          bg: '#07080D',
          surface: '#0D0E15',
          card: '#12131D',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#7C3AED',
          orange: '#C85A2A',
        }
      },
      boxShadow: {
        'glow-purple': '0 0 50px -10px rgba(124, 58, 237, 0.35)',
        'glow-orange': '0 0 50px -10px rgba(200, 90, 42, 0.35)',
        'card-dark': '0 1px 3px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'card-light': '0 1px 3px 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulseSlow: 'pulseSlow 4s ease-in-out infinite',
        shimmer: 'shimmer 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
