/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#d4a843", // royal gold
          dark: "#b58c2c", // deep gold
          light: "#e0bd5e", // light gold
        },
        gold: {
          200: "#f1dc9c",
          400: "#e0bd5e",
          500: "#d4a843",
          600: "#b58c2c",
          700: "#97721f",
        },
        background: {
          primary: "#0a0e1c", // deep navy-black
          secondary: "#101729",
          tertiary: "#1b2740",
        },
        accent: {
          gold: "#d4a843", // royal gold
        },
      },
    },
  },
  plugins: [],
};
