/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './electron/**/*.{js,jsx}',
    './index.html'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1a1a2e',
          secondary: 'var(--brand-secondary, #e94560)',
          surface: '#16213e',
          text: '#eaeaea'
        }
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' },
        }
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
      }
    }
  },
  plugins: []
}
