import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

// POST /api/handoff — Marketing hands off a contact to the Sales pipeline
// Creates the contact (or finds existing) + creates a deal in the first pipeline stage
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, company, email, phone, industry, tier, score, marketingNotes, source } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Find or create the CRM contact
    let contactId: string;

    if (email) {
      const existing = db.select().from(contacts).where(eq(contacts.email, email)).get();
      if (existing) {
        // Update existing contact's temperature/score
        // Clear returnedToMarketing flag — re-handoff means this contact is back in sales
        db.update(contacts)
          .set({
            temperature: score >= 70 ? "hot" : score >= 45 ? "warm" : "cold",
            score: score || existing.score,
            notes: marketingNotes
              ? `[Marketing Handoff] ${marketingNotes}${existing.notes ? "\n" + existing.notes : ""}`
              : existing.notes,
            returnedToMarketingAt: null,
            returnedToMarketingReason: null,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, existing.id))
          .run();
        contactId = existing.id;
      } else {
        // Create new contact
        const newId = crypto.randomUUID();
        db.insert(contacts).values({
          id: newId,
          name,
          email,
          phone: phone || null,
          company: company || null,
          source: source || "marketing_handoff",
          temperature: score >= 70 ? "hot" : score >= 45 ? "warm" : "cold",
          score: score || 0,
          notes: marketingNotes ? `[Marketing Handoff] ${marketingNotes}` : `Tier ${tier} — pasado desde Marketing`,
          consentGiven: true,
          consentSource: "marketing",
        }).run();
        contactId = newId;
      }
    } else {
      // No email — always create new
      const newId = crypto.randomUUID();
      db.insert(contacts).values({
        id: newId,
        name,
        phone: phone || null,
        company: company || null,
        source: source || "marketing_handoff",
        temperature: score >= 70 ? "hot" : score >= 45 ? "warm" : "cold",
        score: score || 0,
        notes: marketingNotes ? `[Marketing Handoff] ${marketingNotes}` : `Tier ${tier} — pasado desde Marketing`,
        consentGiven: true,
        consentSource: "marketing",
      }).run();
      contactId = newId;
    }

    // Get first pipeline stage (Prospecto)
    const firstStage = db.select().from(pipelineStages)
      .orderBy(asc(pipelineStages.order))
      .get();

    if (!firstStage) {
      return NextResponse.json({ error: "No pipeline stages configured" }, { status: 500 });
    }

    // Create deal
    const dealId = crypto.randomUUID();
    db.insert(deals).values({
      id: dealId,
      title: `${name}${company ? " — " + company : ""}`,
      value: 0, // TBD by sales team
      stageId: firstStage.id,
      contactId,
      probability: tier === 1 ? 60 : tier === 2 ? 30 : 10,
      notes: `Tier ${tier} | Score ${score} | Handoff desde Marketing${industry ? ` | Industria: ${industry}` : ""}`,
    }).run();

    return NextResponse.json({
      success: true,
      contactId,
      dealId,
      message: `${name} agregado al pipeline de ventas en etapa "${firstStage.name}"`,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
