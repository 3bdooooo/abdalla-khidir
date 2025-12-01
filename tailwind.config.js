
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 0 0 1px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)',
        'glow': '0 0 15px rgba(37, 99, 235, 0.3)',
      },
      colors: {
        brand: {
          DEFAULT: '#2563EB', // Modern Blue 600
          light: '#60A5FA',   // Blue 400
          dark: '#1E40AF',    // Blue 800
          accent: '#3B82F6',
          soft: '#EFF6FF',    // Blue 50
        },
        background: '#F8FAFC', // Slate 50 (Cooler white)
        surface: '#FFFFFF',
        border: '#E2E8F0',    // Slate 200
        text: {
          main: '#0F172A',    // Slate 900
          muted: '#64748B',   // Slate 500
          light: '#94A3B8',   // Slate 400
        },
        danger: '#EF4444',    // Red 500
        warning: '#F59E0B',   // Amber 500
        success: '#10B981',   // Emerald 500
        info: '#0EA5E9',      // Sky 500
      }
    },
  },
  plugins: [],
}
