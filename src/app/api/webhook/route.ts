import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities, crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// ─── CORS ────────────────────────────────────────────────────────────────────
// The webhook is intentionally public so external websites can POST leads.
// We allow all origins here; auth is handled by the optional webhook secret.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret",
};

// Preflight handler (browsers send this before cross-origin POSTs)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Field name mapping: common variations → standard field
const FIELD_MAP: Record<string, string> = {
  // Name
  name: "name",
  nombre: "name",
  full_name: "name",
  fullname: "name",
  first_name: "name",
  nombre_completo: "name",
  // Email
  email: "email",
  correo: "email",
  email_address: "email",
  correo_electronico: "email",
  // Phone
  phone: "phone",
  telefono: "phone",
  phone_number: "phone",
  cel: "phone",
  celular: "phone",
  whatsapp: "phone",
  movil: "phone",
  // Company
  company: "company",
  empresa: "company",
  company_name: "company",
  negocio: "company",
  organizacion: "company",
  // Notes / message
  notes: "notes",
  notas: "notes",
  message: "notes",
  mensaje: "notes",
  comments: "notes",
  comentarios: "notes",
  descripcion: "notes",
  // Source override (widget passes this)
  source: "source",
  fuente: "source",
  utm_source: "utm_source",
  utm_medium: "utm_medium",
  utm_campaign: "utm_campaign",
};

function extractFields(
  payload: Record<string, unknown>
): Record<string, string> {
  // Handle Typeform-style nested data
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
    const mappedField = FIELD_MAP[normalizedKey];
    if (mappedField && !result[mappedField]) {
      result[mappedField] = String(value).trim();
    }
  }

  // Handle "first_name + last_name" pattern
  if (!result.name) {
    const firstName =
      data.first_name || data.nombre || data.firstName || data.primer_nombre;
    const lastName =
      data.last_name || data.apellido || data.lastName || data.apellidos;
    if (firstName) {
      result.name = [firstName, lastName].filter(Boolean).join(" ").trim();
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  // Auth check: if a webhook secret is stored in settings, require it in the header
  const stored = db
    .select()
    .from(crmSettings)
    .where(eq(crmSettings.key, "webhook_secret"))
    .get();

  if (stored) {
    const secretHeader = request.headers.get("x-webhook-secret");
    if (!secretHeader || secretHeader !== stored.value) {
      return NextResponse.json(
        { error: "Secret invalido o faltante" },
        { status: 401, headers: CORS_HEADERS }
      );
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON invalido" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Honeypot: bots fill hidden fields — humans never see them
  if (payload._honey || payload.website_url) {
    // Silently accept so bots think they succeeded
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  }

  const fields = extractFields(payload);

  if (!fields.name) {
    return NextResponse.json(
      {
        error: "Campo 'name' o 'nombre' es requerido",
        received: Object.keys(payload),
        hint: "Campos soportados: name, nombre, email, phone, company, message",
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Build notes — append UTM info if present
  let notes = fields.notes || null;
  const utmParts = [
    fields.utm_source && `utm_source=${fields.utm_source}`,
    fields.utm_medium && `utm_medium=${fields.utm_medium}`,
    fields.utm_campaign && `utm_campaign=${fields.utm_campaign}`,
  ].filter(Boolean);
  if (utmParts.length) {
    notes = [notes, utmParts.join(" | ")].filter(Boolean).join("\n");
  }

  // Resolve source — widget can pass its own, fallback to "website"
  const source = fields.source || "website";

  try {
    const now = new Date();
    const contact = db
      .insert(contacts)
      .values({
        name: fields.name,
        email: fields.email || null,
        phone: fields.phone || null,
        company: fields.company || null,
        source,
        temperature: "cold",
        score: 0,
        notes,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    // Log activity
    const origin = request.headers.get("origin") || "web";
    db.insert(activities)
      .values({
        type: "note",
        description: `Lead recibido via formulario web${fields.company ? ` (${fields.company})` : ""} — origen: ${origin}`,
        contactId: contact.id,
        createdAt: now,
      })
      .run();

    return NextResponse.json(
      {
        success: true,
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          source: contact.source,
        },
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: `Error al crear contacto: ${error instanceof Error ? error.message : "Unknown"}`,
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
