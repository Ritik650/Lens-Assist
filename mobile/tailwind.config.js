/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0A1628',
        accent: '#00C9A7',
        warning: '#FF6B35',
        danger: '#FF3B30',
        success: '#34C759',
        surface: '#1C2B3A',
        surface2: '#243447',
        border: '#2A3F54',
      },
    },
  },
  plugins: [],
};
