import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { closeReasons } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const results = db
    .select()
    .from(closeReasons)
    .orderBy(asc(closeReasons.type), asc(closeReasons.order))
    .all();

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin" && role !== "marketing") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  let body: { type?: string; label?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { type, label } = body;

  if (!type || !label) {
    return NextResponse.json(
      { error: "type y label son requeridos" },
      { status: 400 }
    );
  }

  if (type !== "won" && type !== "lost") {
    return NextResponse.json(
      { error: 'type debe ser "won" o "lost"' },
      { status: 400 }
    );
  }

  if (typeof label !== "string" || label.trim().length === 0) {
    return NextResponse.json(
      { error: "label no puede estar vacio" },
      { status: 400 }
    );
  }

  // Auto-assign next order for this type
  const existingOfType = db
    .select({ order: closeReasons.order })
    .from(closeReasons)
    .all()
    .filter((r) => r.order !== null);

  const maxOrder = existingOfType.reduce((max, r) => Math.max(max, r.order ?? 0), 0);

  const created = db
    .insert(closeReasons)
    .values({
      type,
      label: label.trim(),
      order: maxOrder + 1,
    })
    .returning()
    .get();

  return NextResponse.json(created, { status: 201 });
}
