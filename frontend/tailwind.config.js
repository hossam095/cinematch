/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#ffc107',
          600: '#ffb300',
          700: '#ffa000',
          800: '#ff8f00',
          900: '#ff6f00',
        },
        dark: {
          50:  '#f5f5f5',
          100: '#ebebeb',
          200: '#c8c8c8',
          300: '#a0a0a0',
          400: '#6e6e6e',
          500: '#4a4a4a',
          600: '#333333',
          700: '#242424',
          800: '#181818',
          900: '#0f0f0f',
          950: '#080808',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
