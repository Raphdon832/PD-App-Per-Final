/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#000000',   // black (primary)
          primaryDark: '#111111',
          accent: '#FFFFFF',    // white (secondary)
          accentDark: '#F3F3F3',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui']
      },
      borderRadius: {
        '3xl': '1.5rem'
      }
    }
  },
  plugins: []
};
