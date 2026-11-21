/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { kid: ['Fredoka', 'ui-rounded', 'system-ui', 'sans-serif'] },
      colors: {
        sky: { soft: '#e6f6ff' },
        sun: '#ffc93c',
        grass: '#58cc02',
        grassdark: '#46a302',
        berry: '#ff4b8b',
        ocean: '#1cb0f6',
        oceandark: '#1899d6',
        grape: '#a560e8',
        tangerine: '#ff9600',
        ink: '#3c3c3c',
      },
      boxShadow: {
        chunky: '0 6px 0 0 rgba(0,0,0,0.15)',
        chunkysm: '0 4px 0 0 rgba(0,0,0,0.15)',
      },
      keyframes: {
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '70%': { transform: 'scale(1.08)', opacity: '1' }, '100%': { transform: 'scale(1)' } },
        wiggle: { '0%,100%': { transform: 'rotate(0)' }, '25%': { transform: 'rotate(-6deg)' }, '75%': { transform: 'rotate(6deg)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-8px)' }, '40%,80%': { transform: 'translateX(8px)' } },
        fall: { '0%': { transform: 'translateY(-10vh) rotate(0)', opacity: '1' }, '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0.8' } },
        blink: { '0%,92%,100%': { transform: 'scaleY(1)' }, '96%': { transform: 'scaleY(0.1)' } },
      },
      animation: {
        bob: 'bob 2.4s ease-in-out infinite',
        pop: 'pop .35s ease-out both',
        wiggle: 'wiggle .5s ease-in-out',
        shake: 'shake .45s ease-in-out',
        fall: 'fall 2.6s linear forwards',
        blink: 'blink 4s infinite',
      },
    },
  },
  plugins: [],
};
