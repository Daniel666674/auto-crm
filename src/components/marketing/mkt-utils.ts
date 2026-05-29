import { BRAND_PRESETS, BRAND_PRESET_ORDER, getBrandPreset, presetToCssVars, MARKETING_DEFAULT_PRESET } from "@/lib/brand-presets";

export function mktFormatCOP(val: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(val);
}

export function mktFormatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? "Hace 1 min" : `Hace ${mins} min`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  return months === 1 ? "Hace 1 mes" : `Hace ${months} meses`;
}

export const MKT_DEFAULT_PRESET_ID = MARKETING_DEFAULT_PRESET;

/**
 * Initial inline CSS vars for the marketing module root container.
 * Includes BOTH --mkt-* tokens (marketing's own) AND shadcn tokens
 * (--primary, --ring, --sidebar-*, etc.) so the marketing subtree is
 * fully isolated from the sales theme applied to :root.
 */
export const MKT_THEME_VARS: Record<string, string> = presetToCssVars(getBrandPreset(MARKETING_DEFAULT_PRESET));

/**
 * Brand-approved marketing presets. Only the brandbook palette is allowed:
 * noir + cream + gold + burgundy. Sales pulls from the same source so the
 * two modules stay aligned to the brandbook.
 */
export const MKT_PRESETS: Record<string, Record<string, string>> = Object.fromEntries(
  BRAND_PRESET_ORDER.map(id => [id, presetToCssVars(BRAND_PRESETS[id])])
);

export function getMktThemeVars(theme: string, accentOverride?: string): Record<string, string> {
  const preset = getBrandPreset(theme);
  return presetToCssVars(preset, accentOverride);
}
