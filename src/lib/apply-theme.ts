import { getBrandPreset, presetToCssVars, SALES_DEFAULT_PRESET } from "./brand-presets";

export interface CrmThemePrefs {
  theme: string;
  accentPrimary: string;
  accentSecondary: string;
  textColor: string;
  fontFamily: string;
  sidebarBg: string;
  sidebarBgType?: string;
  sidebarBgImage?: string;
  uiDensity: string;
  borderRadius: string;
}

const FONT_MAP: Record<string, string> = {
  inter: "'Inter', -apple-system, sans-serif",
  merriweather: "'Merriweather', Georgia, serif",
  playfair: "'Playfair Display', Georgia, serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};
const RADIUS_MAP: Record<string, string> = { sharp: "2px", rounded: "8px", pill: "16px" };
const DENSITY_MAP: Record<string, string> = { compact: "0.75", comfortable: "1", spacious: "1.25" };

/**
 * Applies the sales (CRM) theme to the document root.
 *
 * Marketing has its own theme system that scopes to its takeover container
 * (see src/components/marketing/mkt-utils.ts + marketing/page.tsx). Marketing
 * sets shadcn tokens inline on its own subtree, so writing here to :root
 * does NOT bleed into the marketing module.
 *
 * `prefs.theme` is a brand-preset id (noir-gold | noir-burgundy | cream-gold).
 * `prefs.accentPrimary` optionally overrides the preset's accent for users
 * who want a custom tint inside the brandbook.
 */
export function applyCrmTheme(prefs: CrmThemePrefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const presetId = prefs.theme ?? SALES_DEFAULT_PRESET;
  const preset = getBrandPreset(presetId);

  if (preset.mode === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }

  const vars = presetToCssVars(preset, prefs.accentPrimary);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  root.style.setProperty("--radius", RADIUS_MAP[prefs.borderRadius] ?? "8px");
  root.style.setProperty("--ui-spacing-factor", DENSITY_MAP[prefs.uiDensity] ?? "1");
  document.body.style.fontFamily = FONT_MAP[prefs.fontFamily] ?? FONT_MAP.inter;
}
