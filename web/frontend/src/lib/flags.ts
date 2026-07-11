export const SHOW_DEMO_CONTROLS =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_CONTROLS === "true";

export const USE_SAMPLE_FALLBACK =
  import.meta.env.VITE_USE_SAMPLE_FALLBACK === "true" ||
  (import.meta.env.DEV && import.meta.env.VITE_STRICT_API !== "true");
