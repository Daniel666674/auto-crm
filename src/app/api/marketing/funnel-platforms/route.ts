import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/marketing/funnel-platforms
// "Funnel por Plataforma" — faithful port of Julian's design. Maps each ad channel
// to the funnel stage it runs in (Awareness/TOFU -> Consideration/MOFU ->
// Conversion/BOFU), with health vs. stage-gate criteria and automatic gap detection.
//
// Values are display-ready and seeded to match the approved mockup. They live in
// crmSettings ("funnel_platforms_v2") so they are editable and will be replaced by
// live platform metrics once Meta / LinkedIn / Google Ads APIs are connected.

export const dynamic = "force-dynamic";

const CONFIG_KEY = "funnel_platforms_v2";

type Stage = "awareness" | "consideration" | "conversion";

interface PlatformView {
  id: "linkedin" | "meta" | "google_ads";
  label: string;
  color: string;
  stage: Stage;
  stageLabel: string;
  badge: string;
  activeCampaigns: number;
  contextLabel: string;
  headline: { display: string; unit: string; prefix: string };
  cardGoal: { label: string; value: string; delta: string; positive: boolean } | null;
  health: {
    value: string; unit: string; goalLabel: string; pct: number; pctLabel: string;
    metrics: { label: string; value: string }[];
  };
}

interface FunnelPayload {
  periodDays: number;
  lastSyncMinutes: number;
  activePlatforms: number;
  platforms: PlatformView[];
  stageSummary: Record<Stage, string[]>;
  gaps: { stage: Stage; title: string; message: string }[];
  stageGates: {
    platform: string; label: string; color: string; fromLabel: string; toLabel: string;
    criteria: { label: string; text: string; met: boolean }[]; pending: number; total: number;
  }[];
}

// Seeded to match the approved Funnel por Plataforma render exactly.
function seed(): FunnelPayload {
  const platforms: PlatformView[] = [
    {
      id: "linkedin", label: "LinkedIn", color: "#0a66c2",
      stage: "awareness", stageLabel: "Awareness", badge: "Brand", activeCampaigns: 1,
      contextLabel: "Campaña activa",
      headline: { display: "142K", unit: "impresiones", prefix: "" },
      cardGoal: { label: "Meta", value: "100K", delta: "+42%", positive: true },
      health: {
        value: "142,389", unit: "IMPRESIONES", goalLabel: "Stage gate: 250K imp.", pct: 57, pctLabel: "al gate",
        metrics: [{ label: "CPM", value: "$28.40K" }, { label: "Frecuencia", value: "1.8" }],
      },
    },
    {
      id: "meta", label: "Meta", color: "#1877f2",
      stage: "awareness", stageLabel: "Awareness", badge: "Followers", activeCampaigns: 2,
      contextLabel: "Crecimiento de audiencia",
      headline: { display: "318", unit: "seguidores", prefix: "+" },
      cardGoal: null,
      health: {
        value: "+318", unit: "SEGUIDORES", goalLabel: "Meta mensual: 500", pct: 64, pctLabel: "al goal",
        metrics: [{ label: "CPM", value: "$4.20K" }, { label: "Engagement", value: "5.8%" }],
      },
    },
    {
      id: "google_ads", label: "Google Ads", color: "#ea4335",
      stage: "conversion", stageLabel: "Conversion", badge: "Search", activeCampaigns: 2,
      contextLabel: "Conversiones (30d)",
      headline: { display: "23", unit: "leads", prefix: "" },
      cardGoal: { label: "CPL", value: "$185K COP", delta: "-8%", positive: true },
      health: {
        value: "23", unit: "LEADS", goalLabel: "Meta mensual: 30 leads", pct: 77, pctLabel: "al goal",
        metrics: [{ label: "CPL", value: "$185K" }, { label: "CTR Search", value: "6.4%" }],
      },
    },
  ];

  const byStage: Record<Stage, string[]> = { awareness: [], consideration: [], conversion: [] };
  for (const p of platforms) byStage[p.stage].push(p.label);

  return {
    periodDays: 30,
    lastSyncMinutes: 4,
    activePlatforms: platforms.filter(p => p.activeCampaigns > 0).length,
    platforms,
    stageSummary: byStage,
    gaps: [
      {
        stage: "consideration",
        title: "Tu funnel tiene un hueco en Consideration",
        message: "LinkedIn ya generó 142K impresiones de awareness pero ninguna plataforma está corriendo campañas de consideration (retargeting, lead magnets, mid-funnel content). Los leads de Google llegan en frío sin nutrición previa. Recomendación: lanza una campaña de retargeting en Meta hacia visitantes de LinkedIn antes de que se enfríen.",
      },
    ],
    stageGates: [
      {
        platform: "linkedin", label: "LinkedIn", color: "#0a66c2", fromLabel: "Awareness", toLabel: "Consideration",
        criteria: [
          { label: "Impresiones", text: "142K / 250K imp.", met: false },
          { label: "Frecuencia", text: "1.8 / 2.5", met: false },
          { label: "CPM", text: "$28.40K / < $35K", met: true },
        ],
        pending: 2, total: 3,
      },
      {
        platform: "meta", label: "Meta", color: "#1877f2", fromLabel: "Awareness", toLabel: "Consideration",
        criteria: [
          { label: "Seguidores", text: "318 / 500", met: false },
          { label: "Engagement", text: "5.8% / ≥ 4%", met: true },
          { label: "CPM", text: "$4.20K / < $35K", met: true },
        ],
        pending: 1, total: 3,
      },
    ],
  };
}

export async function GET() {
  try {
    let payload = seed();
    try {
      const row = db.select().from(crmSettings).where(eq(crmSettings.key, CONFIG_KEY)).get();
      if (row?.value) payload = { ...payload, ...(JSON.parse(row.value) as Partial<FunnelPayload>) };
    } catch { /* keep seed on parse error */ }
    return NextResponse.json(payload);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT — persist an edited funnel (Editar reglas / Nueva campaña / live sync).
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const value = JSON.stringify(body);
    const exists = db.select().from(crmSettings).where(eq(crmSettings.key, CONFIG_KEY)).get();
    if (exists) db.update(crmSettings).set({ value }).where(eq(crmSettings.key, CONFIG_KEY)).run();
    else db.insert(crmSettings).values({ key: CONFIG_KEY, value }).run();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
