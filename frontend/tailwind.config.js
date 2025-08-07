/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}",
    "./node_modules/primeng/**/*.{js,ts,html}"
  ],
  theme: {extend: {}},
  plugins: [require('tailwindcss-primeui')],
  corePlugins: {preflight: true},
  darkMode: ['selector', '[class~="my-app-dark"]'],
};
