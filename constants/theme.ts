/**
 * Theme constants for Live Quran app
 * For non-Tailwind usage (inline styles, ActivityIndicator colors, etc.)
 */

export const colors = {
  // Primary colors (matches tailwind.config.js)
  primary: {
    DEFAULT: "#d4a843", // royal gold
    dark: "#b58c2c", // deep gold
    light: "#e0bd5e", // light gold
  },

  // Background colors
  background: {
    primary: "#0a0e1c",
    secondary: "#101729",
    tertiary: "#1b2740",
  },

  // Text colors
  text: {
    primary: "rgba(255, 255, 255, 0.9)",
    secondary: "#a3a3a3", // neutral-400
    muted: "#525252", // neutral-600
  },

  // Status colors
  status: {
    live: "#ef4444", // red-500
    error: "#ef4444", // red-500
  },

  // Accent colors
  accent: {
    gold: "#d4a843", // royal gold
  },
};

export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
  xxxl: 80,
};
