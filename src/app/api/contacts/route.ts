import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq, like, or, desc, isNull, and } from "drizzle-orm";
import { fireTriggers } from "@/lib/triggers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const temperature = searchParams.get("temperature");
  const source = searchParams.get("source");
  const includeReturned = searchParams.get("includeReturned") === "true";

  const conditions = [];

  if (!includeReturned) {
    // Exclude contacts that have been returned to marketing
    conditions.push(isNull(contacts.returnedToMarketingAt));
  }

  if (search) {
    conditions.push(
      or(
        like(contacts.name, `%${search}%`),
        like(contacts.email, `%${search}%`),
        like(contacts.company, `%${search}%`)
      )!
    );
  }

  if (temperature) {
    conditions.push(eq(contacts.temperature, temperature));
  }

  if (source) {
    conditions.push(eq(contacts.source, source));
  }

  const results = conditions.length > 0
    ? db.select().from(contacts).where(and(...conditions)).orderBy(desc(contacts.createdAt)).all()
    : db.select().from(contacts).orderBy(desc(contacts.createdAt)).all();

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { name, email, phone, company, source, temperature, score, notes, title, industry, location, linkedinUrl, whatsappNumber, customFields } =
    body;

  if (!name) {
    return NextResponse.json(
      { error: "El nombre es requerido" },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const result = db
      .insert(contacts)
      .values({
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        source: source || "otro",
        temperature: temperature || "cold",
        score: score || 0,
        notes: notes || null,
        title: title || null,
        industry: industry || null,
        location: location || null,
        linkedinUrl: linkedinUrl || null,
        whatsappNumber: whatsappNumber || null,
        customFields: customFields ? JSON.stringify(customFields) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    fireTriggers({
      event: "lead_created",
      data: {
        contactId: result.id,
        name: result.name,
        email: result.email ?? "",
        company: result.company ?? "",
        source: result.source,
        temperature: result.temperature,
      },
    }).catch(() => {});

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: `Error al crear contacto: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}
