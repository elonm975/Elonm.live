
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'crypto-yellow': '#f59e0b',
        'crypto-orange': '#d97706',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
