export interface PortalWidget {
  id: string;
  category: "sales" | "marketing" | "shared";
  label: string;
  description: string;
  requires?: string[];
}

export const PORTAL_WIDGETS: PortalWidget[] = [
  // Sales
  { id: "kpi-strip", category: "sales", label: "Resumen ejecutivo (KPIs)", description: "Pipeline total, deals abiertos, próximo cierre" },
  { id: "deals-table", category: "sales", label: "Estado de oportunidades", description: "Tabla con stage, valor, salud y cierre esperado" },
  { id: "activity-feed", category: "sales", label: "Actividad reciente", description: "Últimas 15 interacciones registradas" },
  { id: "next-steps", category: "sales", label: "Próximos pasos", description: "Follow-ups planeados con prioridad" },
  { id: "funnel", category: "sales", label: "Embudo de conversión", description: "Distribución de deals por etapa", requires: ["pipeline-stages"] },
  { id: "kpis-month", category: "sales", label: "KPIs del mes", description: "Win rate, ciclo de venta, revenue cerrado, ticket promedio" },
  // Marketing
  { id: "mkt-engagement", category: "marketing", label: "Engagement de marketing", description: "Emails enviados, open/click rate, leads calientes" },
  { id: "mkt-campaigns", category: "marketing", label: "Campañas activas", description: "Métricas por campaña (open, click, conversiones)" },
  { id: "mkt-attribution", category: "marketing", label: "Atribución de revenue", description: "Qué canales/campañas generaron deals ganados" },
];

export const REQUIREMENTS_MAP: Record<string, { label: string; detail: string }> = {
  "logo": { label: "Logo del cliente (SVG o PNG transparente)", detail: "Para encabezado del dashboard" },
  "brand-colors": { label: "Color primario y secundario (hex)", detail: "Para acentos del dashboard del cliente" },
  "pipeline-stages": { label: "Etapas de pipeline configuradas en Nexus", detail: "Las etapas se toman de tu pipeline activo" },
  "primary-contact": { label: "Contacto principal del cliente", detail: "Para asociar todos los deals/activities" },
  "kpi-targets": { label: "Metas trimestrales del cliente (revenue, deals, win rate)", detail: "Opcional, mejora la lectura de los KPIs" },
  "report-cadence": { label: "Cadencia de reporte acordada (semanal / mensual / trimestral)", detail: "Para etiquetar el dashboard" },
};

export interface PortalConfig {
  widgets: string[];
  branding: { companyName?: string; logoUrl?: string; primaryColor?: string };
  reportCadence: "weekly" | "monthly" | "quarterly";
  kpiTargets?: {
    revenue?: number;
    deals?: number;
    winRate?: number;
    // New per-portal targets (used by the editor + portal page)
    monthlyRevenueTarget?: number;   // cents
    monthlyLeadsTarget?: number;     // count of new contacts/leads
    pipelineCoverageTarget?: number; // multiplier (e.g. 3)
  };
}

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  widgets: ["kpi-strip", "deals-table", "activity-feed", "next-steps"],
  branding: {},
  reportCadence: "monthly",
};
