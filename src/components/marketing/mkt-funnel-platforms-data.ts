// Funnel por Plataforma — STRUCTURE ONLY. No hardcoded observed metrics.
// Every number comes from the API (real CRM data + live/manual ad metrics).
// What lives here: stage definitions, platform identity (color/label/stage),
// KPI labels, and stage-gate GOAL targets (objectives the team sets — not data).
// Missing metrics render as "—" until a value is entered or a platform connects.

export type StageKey = "awareness" | "consideration" | "conversion" | "retention" | "inactive";
export type PlatformKey = "linkedin" | "meta" | "google";

export const FP_STAGE_COLOR: Record<StageKey, string> = {
  awareness: "#5b8def", consideration: "#c084fc", conversion: "#34d399", retention: "#f97316", inactive: "#6e6e7a",
};
export const FP_PLATFORM_COLOR: Record<PlatformKey, string> = {
  linkedin: "#0a66c2", meta: "#0866ff", google: "#ea4335",
};
export const FP_DELTA_UP = "#6ee7b7";
export const FP_DELTA_DOWN = "#fca5a5";

export const FP_PILL: Record<StageKey, { bg: string; color: string; border: string }> = {
  awareness: { bg: "rgba(91,141,239,0.12)", color: "#93b4f5", border: "rgba(91,141,239,0.3)" },
  consideration: { bg: "rgba(192,132,252,0.12)", color: "#d0a6fc", border: "rgba(192,132,252,0.3)" },
  conversion: { bg: "rgba(52,211,153,0.12)", color: "#6ee7b7", border: "rgba(52,211,153,0.3)" },
  retention: { bg: "rgba(249,115,22,0.12)", color: "#fdba74", border: "rgba(249,115,22,0.3)" },
  inactive: { bg: "rgba(110,110,122,0.12)", color: "#6e6e7a", border: "rgba(110,110,122,0.25)" },
};

export type Seg = { t: string; em?: "gold" | "warn" | "strong" };

const DASH = "—";

export interface Puck {
  platform: PlatformKey; col: 0 | 1 | 2; topPx: number;
  label: string; pill: string; pillStage: StageKey;
  context: string; value: string; unit: string; footer: string; delta: string; deltaUp: boolean;
}
export interface HealthCard {
  platform: PlatformKey; name: string; sub: string; stage: StageKey; stageLabel: string;
  value: string; unit: string; pct: number; gateLabel: string; pctLabel: string;
  metrics: { label: string; value: string }[];
}
export interface GateRow {
  platform: PlatformKey; name: string; from: { label: string; stage: StageKey }; to: { label: string; stage: StageKey };
  criteria: { state: "check" | "pending" | "fail"; text: string }[];
  action: { type: "text" | "button"; text: string };
}

// Default empty template — the API replaces this wholesale with real data.
export const FP_OVERVIEW = {
  header: {
    title: "Funnel por Plataforma",
    pill: "0 plataformas activas",
    subtitle: "Mapa en vivo de qué etapa del embudo está corriendo cada canal pagado y orgánico",
  },
  lastSync: "sin sincronizar",
  banner: {
    title: "Conecta tus plataformas para activar el funnel",
    pill: "Configuración",
    body: [
      { t: "Aún no hay datos de pauta. Ingresa tu inversión en " },
      { t: "Datos de Pauta", em: "gold" },
      { t: " o conecta Meta / LinkedIn / Google Ads para ver impresiones, CPM, CPL y ROAS reales. Los leads y revenue ya salen del CRM cuando etiquetas el origen de cada contacto." },
    ] as Seg[],
    button: "Crear tarea de campaña",
  },
  stages: [
    { key: "awareness" as StageKey, label: "Awareness · TOFU", objective: "Maximizar alcance e impresiones. KPI: CPM, impresiones, frecuencia." },
    { key: "consideration" as StageKey, label: "Consideration · MOFU", objective: "Generar engagement y leads. KPI: CTR, leads, CPL." },
    { key: "conversion" as StageKey, label: "Conversion · BOFU", objective: "Cerrar y atribuir revenue. KPI: conversiones, CAC, ROAS." },
  ],
  pucks: [
    { platform: "linkedin", col: 0, topPx: 110, label: "LinkedIn", pill: "Awareness", pillStage: "awareness", context: "Impresiones · 30d", value: DASH, unit: "impresiones", footer: "", delta: "", deltaUp: true },
    { platform: "meta", col: 0, topPx: 220, label: "Meta", pill: "Awareness", pillStage: "awareness", context: "Seguidores · 30d", value: DASH, unit: "seguidores", footer: "", delta: "", deltaUp: true },
    { platform: "google", col: 2, topPx: 165, label: "Google Ads", pill: "Conversion", pillStage: "conversion", context: "Leads · 30d", value: DASH, unit: "leads", footer: "", delta: "", deltaUp: true },
  ] as Puck[],
  emptyStage: {
    title: "Etapa vacía",
    body: "No tienes campañas activas en esta etapa. Riesgo de perder leads.",
    cta: "+ Crear campaña →",
  },
  tallies: [
    { label: "Plataformas en awareness", value: "0", color: "awareness" as StageKey, note: "—", noteColor: "muted" as "muted" | "retention", dashed: false },
    { label: "Plataformas en consideration", value: "0", color: "consideration" as StageKey, note: "—", noteColor: "muted" as "muted" | "retention", dashed: false },
    { label: "Plataformas en conversion", value: "0", color: "conversion" as StageKey, note: "—", noteColor: "muted" as "muted" | "retention", dashed: false },
  ],
  health: [
    { platform: "linkedin", name: "LinkedIn", sub: "Sin datos", stage: "awareness", stageLabel: "Awareness", value: DASH, unit: "Impresiones · 30d", pct: 0, gateLabel: "Meta: 250K imp.", pctLabel: DASH, metrics: [{ label: "CPM", value: DASH }, { label: "Frecuencia", value: DASH }] },
    { platform: "meta", name: "Meta", sub: "Sin datos", stage: "awareness", stageLabel: "Awareness", value: DASH, unit: "Seguidores · 30d", pct: 0, gateLabel: "Meta mensual: 500", pctLabel: DASH, metrics: [{ label: "CPM", value: DASH }, { label: "Engagement", value: DASH }] },
    { platform: "google", name: "Google Ads", sub: "Sin datos", stage: "conversion", stageLabel: "Conversion", value: DASH, unit: "Leads · 30d", pct: 0, gateLabel: "Meta mensual: 30 leads", pctLabel: DASH, metrics: [{ label: "CPL", value: DASH }, { label: "CTR Search", value: DASH }] },
  ] as HealthCard[],
  stageGates: [
    { platform: "linkedin", name: "LinkedIn", from: { label: "Awareness", stage: "awareness" }, to: { label: "Consideration", stage: "consideration" }, criteria: [{ state: "pending", text: `${DASH} / 250K imp.` }, { state: "pending", text: `Freq ${DASH} / 2.5` }, { state: "pending", text: `CPM ${DASH} / < $35K` }], action: { type: "text", text: "Sin datos" } },
    { platform: "meta", name: "Meta", from: { label: "Followers", stage: "awareness" }, to: { label: "Retargeting", stage: "consideration" }, criteria: [{ state: "pending", text: `${DASH} / 250 fans` }, { state: "pending", text: `Eng ${DASH} / 3%` }, { state: "pending", text: `Pixel ${DASH}` }], action: { type: "text", text: "Sin datos" } },
    { platform: "google", name: "Google Ads", from: { label: "Search BOFU", stage: "conversion" }, to: { label: "Scale", stage: "retention" }, criteria: [{ state: "pending", text: `CPL ${DASH} / < $250K` }, { state: "pending", text: `Conv ${DASH}` }, { state: "pending", text: `${DASH} / 30 leads/mes` }], action: { type: "text", text: "Sin datos" } },
  ] as GateRow[],
  budget: {
    distribution: [
      { stage: "awareness" as StageKey, label: "Awareness", amount: DASH, pct: 0 },
      { stage: "consideration" as StageKey, label: "Consideration", amount: DASH, pct: 0 },
      { stage: "conversion" as StageKey, label: "Conversion", amount: DASH, pct: 0 },
    ],
    benchmark: [
      { t: "Benchmark B2B saludable:", em: "strong" },
      { t: " 40% Awareness / 35% Consideration / 25% Conversion. Registra inversión para comparar tu mezcla." },
    ] as Seg[],
    total: { amount: DASH, note: "registra inversión", breakdown: [
      { platform: "linkedin" as PlatformKey, label: "LinkedIn", amount: DASH },
      { platform: "google" as PlatformKey, label: "Google", amount: DASH },
      { platform: "meta" as PlatformKey, label: "Meta", amount: DASH },
    ] },
  },
};

export interface ProgressionCol {
  active: boolean; title: string; stage?: StageKey; sub: string;
  detail?: string; detailStrong?: string; detailColor?: "up" | "muted";
}
export interface KpiCard { label: string; value: string; note: string; up?: boolean }
export interface CampaignCell { v?: string; pill?: StageKey; up?: boolean; strong?: boolean; status?: boolean }
export interface CampaignRow { name: string; sub: string; cells: CampaignCell[]; action: string }
export interface Recommendation { variant: "banner" | "success"; eyebrow: string; title: string; body: Seg[]; button?: string }
export interface PlatformDetail {
  platform: PlatformKey; name: string; stagePill: { label: string; stage: StageKey }; subtitle: string; createBtn: string;
  progression: { note: string; active: 0 | 1 | 2; glow: boolean; cols: ProgressionCol[] };
  kpis: KpiCard[];
  campaigns: { columns: string[]; rows: CampaignRow[] };
  recommendations: Recommendation[];
}

export const FP_PLATFORMS: Record<PlatformKey, PlatformDetail> = {
  linkedin: {
    platform: "linkedin", name: "LinkedIn Ads", stagePill: { label: "Awareness · TOFU", stage: "awareness" }, subtitle: "Sin datos", createBtn: "+ Crear campaña LinkedIn",
    progression: {
      note: "Dónde estás vs. dónde te llevarán los stage gates", active: 0, glow: true,
      cols: [
        { active: true, title: "Awareness", stage: "awareness", sub: "Sponsored Content + Single Image Ads", detailStrong: DASH },
        { active: false, title: "Consideration", sub: "Lead Gen Forms + Document Ads", detail: DASH },
        { active: false, title: "Conversion", sub: "Conversation Ads + Retargeting", detail: DASH },
      ],
    },
    kpis: [
      { label: "Impresiones", value: DASH, note: "" }, { label: "Reach", value: DASH, note: "" },
      { label: "Frecuencia", value: DASH, note: "" }, { label: "CPM", value: DASH, note: "" },
      { label: "Engagement Rate", value: DASH, note: "" },
    ],
    campaigns: { columns: ["Campaña", "Objetivo", "Etapa", "Impresiones", "CTR", "Spend", "Status", ""], rows: [] },
    recommendations: [],
  },
  meta: {
    platform: "meta", name: "Meta Ads · FB + IG", stagePill: { label: "Awareness · Followers", stage: "awareness" }, subtitle: "Sin datos", createBtn: "+ Crear campaña Meta",
    progression: {
      note: "Meta es ideal para crecer una audiencia caliente que luego retargets a conversion", active: 0, glow: false,
      cols: [
        { active: true, title: "Followers / Brand", stage: "awareness", sub: "Reels + Page Likes", detailStrong: DASH },
        { active: false, title: "Retargeting", sub: "Lookalikes + Pixel audiences", detail: DASH },
        { active: false, title: "Lead Gen", sub: "Lead Ads + Instant Forms", detail: DASH },
      ],
    },
    kpis: [
      { label: "Seguidores nuevos", value: DASH, note: "" }, { label: "Alcance", value: DASH, note: "" },
      { label: "CPM", value: DASH, note: "" }, { label: "Engagement Rate", value: DASH, note: "" },
      { label: "Pixel events", value: DASH, note: "" },
    ],
    campaigns: { columns: ["Campaña", "Objetivo", "Etapa", "Alcance", "Engagement", "Spend", "Status", ""], rows: [] },
    recommendations: [],
  },
  google: {
    platform: "google", name: "Google Ads", stagePill: { label: "Conversion · BOFU", stage: "conversion" }, subtitle: "Sin datos", createBtn: "+ Crear campaña Google",
    progression: {
      note: "Google captura demanda existente — operas directo en conversion sin pasar por awareness", active: 2, glow: false,
      cols: [
        { active: false, title: "Awareness", sub: "Display / YouTube / Demand Gen", detail: "No aplica · captas demanda" },
        { active: false, title: "Consideration", sub: "Search broad + Display retargeting", detail: DASH },
        { active: true, title: "Search BOFU", stage: "conversion", sub: "Exact + Phrase match keywords", detailStrong: DASH },
      ],
    },
    kpis: [
      { label: "Leads", value: DASH, note: "" }, { label: "CPL", value: DASH, note: "" },
      { label: "CTR Search", value: DASH, note: "" }, { label: "Conv. Rate", value: DASH, note: "" },
      { label: "Quality Score", value: DASH, note: "" },
    ],
    campaigns: { columns: ["Campaña", "Tipo", "Etapa", "Leads", "CPL", "CTR", "Spend", ""], rows: [] },
    recommendations: [],
  },
};
