/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        'c2-bg': '#fdfafb',
        'c2-bg-secondary': '#ffffff',
        'c2-pink': '#d16b8a',
        'c2-pink-light': '#eab3c2',
        'c2-text': '#2c2c2c',
        'c2-text-dark': '#666666',
        'c2-border': '#f2e1e5',
      },
      fontFamily: {
        'roboto': ['Roboto', 'Arial', 'sans-serif'],
      }
    }
  }
}
