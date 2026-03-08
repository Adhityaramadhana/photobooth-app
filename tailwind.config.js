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
          secondary: '#e94560',
          surface: '#16213e',
          text: '#eaeaea'
        }
      }
    }
  },
  plugins: []
}
