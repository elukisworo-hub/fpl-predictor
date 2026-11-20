/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: { xs: '380px' },
      fontFamily: {
        display: ['Fredoka', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#3B2E5A',
        cream: '#FFF8EC',
        sun: '#FFC93C',
        tangerine: '#FF8A3D',
        bubblegum: '#FF6FA5',
        mint: '#3DD6A3',
        sky: '#5BC0F8',
        grape: '#8E6CF0',
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(59, 46, 90, 0.35)',
        pop: '0 6px 0 0 rgba(0,0,0,0.18)',
        'pop-sm': '0 4px 0 0 rgba(0,0,0,0.18)',
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
    },
  },
  plugins: [],
};
