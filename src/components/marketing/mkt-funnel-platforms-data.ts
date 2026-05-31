// Faithful data port of Julian's "Funnel por Plataforma" design (funnelplataformas_1.html).
// Display-ready strings; will be replaced by live Meta/LinkedIn/Google Ads metrics once connected.

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

// pill background / text / border per stage (from the mockup .stage-* classes)
export const FP_PILL: Record<StageKey, { bg: string; color: string; border: string }> = {
  awareness: { bg: "rgba(91,141,239,0.12)", color: "#93b4f5", border: "rgba(91,141,239,0.3)" },
  consideration: { bg: "rgba(192,132,252,0.12)", color: "#d0a6fc", border: "rgba(192,132,252,0.3)" },
  conversion: { bg: "rgba(52,211,153,0.12)", color: "#6ee7b7", border: "rgba(52,211,153,0.3)" },
  retention: { bg: "rgba(249,115,22,0.12)", color: "#fdba74", border: "rgba(249,115,22,0.3)" },
  inactive: { bg: "rgba(110,110,122,0.12)", color: "#6e6e7a", border: "rgba(110,110,122,0.25)" },
};

export type Seg = { t: string; em?: "gold" | "warn" | "strong" };

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

export const FP_OVERVIEW = {
  header: {
    title: "Funnel por Plataforma",
    pill: "3 plataformas activas",
    subtitle: "Mapa en vivo de qué etapa del embudo está corriendo cada canal pagado y orgánico",
  },
  lastSync: "hace 4 min",
  banner: {
    title: "Tu funnel tiene un hueco en Consideration",
    pill: "Detección automática",
    body: [
      { t: "LinkedIn ya generó 142K impresiones de awareness pero ninguna plataforma está corriendo campañas de consideration (retargeting, lead magnets, mid-funnel content). Los leads de Google llegan en frío sin nutrición previa. " },
      { t: "Recomendación:", em: "gold" },
      { t: " lanza una campaña de retargeting en Meta hacia visitantes de LinkedIn antes de que se enfríen." },
    ] as Seg[],
    button: "Crear campaña",
  },
  stages: [
    { key: "awareness" as StageKey, label: "Awareness · TOFU", objective: "Maximizar alcance e impresiones. KPI: CPM, impresiones, frecuencia." },
    { key: "consideration" as StageKey, label: "Consideration · MOFU", objective: "Generar engagement y leads. KPI: CTR, leads, CPL." },
    { key: "conversion" as StageKey, label: "Conversion · BOFU", objective: "Cerrar y atribuir revenue. KPI: conversiones, CAC, ROAS." },
  ],
  pucks: [
    { platform: "linkedin", col: 0, topPx: 110, label: "LinkedIn", pill: "Brand", pillStage: "awareness", context: "Campaña activa", value: "142K", unit: "impresiones", footer: "Meta: 100K · ", delta: "+42%", deltaUp: true },
    { platform: "meta", col: 0, topPx: 220, label: "Meta", pill: "Followers", pillStage: "awareness", context: "Crecimiento de audiencia", value: "+318", unit: "seguidores", footer: "CPM $4.20 · ", delta: "-12%", deltaUp: true },
    { platform: "google", col: 2, topPx: 165, label: "Google Ads", pill: "Search", pillStage: "conversion", context: "Conversiones (30d)", value: "23", unit: "leads", footer: "CPL $185K COP · ", delta: "-8%", deltaUp: true },
  ] as Puck[],
  emptyStage: {
    title: "Etapa vacía",
    body: "No tienes campañas activas en mid-funnel. Riesgo de perder leads tibios.",
    cta: "+ Crear campaña →",
  },
  tallies: [
    { label: "Plataformas en awareness", value: "2", color: "awareness" as StageKey, note: "LinkedIn, Meta", noteColor: "muted" as const, dashed: false },
    { label: "Plataformas en consideration", value: "0", color: "consideration" as StageKey, note: "⚠ Hueco crítico", noteColor: "retention" as const, dashed: true },
    { label: "Plataformas en conversion", value: "1", color: "conversion" as StageKey, note: "Google Ads", noteColor: "muted" as const, dashed: false },
  ],
  health: [
    { platform: "linkedin", name: "LinkedIn", sub: "1 campaña activa", stage: "awareness", stageLabel: "Awareness", value: "142,389", unit: "Impresiones · 30d", pct: 57, gateLabel: "Stage gate: 250K imp.", pctLabel: "57% al gate", metrics: [{ label: "CPM", value: "$28.40K" }, { label: "Frecuencia", value: "1.8" }] },
    { platform: "meta", name: "Meta", sub: "2 campañas activas", stage: "awareness", stageLabel: "Awareness", value: "+318", unit: "Seguidores · 30d", pct: 64, gateLabel: "Meta mensual: 500", pctLabel: "64% al goal", metrics: [{ label: "CPM", value: "$4.20K" }, { label: "Engagement", value: "5.8%" }] },
    { platform: "google", name: "Google Ads", sub: "2 campañas activas", stage: "conversion", stageLabel: "Conversion", value: "23", unit: "Leads · 30d", pct: 77, gateLabel: "Meta mensual: 30 leads", pctLabel: "77% al goal", metrics: [{ label: "CPL", value: "$185K" }, { label: "CTR Search", value: "6.4%" }] },
  ] as HealthCard[],
  stageGates: [
    { platform: "linkedin", name: "LinkedIn", from: { label: "Awareness", stage: "awareness" }, to: { label: "Consideration", stage: "consideration" }, criteria: [{ state: "pending", text: "142K / 250K imp." }, { state: "pending", text: "Freq 1.8 / 2.5" }, { state: "check", text: "CPM < $35K" }], action: { type: "text", text: "2/3 pendientes" } },
    { platform: "meta", name: "Meta", from: { label: "Followers", stage: "awareness" }, to: { label: "Retargeting", stage: "consideration" }, criteria: [{ state: "check", text: "+318 / 250 fans" }, { state: "check", text: "Eng 5.8% > 3%" }, { state: "pending", text: "Pixel: 1.2K eventos" }], action: { type: "button", text: "Promover →" } },
    { platform: "google", name: "Google Ads", from: { label: "Search BOFU", stage: "conversion" }, to: { label: "Scale", stage: "retention" }, criteria: [{ state: "check", text: "CPL $185K < $250K" }, { state: "check", text: "Conv rate 4.2%" }, { state: "pending", text: "23 / 30 leads/mes" }], action: { type: "button", text: "Subir presup. →" } },
  ] as GateRow[],
  budget: {
    distribution: [
      { stage: "awareness" as StageKey, label: "Awareness", amount: "$4.8M COP", pct: 62 },
      { stage: "consideration" as StageKey, label: "Consideration", amount: "$0", pct: 0 },
      { stage: "conversion" as StageKey, label: "Conversion", amount: "$2.9M COP", pct: 38 },
    ],
    benchmark: [
      { t: "Benchmark B2B saludable:", em: "strong" },
      { t: " 40% Awareness / 35% Consideration / 25% Conversion. Estás " },
      { t: "desbalanceado en Awareness", em: "warn" },
      { t: " y " },
      { t: "sin Consideration", em: "warn" },
      { t: "." },
    ] as Seg[],
    total: { amount: "$7.7M", note: "+18% vs mes anterior", breakdown: [
      { platform: "linkedin" as PlatformKey, label: "LinkedIn", amount: "$3.2M" },
      { platform: "google" as PlatformKey, label: "Google", amount: "$2.9M" },
      { platform: "meta" as PlatformKey, label: "Meta", amount: "$1.6M" },
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
    platform: "linkedin", name: "LinkedIn Ads", stagePill: { label: "Awareness · TOFU", stage: "awareness" }, subtitle: "1 campaña activa · 142K impresiones", createBtn: "+ Crear campaña LinkedIn",
    progression: {
      note: "Dónde estás vs. dónde te llevarán los stage gates", active: 0, glow: true,
      cols: [
        { active: true, title: "Awareness", stage: "awareness", sub: "Sponsored Content + Single Image Ads", detailStrong: "142K imp · 78K reach · 1.8 freq" },
        { active: false, title: "Consideration", sub: "Lead Gen Forms + Document Ads", detail: "Bloqueado · 57% al gate" },
        { active: false, title: "Conversion", sub: "Conversation Ads + Retargeting", detail: "Bloqueado · falta MQA" },
      ],
    },
    kpis: [
      { label: "Impresiones", value: "142,389", note: "+42% vs meta", up: true },
      { label: "Reach", value: "78,210", note: "55% audiencia" },
      { label: "Frecuencia", value: "1.8", note: "Óptimo: 2.5-3.5" },
      { label: "CPM", value: "$28.4K", note: "Bajo benchmark", up: true },
      { label: "Engagement Rate", value: "2.1%", note: "Sobre 1.8% promedio", up: true },
    ],
    campaigns: {
      columns: ["Campaña", "Objetivo", "Etapa", "Impresiones", "CTR", "Spend", "Status", ""],
      rows: [{ name: "BS_LI_BrandAware_Q2-26", sub: "Iniciada hace 28 días", cells: [{ v: "Brand Awareness" }, { pill: "awareness", v: "Awareness" }, { v: "142,389" }, { v: "2.1%", up: true }, { v: "$3.2M COP" }, { status: true, v: "Activa" }], action: "Ver detalle →" }],
    },
    recommendations: [
      { variant: "banner", eyebrow: "Próximo paso", title: "Suma 108K impresiones más antes de pasar a Consideration", body: [{ t: "A tu ritmo actual (5.1K/día) llegas al stage gate de 250K en " }, { t: "~21 días", em: "strong" }, { t: ". Mientras, sube la frecuencia objetivo a 2.5 con un retargeting suave." }], button: "Configurar retargeting" },
      { variant: "success", eyebrow: "Lo que está funcionando", title: "Tu CPM ($28.4K) está 18% bajo el benchmark B2B", body: [{ t: "Tu segmentación de audiencia + creativos está optimizando bien. Puedes escalar presupuesto hasta $5M sin perder eficiencia." }] },
    ],
  },
  meta: {
    platform: "meta", name: "Meta Ads · FB + IG", stagePill: { label: "Awareness · Followers", stage: "awareness" }, subtitle: "2 campañas · +318 fans este mes", createBtn: "+ Crear campaña Meta",
    progression: {
      note: "Meta es ideal para crecer una audiencia caliente que luego retargets a conversion", active: 0, glow: false,
      cols: [
        { active: true, title: "Followers / Brand", stage: "awareness", sub: "Reels + Page Likes", detailStrong: "+318 fans · 5.8% eng" },
        { active: false, title: "Retargeting", sub: "Lookalikes + Pixel audiences", detail: "Listo para activar →", detailColor: "up" },
        { active: false, title: "Lead Gen", sub: "Lead Ads + Instant Forms", detail: "Pendiente" },
      ],
    },
    kpis: [
      { label: "Seguidores nuevos", value: "+318", note: "64% al goal mensual", up: true },
      { label: "Alcance", value: "38.2K", note: "Únicos · 30d" },
      { label: "CPM", value: "$4.2K", note: "-12% vs anterior", up: true },
      { label: "Engagement Rate", value: "5.8%", note: "Excelente", up: true },
      { label: "Pixel events", value: "1,247", note: "Page views únicos" },
    ],
    campaigns: {
      columns: ["Campaña", "Objetivo", "Etapa", "Alcance", "Engagement", "Spend", "Status", ""],
      rows: [
        { name: "BS_MT_PageLikes_Always-On", sub: "Always on", cells: [{ v: "Page Likes" }, { pill: "awareness", v: "Awareness" }, { v: "22,840" }, { v: "6.4%", up: true }, { v: "$980K COP" }, { status: true, v: "Activa" }], action: "Detalle →" },
        { name: "BS_MT_Reels_BrandStory", sub: "Iniciada hace 14 días", cells: [{ v: "Video views" }, { pill: "awareness", v: "Awareness" }, { v: "15,360" }, { v: "5.1%", up: true }, { v: "$620K COP" }, { status: true, v: "Activa" }], action: "Detalle →" },
      ],
    },
    recommendations: [
      { variant: "banner", eyebrow: "Oportunidad clara", title: "Tienes 1,247 pixel events sin usar", body: [{ t: "Ya tienes suficiente data para crear una audiencia de retargeting. Lanzar Lead Ads hacia esos visitantes podría producir tus primeros leads de Meta este mes." }], button: "Lanzar retargeting" },
      { variant: "success", eyebrow: "Stage gate cumplido", title: "2 de 3 criterios listos para promover", body: [{ t: "Engagement rate y crecimiento de fans están sobre meta. Solo falta consolidar 250 pixel events más para abrir Consideration." }] },
    ],
  },
  google: {
    platform: "google", name: "Google Ads", stagePill: { label: "Conversion · BOFU", stage: "conversion" }, subtitle: "2 campañas · 23 leads / 30d", createBtn: "+ Crear campaña Google",
    progression: {
      note: "Google captura demanda existente — operas directo en conversion sin pasar por awareness", active: 2, glow: false,
      cols: [
        { active: false, title: "Awareness", sub: "Display / YouTube / Demand Gen", detail: "No aplica · captas demanda" },
        { active: false, title: "Consideration", sub: "Search broad + Display retargeting", detail: "Potencial cross-channel" },
        { active: true, title: "Search BOFU", stage: "conversion", sub: "Exact + Phrase match keywords", detailStrong: "23 leads · CPL $185K" },
      ],
    },
    kpis: [
      { label: "Leads", value: "23", note: "77% al goal mensual", up: true },
      { label: "CPL", value: "$185K", note: "-8% vs anterior", up: true },
      { label: "CTR Search", value: "6.4%", note: "Sobre benchmark", up: true },
      { label: "Conv. Rate", value: "4.2%", note: "Saludable B2B", up: true },
      { label: "Quality Score promedio", value: "7.8/10", note: "Buen ranking", up: true },
    ],
    campaigns: {
      columns: ["Campaña", "Tipo", "Etapa", "Leads", "CPL", "CTR", "Spend", ""],
      rows: [
        { name: "BS_GG_Search_Consultoria-BPO", sub: "Iniciada hace 45 días", cells: [{ v: "Search · Exact" }, { pill: "conversion", v: "Conversion" }, { v: "16", strong: true }, { v: "$162K", up: true }, { v: "7.2%" }, { v: "$1.8M COP" }], action: "Detalle →" },
        { name: "BS_GG_Search_AutomatizacionProcesos", sub: "Iniciada hace 22 días", cells: [{ v: "Search · Phrase" }, { pill: "conversion", v: "Conversion" }, { v: "7", strong: true }, { v: "$210K" }, { v: "5.1%" }, { v: "$1.1M COP" }], action: "Detalle →" },
      ],
    },
    recommendations: [
      { variant: "success", eyebrow: "Stage gate listo", title: "Sube presupuesto un 35%", body: [{ t: "CPL bajo benchmark + CTR saludable + Conv Rate 4.2%. Estás dejando leads sobre la mesa. Aumentar de $2.9M → $3.9M te debería traer ~8 leads adicionales sin perder eficiencia." }], button: "Solicitar aumento" },
      { variant: "banner", eyebrow: "Quick win", title: "Activa retargeting Display hacia Google clickers", body: [{ t: "Tienes 1,824 clickers que no convirtieron. Una campaña de Display ($300K/mes) puede recapturar el ~12% que se quedó en consideration." }] },
    ],
  },
};
