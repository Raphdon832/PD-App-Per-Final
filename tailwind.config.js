/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#10B981',   // emerald-500
          primaryDark: '#059669',
          accent: '#F59E0B',    // amber-500 (orange vibe)
          accentDark: '#D97706',
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
