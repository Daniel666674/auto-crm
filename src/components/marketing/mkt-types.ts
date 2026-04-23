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
  brevoCadence: string;
  engagementStatus: "hot" | "warm" | "cold" | "dead";
  emailOpens: number;
  emailClicks: number;
  leadSourceDetail: string;
  marketingNotes: string;
  readyForSales: boolean;
  passedToSalesAt: number | null;
  industry: string;
  lastActivity: number;
}

export interface MktCampaign {
  id: string;
  name: string;
  status: "active" | "paused" | "completed";
  startDate: number;
  targetSegment: string;
  cadenceType: string;
  openRate: number;
  clickRate: number;
  replyRate: number;
  totalContacts: number;
  conversions: number;
  lastSent: number | null;
}

export type MktSection = "engagement" | "campaigns" | "segments" | "attribution" | "handoff";

export const MKT_SOURCES = ["website", "referido", "redes_sociales", "formulario", "evento", "llamada_fria", "whatsapp"] as const;
export type MktSource = typeof MKT_SOURCES[number];

export const MKT_SOURCE_LABELS: Record<string, string> = {
  website: "Sitio Web", referido: "Referido", redes_sociales: "Redes Sociales",
  formulario: "Formulario", evento: "Evento", llamada_fria: "Llamada Fría", whatsapp: "WhatsApp",
};

export const MKT_INDUSTRIES = [
  "Tecnología", "Inmobiliaria", "Consultoría", "E-commerce", "Marketing",
  "Logística", "Salud", "Alimentos", "Finanzas", "Educación", "Construcción",
];
