import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { mktDb } from "@/db/mkt-db";

// POST /api/return-to-marketing
// Resets ready_for_sales on the matching marketing contact so it re-appears in the marketing pipeline
export async function POST(req: Request) {
  try {
    const { contactId } = await req.json();
    if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

    const contact = db.select().from(contacts).where(eq(contacts.id, contactId)).get();
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    if (!contact.email) return NextResponse.json({ error: "Contact has no email — cannot match to marketing" }, { status: 400 });

    const result = mktDb
      .prepare("UPDATE mkt_contacts SET ready_for_sales = 0, passed_to_sales_at = NULL WHERE email = ?")
      .run(contact.email);

    if (result.changes === 0) {
      return NextResponse.json({ error: "No matching marketing contact found for this email" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
