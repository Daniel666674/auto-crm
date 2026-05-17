import { NextRequest, NextResponse } from "next/server";
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

const DEFAULT_CONFIG: SlackConfig = {
  webhookUrl: "",
  notifyDealWon: true,
  notifyDealLost: true,
  notifyLeadHot: true,
  notifyDealAged: false,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const row = db
    .select()
    .from(crmSettings)
    .where(eq(crmSettings.key, SLACK_KEY))
    .get();

  if (!row) {
    return NextResponse.json(DEFAULT_CONFIG);
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<SlackConfig>;
    return NextResponse.json({ ...DEFAULT_CONFIG, ...parsed });
  } catch {
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  let body: Partial<SlackConfig>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  // Validate webhookUrl if provided and non-empty
  if (
    body.webhookUrl !== undefined &&
    body.webhookUrl !== "" &&
    !body.webhookUrl.startsWith("https://hooks.slack.com/")
  ) {
    return NextResponse.json(
      { error: 'webhookUrl debe comenzar con "https://hooks.slack.com/"' },
      { status: 400 }
    );
  }

  const merged: SlackConfig = { ...DEFAULT_CONFIG, ...body };

  const existing = db
    .select()
    .from(crmSettings)
    .where(eq(crmSettings.key, SLACK_KEY))
    .get();

  if (existing) {
    db.update(crmSettings)
      .set({ value: JSON.stringify(merged) })
      .where(eq(crmSettings.key, SLACK_KEY))
      .run();
  } else {
    db.insert(crmSettings)
      .values({ key: SLACK_KEY, value: JSON.stringify(merged) })
      .run();
  }

  return NextResponse.json(merged);
}
