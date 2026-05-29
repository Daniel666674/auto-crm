/**
 * Blackscale brandbook presets.
 *
 * The brandbook defines a noir base (#0a0a09), warm cream text (#D7D2CB),
 * and two anchor accents: gold (#D19C15) and burgundy (#551C25). Headings
 * use Playfair Display; body uses Inter.
 *
 * Each module (sales, marketing) can pick from the same three brand-approved
 * presets. Defaults differ so the two modules have distinct visual identity
 * out of the box while staying inside the brandbook.
 */

export const BRAND = {
  noir: "#0a0a09",
  noirSurface: "#11110F",
  noirSidebar: "#0c0c0b",
  cream: "#D7D2CB",
  creamMuted: "#7a756e",
  gold: "#D19C15",
  goldHover: "#E0AD1F",
  burgundy: "#551C25",
  burgundyHover: "#6D1F2E",
  paper: "#F8F5F0",
  paperSurface: "#FFFFFF",
  paperSidebar: "#F1ECE3",
  ink: "#1a1410",
  inkMuted: "#6b5e54",
  border: "rgba(215,210,203,0.07)",
  borderLight: "rgba(26,20,16,0.08)",
} as const;

export interface BrandPreset {
  id: string;
  label: string;
  description: string;
  mode: "dark" | "light";
  bg: string;
  surface: string;
  sidebar: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentSecondary: string;
}

export const BRAND_PRESETS: Record<string, BrandPreset> = {
  "noir-gold": {
    id: "noir-gold",
    label: "Noir Gold",
    description: "Fondo noir con acento dorado. Sobrio, lujoso.",
    mode: "dark",
    bg: BRAND.noir,
    surface: BRAND.noirSurface,
    sidebar: BRAND.noirSidebar,
    border: BRAND.border,
    text: BRAND.cream,
    textMuted: BRAND.creamMuted,
    accent: BRAND.gold,
    accentHover: BRAND.goldHover,
    accentSecondary: BRAND.burgundy,
  },
  "noir-burgundy": {
    id: "noir-burgundy",
    label: "Noir Burgundy",
    description: "Fondo noir con acento burdeos. Serio, editorial.",
    mode: "dark",
    bg: BRAND.noir,
    surface: BRAND.noirSurface,
    sidebar: BRAND.noirSidebar,
    border: BRAND.border,
    text: BRAND.cream,
    textMuted: BRAND.creamMuted,
    accent: BRAND.burgundyHover,
    accentHover: "#7d2330",
    accentSecondary: BRAND.gold,
  },
  "cream-gold": {
    id: "cream-gold",
    label: "Cream Gold",
    description: "Fondo crema con acento dorado. Claro, premium.",
    mode: "light",
    bg: BRAND.paper,
    surface: BRAND.paperSurface,
    sidebar: BRAND.paperSidebar,
    border: BRAND.borderLight,
    text: BRAND.ink,
    textMuted: BRAND.inkMuted,
    accent: BRAND.gold,
    accentHover: BRAND.goldHover,
    accentSecondary: BRAND.burgundy,
  },
};

export const BRAND_PRESET_ORDER = ["noir-gold", "noir-burgundy", "cream-gold"] as const;

export const SALES_DEFAULT_PRESET = "noir-gold";
export const MARKETING_DEFAULT_PRESET = "noir-burgundy";

export function getBrandPreset(id: string | undefined | null): BrandPreset {
  if (!id) return BRAND_PRESETS[SALES_DEFAULT_PRESET];
  return BRAND_PRESETS[id] ?? BRAND_PRESETS[SALES_DEFAULT_PRESET];
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex?.startsWith("#") || hex.length !== 7) return `rgba(209,156,21,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Returns CSS variable map for a brand preset. These variables drive both
 * shadcn tokens (--primary, --ring, --sidebar-*) and the marketing module's
 * own --mkt-* tokens, so the same preset works in either context.
 */
export function presetToCssVars(preset: BrandPreset, accentOverride?: string): Record<string, string> {
  const accent = accentOverride ?? preset.accent;
  return {
    "--background": preset.bg,
    "--foreground": preset.text,
    "--card": preset.surface,
    "--card-foreground": preset.text,
    "--popover": preset.surface,
    "--popover-foreground": preset.text,
    "--primary": accent,
    "--primary-foreground": preset.mode === "dark" ? BRAND.noir : "#ffffff",
    "--secondary": preset.surface,
    "--secondary-foreground": preset.text,
    "--muted": preset.surface,
    "--muted-foreground": preset.textMuted,
    "--accent": hexToRgba(accent, 0.08),
    "--accent-foreground": accent,
    "--border": preset.border,
    "--input": preset.border,
    "--ring": accent,
    "--sidebar": preset.sidebar,
    "--sidebar-foreground": preset.text,
    "--sidebar-primary": accent,
    "--sidebar-primary-foreground": preset.mode === "dark" ? BRAND.noir : "#ffffff",
    "--sidebar-accent": hexToRgba(accent, 0.08),
    "--sidebar-accent-foreground": accent,
    "--sidebar-border": preset.border,
    "--sidebar-ring": accent,
    // Marketing-scoped duplicates so marketing components read the same preset
    "--mkt-bg": preset.bg,
    "--mkt-surface": preset.surface,
    "--mkt-sidebar": preset.sidebar,
    "--mkt-border": preset.border,
    "--mkt-text": preset.text,
    "--mkt-text-muted": preset.textMuted,
    "--mkt-accent": accent,
    "--mkt-burgundy": preset.accentSecondary,
    "--mkt-nav-active-bg": hexToRgba(accent, 0.1),
    "--mkt-nav-active-text": accent,
    "--mkt-card": preset.surface,
  };
}
