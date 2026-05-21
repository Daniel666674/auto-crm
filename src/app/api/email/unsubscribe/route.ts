import { NextRequest, NextResponse } from "next/server";
import { suppress, logEmailEvent } from "@/lib/email";
import { db } from "@/db";
import { sequenceEnrollments, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function page(message: string): NextResponse {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Suscripción</title></head>` +
    `<body style="font-family:Arial,Helvetica,sans-serif;background:#0a0a09;color:#D7D2CB;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">` +
    `<div style="text-align:center;max-width:420px;padding:24px"><div style="font-size:18px;font-weight:700;color:#D19C15;margin-bottom:8px">BlackScale</div>` +
    `<div style="font-size:14px;line-height:1.6">${message}</div></div></body></html>`;
  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("a");
  const contactId = searchParams.get("c");

  if (!email) return page("Enlace de cancelación inválido.");

  suppress(email, "unsubscribe");
  logEmailEvent({ contactId, type: "unsubscribe" });

  // Pause any active sequence enrollments for this contact.
  if (contactId) {
    try {
      const contact = db.select().from(contacts).where(eq(contacts.id, contactId)).get();
      if (contact) {
        db.update(sequenceEnrollments)
          .set({ status: "paused", nextActionAt: null, lastError: "Contacto canceló suscripción" })
          .where(eq(sequenceEnrollments.contactId, contactId))
          .run();
      }
    } catch {
      /* non-fatal */
    }
  }

  return page("Has cancelado tu suscripción. No recibirás más correos automáticos de nuestra parte.");
}
