import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recomputeContact } from "@/lib/fit-recompute";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const contact = db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .get();

  if (!contact) {
    return NextResponse.json(
      { error: "Contacto no encontrado" },
      { status: 404 }
    );
  }

  const contactDeals = db
    .select()
    .from(deals)
    .where(eq(deals.contactId, id))
    .all();

  const contactActivities = db
    .select()
    .from(activities)
    .where(eq(activities.contactId, id))
    .all();

  return NextResponse.json({
    ...contact,
    deals: contactDeals,
    activities: contactActivities,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const existing = db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .get();

  if (!existing) {
    return NextResponse.json(
      { error: "Contacto no encontrado" },
      { status: 404 }
    );
  }

  // Only allow updating specific fields
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.company !== undefined) updateData.company = body.company;
  if (body.source !== undefined) updateData.source = body.source;
  if (body.temperature !== undefined) updateData.temperature = body.temperature;
  if (body.score !== undefined) updateData.score = Math.max(0, Math.min(100, body.score));
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.title !== undefined) updateData.title = body.title || null;
  if (body.industry !== undefined) updateData.industry = body.industry || null;
  if (body.location !== undefined) updateData.location = body.location || null;
  if (body.linkedinUrl !== undefined) updateData.linkedinUrl = body.linkedinUrl || null;
  if (body.companyWebsite !== undefined) updateData.companyWebsite = body.companyWebsite || null;
  if (body.companyLinkedin !== undefined) updateData.companyLinkedin = body.companyLinkedin || null;
  if (body.employeeCount !== undefined) updateData.employeeCount = body.employeeCount ? Math.max(0, parseInt(String(body.employeeCount)) || 0) : null;
  if (body.whatsappNumber !== undefined) updateData.whatsappNumber = body.whatsappNumber || null;
  if (body.tags !== undefined) updateData.tags = body.tags || null;
  if (body.lifecycleStage !== undefined) updateData.lifecycleStage = body.lifecycleStage || "lead";
  if (body.customFields !== undefined) updateData.customFields = body.customFields ? JSON.stringify(body.customFields) : null;

  // VA-enriched marketing signals that feed the fit score
  const SIGNAL_FIELDS = ["sigLinkedinAds", "sigPostFreq", "sigDmActive", "sigMetaAds", "sigGoogleAds", "sigMgrNoHead", "sigVacancy"] as const;
  let signalsChanged = false;
  for (const f of SIGNAL_FIELDS) {
    if (body[f] !== undefined) {
      updateData[f] = f === "sigPostFreq" ? (body[f] || null) : !!body[f];
      signalsChanged = true;
    }
  }
  // Editing firmographics also changes the fit score.
  const fitFieldsChanged = signalsChanged ||
    body.title !== undefined || body.industry !== undefined || body.employeeCount !== undefined;

  db.update(contacts).set(updateData).where(eq(contacts.id, id)).run();

  // Recompute fit score + qualification when scoring inputs changed, then return
  // the freshly-scored row.
  if (fitFieldsChanged) {
    try { recomputeContact(id); } catch { /* non-fatal */ }
  }

  const result = db.select().from(contacts).where(eq(contacts.id, id)).get();
  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .get();

  if (!existing) {
    return NextResponse.json(
      { error: "Contacto no encontrado" },
      { status: 404 }
    );
  }

  db.delete(contacts).where(eq(contacts.id, id)).run();
  return NextResponse.json({ success: true });
}
