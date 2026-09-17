// White-label / brand customization layer.
// Swap these values per deployment — nothing else in the app should
// hardcode a brand color, logo path, or font choice.

export const theme = {
  brand: {
    name: "FindMedi",
    logo: "/images/logo.svg",
    logoLight: "/images/logo-light.svg",
  },
  colors: {
    primary: "hsl(var(--primary))",
    secondary: "hsl(var(--secondary))",
    accent: "hsl(var(--accent))",
  },
} as const;

export type Theme = typeof theme;
