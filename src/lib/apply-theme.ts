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

function hexToRgba(hex: string, alpha: number): string {
  if (!hex?.startsWith("#") || hex.length !== 7) return `rgba(195,154,76,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Applies CRM (sales) theme preferences to the document.
 * Only writes to CSS vars actually consumed by the CRM components (shadcn + globals.css):
 * --primary, --ring, --accent, --accent-foreground, --sidebar*, --foreground, --radius.
 * Does NOT touch --mkt-* vars (those belong to the marketing module).
 */
export function applyCrmTheme(prefs: CrmThemePrefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (prefs.theme === "light") { root.classList.remove("dark"); root.classList.add("light"); }
  else { root.classList.remove("light"); root.classList.add("dark"); }
  root.style.setProperty("--primary", prefs.accentPrimary);
  root.style.setProperty("--primary-foreground", prefs.theme === "light" ? "#ffffff" : "#0a0a09");
  root.style.setProperty("--ring", prefs.accentPrimary);
  root.style.setProperty("--accent", hexToRgba(prefs.accentPrimary, 0.08));
  root.style.setProperty("--accent-foreground", prefs.accentPrimary);
  root.style.setProperty("--sidebar-primary", prefs.accentPrimary);
  root.style.setProperty("--sidebar-ring", prefs.accentPrimary);
  root.style.setProperty("--sidebar-accent", hexToRgba(prefs.accentPrimary, 0.08));
  root.style.setProperty("--sidebar-accent-foreground", prefs.accentPrimary);
  root.style.setProperty("--sidebar", prefs.sidebarBg);
  root.style.setProperty("--foreground", prefs.textColor);
  root.style.setProperty("--sidebar-foreground", prefs.textColor);
  root.style.setProperty("--radius", RADIUS_MAP[prefs.borderRadius] ?? "8px");
  root.style.setProperty("--ui-spacing-factor", DENSITY_MAP[prefs.uiDensity] ?? "1");
  document.body.style.fontFamily = FONT_MAP[prefs.fontFamily] ?? FONT_MAP.inter;
}
