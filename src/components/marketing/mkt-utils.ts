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
} as Record<string, string>;
