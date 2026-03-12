/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0891b2", // cyan-600
          dark: "#0e7490", // cyan-700
          light: "#06b6d4", // cyan-500
        },
        background: {
          primary: "#0f0f0f",
          secondary: "#1a1a1a",
          tertiary: "#222222",
        },
        accent: {
          gold: "#fbbf24", // amber-400
        },
      },
    },
  },
  plugins: [],
};
