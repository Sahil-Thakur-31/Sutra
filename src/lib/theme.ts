// Plain (non "use client") module so Server Components -- like the root
// layout's inline theme-init script -- can import this constant directly.
// Importing a value export from a "use client" module into a Server
// Component does not work reliably (only component exports cross that
// boundary), which is what caused this to come through as `undefined`.
export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "sutra-theme";
