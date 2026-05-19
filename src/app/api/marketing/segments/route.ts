import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, mktSegments } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

interface SegmentRules {
  temperature?: ("hot" | "warm" | "cold")[];
  lifecycleStage?: string[];
  industry?: string[];
  source?: string[];
  scoreMin?: number;
  scoreMax?: number;
  hasEmail?: boolean;
  hasPhone?: boolean;
  excludeReturned?: boolean;
}

function evalRules(c: typeof contacts.$inferSelect, rules: SegmentRules): boolean {
  if (rules.temperature && rules.temperature.length && !rules.temperature.includes(c.temperature as "hot" | "warm" | "cold")) return false;
  if (rules.lifecycleStage && rules.lifecycleStage.length && !rules.lifecycleStage.includes(c.lifecycleStage ?? "lead")) return false;
  if (rules.industry && rules.industry.length && !rules.industry.includes(c.industry ?? "")) return false;
  if (rules.source && rules.source.length && !rules.source.includes(c.source)) return false;
  if (rules.scoreMin != null && (c.score ?? 0) < rules.scoreMin) return false;
  if (rules.scoreMax != null && (c.score ?? 0) > rules.scoreMax) return false;
  if (rules.hasEmail && !c.email) return false;
  if (rules.hasPhone && !c.phone) return false;
  if (rules.excludeReturned && c.returnedToMarketingAt) return false;
  return true;
}

// GET /api/marketing/segments — list segments + live count per segment
export async function GET() {
  try {
    const segments = db.select().from(mktSegments).all();
    const allContacts = db.select().from(contacts).where(isNull(contacts.returnedToMarketingAt)).all();

    const enriched = segments.map(s => {
      let rules: SegmentRules = {};
      try { rules = JSON.parse(s.rulesJson); } catch { /* invalid JSON */ }
      const matches = allContacts.filter(c => evalRules(c, rules));
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        rules,
        count: matches.length,
        createdAt: s.createdAt,
      };
    });

    return NextResponse.json(enriched);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/marketing/segments — create or preview a segment
// Body: { name?: string; description?: string; rules: SegmentRules; preview?: boolean }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, rules, preview } = body as { name?: string; description?: string; rules: SegmentRules; preview?: boolean };

    if (preview) {
      const allContacts = db.select().from(contacts).where(isNull(contacts.returnedToMarketingAt)).all();
      const matches = allContacts.filter(c => evalRules(c, rules ?? {}));
      return NextResponse.json({ preview: true, count: matches.length, sample: matches.slice(0, 5).map(c => ({ id: c.id, name: c.name, company: c.company, email: c.email })) });
    }

    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const id = crypto.randomUUID();
    const now = new Date();
    db.insert(mktSegments).values({
      id,
      name,
      description: description || null,
      rulesJson: JSON.stringify(rules ?? {}),
      createdAt: now,
      updatedAt: now,
    }).run();

    return NextResponse.json({ ok: true, id });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/marketing/segments?id=xxx
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    db.delete(mktSegments).where(eq(mktSegments.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
