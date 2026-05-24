import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { customFieldDefs } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["text", "number", "select", "date", "boolean"];
const VALID_ENTITIES = ["contact", "deal"];

function slugify(label: string): string {
  return label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || `field_${Date.now()}`;
}

function isSuperadmin(role?: string) { return role === "superadmin" || role === "marketing"; }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const entity = new URL(req.url).searchParams.get("entity");
  const rows = db.select().from(customFieldDefs).orderBy(asc(customFieldDefs.order)).all();
  const filtered = entity ? rows.filter(r => r.entity === entity) : rows;
  return NextResponse.json(filtered.map(r => ({
    ...r,
    options: r.options ? (() => { try { return JSON.parse(r.options!); } catch { return []; } })() : [],
  })));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperadmin((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const body = await req.json() as { entity?: string; label?: string; type?: string; options?: string[] };
  if (!body.entity || !VALID_ENTITIES.includes(body.entity)) {
    return NextResponse.json({ error: "entity debe ser contact o deal" }, { status: 400 });
  }
  if (!body.label?.trim()) return NextResponse.json({ error: "label requerido" }, { status: 400 });
  const type = VALID_TYPES.includes(body.type ?? "") ? body.type! : "text";

  const existing = db.select().from(customFieldDefs).all();
  const maxOrder = existing.reduce((m, r) => Math.max(m, r.order), 0);

  const created = db.insert(customFieldDefs).values({
    entity: body.entity,
    label: body.label.trim(),
    fieldKey: slugify(body.label),
    type,
    options: type === "select" && Array.isArray(body.options) ? JSON.stringify(body.options) : null,
    order: maxOrder + 1,
    active: true,
    createdAt: new Date(),
  }).returning().get();

  return NextResponse.json(created);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperadmin((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const body = await req.json() as { id?: string; label?: string; options?: string[]; active?: boolean; order?: number };
  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.label !== undefined) patch.label = body.label.trim();
  if (body.options !== undefined) patch.options = Array.isArray(body.options) ? JSON.stringify(body.options) : null;
  if (body.active !== undefined) patch.active = body.active;
  if (body.order !== undefined) patch.order = body.order;

  db.update(customFieldDefs).set(patch).where(eq(customFieldDefs.id, body.id)).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperadmin((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  db.delete(customFieldDefs).where(eq(customFieldDefs.id, id)).run();
  return NextResponse.json({ ok: true });
}
