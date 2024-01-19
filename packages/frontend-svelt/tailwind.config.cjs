/** @type {import('tailwindcss').Config}*/
const config = {
  content: [
    './src/**/*.{html,js,svelte,ts}',
  ],
  plugins: [require('@tailwindcss/forms')],

  darkMode: 'class',

  future: {
    purgeLayersByDefault: true,
    removeDeprecatedGapUtilities: true,
  },

  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        // flowbite-svelte
        primary: {
          // 50: '#FFF5F2',
          // 100: '#FFF1EE',
          // 200: '#FFE4DE',
          // 300: '#FFD5CC',
          // 400: '#FFBCAD',
          // 500: '#FE795D',
          // 600: '#EF562F',
          // 700: '#EB4F27',
          // 800: '#CC4522',
          // 900: '#A5371B',
        },
      },
    },
  },
};

module.exports = config;
