/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary': '#1e94f6',
        'background-dark': '#101a22',
        'card-dark': '#16202a',
        'card-darker': '#0d141a',
        'surface': '#18232e',
        'surface-highlight': '#202e3b',
        'success': '#22c55e',
        'danger': '#ef4444',
        'navy-bg': '#0B1120',
        'card-navy': '#111827',
        'electric-blue': '#2563eb',
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
      },
      fontSize: {
        'xxs': '0.65rem',
      },
      boxShadow: {
        'glow': '0 0 15px rgba(30, 148, 246, 0.3)',
      },
      borderRadius: {
        'card': '12px',
      },
    },
  },
  plugins: [],
}
