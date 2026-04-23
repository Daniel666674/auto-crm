import { NextResponse } from "next/server";
import { mktDb } from "@/db/mkt-db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const allowed = ["engagement_status", "ready_for_sales", "passed_to_sales_at", "score"] as const;
    const sets: string[] = [];
    const vals: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        sets.push(`${key} = ?`);
        vals.push(body[key]);
      }
    }
    if (sets.length === 0) return NextResponse.json({ ok: true });

    vals.push(id);
    mktDb.prepare(`UPDATE mkt_contacts SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
