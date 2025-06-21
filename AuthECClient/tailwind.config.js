/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'crema': '#FFF8E1',
        'blue-ucb': '#004AAD',
        'yellow-ucb': '#FFD400',
      }
    },
  },
  plugins: [],
}

