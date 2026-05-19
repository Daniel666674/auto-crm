import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { clientPortals, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rows = db
    .select({
      id: clientPortals.id,
      token: clientPortals.token,
      contactId: clientPortals.contactId,
      title: clientPortals.title,
      createdAt: clientPortals.createdAt,
      createdBy: clientPortals.createdBy,
      contactName: contacts.name,
      contactCompany: contacts.company,
    })
    .from(clientPortals)
    .leftJoin(contacts, eq(clientPortals.contactId, contacts.id))
    .all();

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { contactId?: string; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { contactId, title } = body;
  if (!contactId) {
    return NextResponse.json({ error: "contactId es requerido" }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const row = db
    .insert(clientPortals)
    .values({
      token,
      contactId,
      title: title || "Portal del Cliente",
      createdBy: session.user?.email || undefined,
    })
    .returning()
    .get();

  return NextResponse.json(row, { status: 201 });
}
