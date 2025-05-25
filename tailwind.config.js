/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#174265',
          50: '#f0f7ff',
          100: '#e0f1ff',
          200: '#b9e3ff',
          300: '#7dcfff',
          400: '#5ac1ee', // Light blue brand color
          500: '#174265', // Dark blue brand color
          600: '#174265',
          700: '#174265',
          800: '#174265',
          900: '#174265',
        },
        secondary: {
          DEFAULT: '#5ac1ee',
          50: '#f0f9ff',
          100: '#e0f7ff',
          200: '#b9efff',
          300: '#7de7ff',
          400: '#5ac1ee',
          500: '#5ac1ee',
          600: '#38a3d1',
          700: '#2b89b3',
          800: '#236f95',
          900: '#1d5a7a',
        },
        accent: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};