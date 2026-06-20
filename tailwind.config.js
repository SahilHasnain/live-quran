/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#059669", // emerald-600
          dark: "#047857", // emerald-700
          light: "#10b981", // emerald-500
        },
        background: {
          primary: "#080f0a",
          secondary: "#0f1a12",
          tertiary: "#162019",
        },
        accent: {
          gold: "#d4a843", // islamic gold
        },
      },
    },
  },
  plugins: [],
};
