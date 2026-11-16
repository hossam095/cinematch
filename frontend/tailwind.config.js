/** @type {import('tailwindcss').Config} */
// "Néon nuit" theme: deep night-blue ground, coral accent, mint for series badges.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Coral accent (buttons, active states, links)
        brand: {
          50:  '#fff1f1',
          100: '#ffe0e0',
          200: '#ffc5c5',
          300: '#ff9d9d',
          400: '#ff8a8a',
          500: '#ff6b6b',
          600: '#f04e4e',
          700: '#d13a3a',
          800: '#ab3030',
          900: '#8c2b2b',
        },
        // Mint secondary (series badge, "in season" hints)
        mint: {
          300: '#a8f8e6',
          400: '#7cf5d8',
          500: '#4fe3c2',
        },
        // Night-blue neutrals (backgrounds, borders, muted text)
        dark: {
          50:  '#eef2ff',
          100: '#dde3f5',
          200: '#c3cbe6',
          300: '#a9b3d1',
          400: '#8a96b8',
          500: '#5f6b8f',
          600: '#1f2a44',
          700: '#1a2340',
          800: '#131b30',
          900: '#0e1428',
          950: '#0b1020',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
      },
      boxShadow: {
        glow: '0 24px 60px rgba(255, 107, 107, 0.25)',
      },
    },
  },
  plugins: [],
}
