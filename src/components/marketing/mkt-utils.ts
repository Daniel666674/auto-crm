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

export const MKT_THEME_VARS = {
  "--mkt-bg": "#0a0a09",
  "--mkt-surface": "#11110F",
  "--mkt-sidebar": "#0c0c0b",
  "--mkt-border": "rgba(215,210,203,0.07)",
  "--mkt-text": "#D7D2CB",
  "--mkt-text-muted": "#7a756e",
  "--mkt-accent": "#D19C15",
  "--mkt-burgundy": "#551C25",
  "--mkt-nav-active-bg": "rgba(209,156,21,0.08)",
  "--mkt-nav-active-text": "#D19C15",
  "--mkt-card": "#11110F",
} as Record<string, string>;

export const MKT_PRESETS: Record<string, Record<string, string>> = {
  "dark-luxury": { ...MKT_THEME_VARS },
  midnight: {
    "--mkt-bg": "#0d1117", "--mkt-surface": "#161b22", "--mkt-sidebar": "#0d1117",
    "--mkt-border": "rgba(100,130,160,0.15)", "--mkt-text": "#c9d1d9", "--mkt-text-muted": "#6e7681",
    "--mkt-accent": "#58a6ff", "--mkt-burgundy": "#1f6feb",
    "--mkt-nav-active-bg": "rgba(88,166,255,0.1)", "--mkt-nav-active-text": "#58a6ff", "--mkt-card": "#161b22",
  },
  forest: {
    "--mkt-bg": "#0a0f0b", "--mkt-surface": "#111914", "--mkt-sidebar": "#0a0f0b",
    "--mkt-border": "rgba(100,180,100,0.1)", "--mkt-text": "#d4e8d4", "--mkt-text-muted": "#6a8a6a",
    "--mkt-accent": "#4ade80", "--mkt-burgundy": "#166534",
    "--mkt-nav-active-bg": "rgba(74,222,128,0.08)", "--mkt-nav-active-text": "#4ade80", "--mkt-card": "#111914",
  },
  light: {
    "--mkt-bg": "#f8fafc", "--mkt-surface": "#ffffff", "--mkt-sidebar": "#f1f5f9",
    "--mkt-border": "rgba(0,0,0,0.08)", "--mkt-text": "#0f172a", "--mkt-text-muted": "#64748b",
    "--mkt-accent": "#D19C15", "--mkt-burgundy": "#6D1F2E",
    "--mkt-nav-active-bg": "rgba(209,156,21,0.1)", "--mkt-nav-active-text": "#B8860B", "--mkt-card": "#ffffff",
  },
};

export function getMktThemeVars(theme: string, accentOverride?: string): Record<string, string> {
  const preset = MKT_PRESETS[theme] ?? MKT_PRESETS["dark-luxury"];
  if (!accentOverride) return { ...preset };
  const hex = accentOverride;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    ...preset,
    "--mkt-accent": hex,
    "--mkt-nav-active-text": hex,
    "--mkt-nav-active-bg": `rgba(${r},${g},${b},0.1)`,
  };
}
