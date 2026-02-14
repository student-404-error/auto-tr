/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'crypto-green': '#00D4AA',
        'crypto-red': '#FF6B6B',
        'crypto-blue': '#4ECDC4',
        'crypto-gold': '#FFD700',
        'dark-bg': '#0F172A',
        'dark-card': '#1E293B',
        // Default border color used by `@apply border-border` in globals.css
        border: '#374151', // Tailwind gray-700
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
