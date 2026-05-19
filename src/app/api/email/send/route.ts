import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { activities } from "@/db/schema";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY no configurado" },
      { status: 400 }
    );
  }

  let body: { contactId?: string; to?: string; subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { contactId, to, subject, body: emailBody } = body;
  if (!to || !subject || !emailBody || !contactId) {
    return NextResponse.json(
      { error: "contactId, to, subject y body son requeridos" },
      { status: 400 }
    );
  }

  const from =
    process.env.DIGEST_FROM || "nexus@blackscale.consulting";

  let resendId: string | undefined;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html: emailBody.replace(/\n/g, "<br>"),
        text: emailBody,
      }),
    });

    const data = (await res.json()) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || data.name || "Error al enviar email" },
        { status: res.status }
      );
    }
    resendId = data.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de red";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Log activity directly
  try {
    db.insert(activities)
      .values({
        id: crypto.randomUUID(),
        type: "email",
        description: `Email enviado: ${subject}`,
        contactId,
        completedAt: new Date(),
        createdAt: new Date(),
      })
      .run();
  } catch {
    // Non-fatal — email was sent, just couldn't log
  }

  return NextResponse.json({ success: true, id: resendId });
}
