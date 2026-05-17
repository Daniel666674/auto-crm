import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const SLACK_KEY = "slack_config";

export interface SlackConfig {
  webhookUrl: string;
  notifyDealWon: boolean;
  notifyDealLost: boolean;
  notifyLeadHot: boolean;
  notifyDealAged: boolean;
  notifyCampaignLaunched: boolean;
  notifyMktHandoff: boolean;
}

const DEFAULT_SLACK_CONFIG: SlackConfig = {
  webhookUrl: "",
  notifyDealWon: true,
  notifyDealLost: true,
  notifyLeadHot: true,
  notifyDealAged: false,
  notifyCampaignLaunched: true,
  notifyMktHandoff: true,
};

export async function getSlackConfig(): Promise<SlackConfig | null> {
  try {
    const row = db
      .select()
      .from(crmSettings)
      .where(eq(crmSettings.key, SLACK_KEY))
      .get();

    if (!row) return null;

    const parsed = JSON.parse(row.value) as Partial<SlackConfig>;
    const config: SlackConfig = { ...DEFAULT_SLACK_CONFIG, ...parsed };

    // Return null if no webhook URL configured
    if (!config.webhookUrl || config.webhookUrl.trim() === "") {
      return null;
    }

    return config;
  } catch {
    return null;
  }
}

export async function sendSlackNotification(
  webhookUrl: string,
  text: string,
  attachments?: object[]
): Promise<boolean> {
  try {
    const payload: { text: string; attachments?: object[] } = { text };
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// Called from deals API when stage changes to won/lost
export async function notifySlackDealClosed(
  deal: { id: string; title: string; value: number },
  stage: { name: string; isWon: boolean; isLost: boolean },
  contactName: string
): Promise<void> {
  const config = await getSlackConfig();
  if (!config) return;

  const isWon = stage.isWon;
  const isLost = stage.isLost;

  if (isWon && !config.notifyDealWon) return;
  if (isLost && !config.notifyDealLost) return;
  if (!isWon && !isLost) return;

  const emoji = isWon ? "✅" : "❌";
  const statusLabel = isWon ? "GANADO" : "PERDIDO";
  const valueFormatted = (deal.value / 100).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });

  const text = `${emoji} *Deal ${statusLabel}*`;
  const attachments = [
    {
      color: isWon ? "#16a34a" : "#dc2626",
      fields: [
        { title: "Deal", value: deal.title, short: true },
        { title: "Contacto", value: contactName, short: true },
        { title: "Valor", value: valueFormatted, short: true },
        { title: "Etapa", value: stage.name, short: true },
      ],
      footer: "BLACKSCALE NEXUS",
      ts: Math.floor(Date.now() / 1000),
    },
  ];

  await sendSlackNotification(config.webhookUrl, text, attachments);
}

// Marketing: campaign launched (status -> active)
export async function notifySlackCampaignLaunched(
  campaign: { id: string; name: string; channel: string; targetSegment: string; totalContacts: number }
): Promise<void> {
  const config = await getSlackConfig();
  if (!config) return;
  if (!config.notifyCampaignLaunched) return;

  const text = `📣 *Campaña lanzada*`;
  const attachments = [
    {
      color: "#6366f1",
      fields: [
        { title: "Campaña", value: campaign.name, short: true },
        { title: "Canal", value: campaign.channel, short: true },
        { title: "Segmento", value: campaign.targetSegment || "—", short: true },
        { title: "Contactos", value: String(campaign.totalContacts), short: true },
      ],
      footer: "BLACKSCALE NEXUS — Marketing",
      ts: Math.floor(Date.now() / 1000),
    },
  ];
  await sendSlackNotification(config.webhookUrl, text, attachments);
}

// Marketing: contact handed off to sales (ready_for_sales flips true)
export async function notifySlackMktHandoff(
  contact: { id: string; name: string; company: string; tier: number; score: number; email: string }
): Promise<void> {
  const config = await getSlackConfig();
  if (!config) return;
  if (!config.notifyMktHandoff) return;

  const text = `🤝 *Handoff a ventas*`;
  const attachments = [
    {
      color: "#22c55e",
      fields: [
        { title: "Contacto", value: contact.name, short: true },
        { title: "Empresa", value: contact.company || "—", short: true },
        { title: "Tier", value: `T${contact.tier}`, short: true },
        { title: "Score", value: `${contact.score}`, short: true },
        { title: "Email", value: contact.email || "—", short: false },
      ],
      footer: "BLACKSCALE NEXUS — Marketing",
      ts: Math.floor(Date.now() / 1000),
    },
  ];
  await sendSlackNotification(config.webhookUrl, text, attachments);
}

// Called from contacts/classify when score crosses hot threshold
export async function notifySlackLeadHot(
  contact: { id: string; name: string; company: string | null; score: number }
): Promise<void> {
  const config = await getSlackConfig();
  if (!config) return;
  if (!config.notifyLeadHot) return;

  const text = `🔥 *Lead caliente detectado*`;
  const attachments = [
    {
      color: "#ea580c",
      fields: [
        { title: "Nombre", value: contact.name, short: true },
        { title: "Empresa", value: contact.company ?? "—", short: true },
        { title: "Score", value: `${contact.score}/100`, short: true },
      ],
      footer: "BLACKSCALE NEXUS",
      ts: Math.floor(Date.now() / 1000),
    },
  ];

  await sendSlackNotification(config.webhookUrl, text, attachments);
}
