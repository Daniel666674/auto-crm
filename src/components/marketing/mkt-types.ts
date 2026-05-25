export interface MktContact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  tier: number;
  temperature: string;
  score: number;
  engagementStatus: "hot" | "warm" | "cold" | "dead";
  emailOpens: number;
  emailClicks: number;
  leadSourceDetail: string;
  marketingNotes: string;
  readyForSales: boolean;
  passedToSalesAt: number | null;
  industry: string;
  lastActivity: number;
  linkedinUrl: string;
  jobTitle: string;
  companySize: string;
  location: string;
  emailVerified: boolean;
  emailBounced: boolean;
  emailUnsubscribed: boolean;
}

export interface MktCampaign {
  id: string;
  name: string;
  status: "active" | "paused" | "completed";
  startDate: number;
  targetSegment: string;
  cadenceType: string;
  channel: string;
  openRate: number;
  clickRate: number;
  replyRate: number;
  totalContacts: number;
  conversions: number;
  lastSent: number | null;
}

export type MktSection =
  | "engagement" | "campaigns" | "contacts" | "attribution" | "handoff"
  | "segment-health" | "icp-insights"
  | "pipeline-view" | "lead-velocity"
  | "mkt-analytics" | "intelligence"
  | "calendar" | "abm"
  | "digest" | "roi" | "export"
  | "integrations"
  | "reengagement"
  | "funnel"
  | "segments-builder"
  | "forecast" | "attribution-model"
  | "calculator"
  | "icp" | "segments" // legacy aliases kept for backward compat
  | "settings";

export const MKT_SOURCES = ["website", "referido", "redes_sociales", "formulario", "evento", "llamada_fria", "whatsapp"] as const;
export type MktSource = typeof MKT_SOURCES[number];

export const MKT_SOURCE_LABELS: Record<string, string> = {
  website: "Sitio Web", referido: "Referido", redes_sociales: "Redes Sociales",
  formulario: "Formulario", evento: "Evento", llamada_fria: "Llamada Fría", whatsapp: "WhatsApp",
};

export const MKT_INDUSTRIES = [
  "Seguros", "SaaS / IT", "Fintech", "Logística", "Servicios Profesionales",
  "Tecnología", "Inmobiliaria", "Consultoría", "E-commerce", "Marketing",
  "Salud", "Alimentos", "Finanzas", "Educación", "Construcción", "Otro",
];

export const MKT_CHANNELS = [
  { id: "email", label: "Email" },
  { id: "linkedin", label: "LinkedIn Ads" },
  { id: "facebook", label: "Facebook Ads" },
  { id: "instagram", label: "Instagram Ads" },
  { id: "meta", label: "Meta (FB+IG combo)" },
  { id: "google_ads", label: "Google Ads" },
  { id: "outbound", label: "Outbound Sequence" },
] as const;

export type MktChannel = typeof MKT_CHANNELS[number]["id"];
