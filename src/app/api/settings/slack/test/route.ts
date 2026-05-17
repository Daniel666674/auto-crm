import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const SLACK_KEY = "slack_config";

interface SlackConfig {
  webhookUrl: string;
  notifyDealWon: boolean;
  notifyDealLost: boolean;
  notifyLeadHot: boolean;
  notifyDealAged: boolean;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  // Read slack config from DB
  const row = db
    .select()
    .from(crmSettings)
    .where(eq(crmSettings.key, SLACK_KEY))
    .get();

  let config: Partial<SlackConfig> = {};
  if (row) {
    try {
      config = JSON.parse(row.value) as Partial<SlackConfig>;
    } catch {
      return NextResponse.json({ error: "Configuracion de Slack invalida en base de datos" }, { status: 500 });
    }
  }

  if (!config.webhookUrl || config.webhookUrl.trim() === "") {
    return NextResponse.json(
      { error: "No hay webhook URL configurado. Guarda la configuracion de Slack primero." },
      { status: 400 }
    );
  }

  if (!config.webhookUrl.startsWith("https://hooks.slack.com/")) {
    return NextResponse.json(
      { error: 'webhookUrl debe comenzar con "https://hooks.slack.com/"' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "🔔 BLACKSCALE NEXUS — Integración de Slack activa y funcionando.",
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `Slack respondio con error ${response.status}: ${text}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: `Error al enviar mensaje de prueba: ${msg}` }, { status: 500 });
  }
}
