import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/payments/wompi/link
// MOCKUP: Generates a Wompi-style payment link for a deal.
// In production this would call Wompi's Payment Link API:
// https://docs.wompi.co/docs/colombia/link-de-pago/
// Body: { dealId: string }
export async function POST(req: Request) {
  try {
    const { dealId } = await req.json();
    if (!dealId) {
      return NextResponse.json({ error: "dealId required" }, { status: 400 });
    }

    const deal = db.select().from(deals).where(eq(deals.id, dealId)).get();
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    if (deal.value <= 0) {
      return NextResponse.json({ error: "Deal value must be > 0 to generate a payment link" }, { status: 400 });
    }

    // MOCK: Generate a Wompi-style reference + checkout URL.
    // Real call would be:
    //   POST https://production.wompi.co/v1/payment_links
    //   Headers: Authorization: Bearer <private_key>
    //   Body: { name, description, single_use: true, collect_shipping: false, currency: "COP", amount_in_cents }
    //   Response: { data: { id, checkout_url, status, ... } }
    const reference = `NEXUS-${deal.id.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
    const mockLinkId = `wompi_mock_${Math.random().toString(36).slice(2, 12)}`;
    const checkoutUrl = `https://checkout.wompi.co/l/${mockLinkId}`;

    db.update(deals).set({
      paymentLinkUrl: checkoutUrl,
      paymentStatus: "PENDING",
      paymentProvider: "wompi",
      paymentReference: reference,
      updatedAt: new Date(),
    }).where(eq(deals.id, dealId)).run();

    return NextResponse.json({
      ok: true,
      mock: true,
      dealId,
      reference,
      checkoutUrl,
      amountInCents: deal.value,
      currency: "COP",
      message: "Mock payment link generated. Replace MOCK section with real Wompi API call in production.",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
