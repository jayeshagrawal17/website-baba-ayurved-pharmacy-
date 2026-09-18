/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ayurveda: {
          primary: '#1A4D2E', // Deep forest green
          secondary: '#4F6F52', // Muted sage green
          accent: '#D4A373', // Warm gold/bronze
          light: '#E8ECD6', // Pale green-white
          bg: '#FAFAF5', // Warm cream background
        }
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        body: ['"Lato"', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.3s ease-out forwards',
        'slideInRight': 'slideInRight 0.3s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
};
