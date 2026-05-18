import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq } from "drizzle-orm";

const LIFECYCLE_ORDER = ["subscriber", "lead", "MQL", "SQL", "opportunity", "customer", "evangelist"];

// POST /api/brevo/score-event
// Called by Brevo webhook or manually when a contact opens/clicks an email.
// Bumps score, temperature and promotes lifecycle stage toward MQL.
// Body: { email: string; event: "open" | "click"; campaignId?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, event, campaignId } = body as { email: string; event: string; campaignId?: string };

    if (!email || !event) {
      return NextResponse.json({ error: "email and event required" }, { status: 400 });
    }

    const contact = db.select().from(contacts).where(eq(contacts.email, email)).get();
    if (!contact) {
      return NextResponse.json({ ok: false, reason: "contact not found" });
    }

    const scoreBoost = event === "click" ? 5 : 2;
    const newScore = Math.min(100, (contact.score ?? 0) + scoreBoost);
    const newTemp = newScore >= 70 ? "hot" : newScore >= 45 ? "warm" : contact.temperature;

    // Promote lifecycle: clicks trigger MQL if still subscriber/lead
    const currentIdx = LIFECYCLE_ORDER.indexOf(contact.lifecycleStage ?? "lead");
    let newLifecycle = contact.lifecycleStage ?? "lead";
    if (event === "click" && currentIdx <= LIFECYCLE_ORDER.indexOf("lead")) {
      newLifecycle = "MQL";
    }

    const updateData: Record<string, unknown> = {
      score: newScore,
      temperature: newTemp,
      lifecycleStage: newLifecycle,
      updatedAt: new Date(),
    };

    if (campaignId) {
      if (!contact.firstTouchCampaignId) updateData.firstTouchCampaignId = campaignId;
      updateData.lastTouchCampaignId = campaignId;
    }

    db.update(contacts).set(updateData).where(eq(contacts.id, contact.id)).run();

    return NextResponse.json({ ok: true, newScore, newTemp, newLifecycle, contactId: contact.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
