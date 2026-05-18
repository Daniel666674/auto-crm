import { NextRequest, NextResponse } from "next/server";

// WhatsApp Business API stub — wire WHATSAPP_API_TOKEN + WHATSAPP_PHONE_ID in .env to activate
export async function POST(request: NextRequest) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return NextResponse.json({ notConfigured: true, message: "Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_ID in .env to enable" });
  }

  let body: { to?: string; name?: string; message?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const { to, name, message } = body;
  if (!to) return NextResponse.json({ error: "Falta número de destino" }, { status: 400 });

  const phone = to.replace(/[^0-9]/g, "");
  const text = message || `Hola${name ? ` ${name}` : ""}, te contacto desde nuestro CRM. ¿Tienes un momento?`;

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error?.message || "Error de API" }, { status: 400 });
    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id });
  } catch {
    return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 });
  }
}
