/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#007BFF', // Medical Blue
          light: '#4DA3FF',
          dark: '#0056B3',
        },
        background: '#F8F9FA', // Off-White
        surface: '#FFFFFF', // White
        border: '#DEE2E6', // Light Gray
        text: {
          main: '#212529', // Dark Gray / Black
          muted: '#6C757D', // Muted Gray
        },
        danger: '#DC3545', // Medical Red
        warning: '#FFC107', // Warning Yellow
        success: '#28A745', // Medical Green
      }
    },
  },
  plugins: [],
}