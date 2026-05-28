import { NextResponse } from "next/server";
import { mktDb } from "@/db/mkt-db";
import { fireTriggers } from "@/lib/triggers";
import { notifyUsers } from "@/lib/notify";
import { notifySlackMktHandoff } from "@/lib/slack";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type MktContactPartial = {
  id: string; name: string; company: string; email: string;
  tier: number; score: number;
  ready_for_sales: number; engagement_status: string;
  owner_id: string | null;
};

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const before = mktDb.prepare("SELECT * FROM mkt_contacts WHERE id = ?").get(id) as MktContactPartial | undefined;
    if (!before) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

    const allowed = [
      "engagement_status", "ready_for_sales", "passed_to_sales_at", "score",
      "tier", "temperature", "marketing_notes", "industry", "linkedin_url",
      "job_title", "company_size", "location", "owner_id",
    ] as const;
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

    // Detect handoff transition (ready_for_sales flips 0 → 1) and fire trigger + slack
    const newReady = "ready_for_sales" in body ? Number(body.ready_for_sales) : before.ready_for_sales;
    if (before.ready_for_sales === 0 && newReady === 1) {
      // Stamp passed_to_sales_at if not provided
      if (!("passed_to_sales_at" in body)) {
        mktDb.prepare("UPDATE mkt_contacts SET passed_to_sales_at = ? WHERE id = ?").run(Date.now(), id);
      }
      notifySlackMktHandoff({
        id: before.id, name: before.name, company: before.company,
        tier: before.tier, score: Number(body.score ?? before.score), email: before.email,
      }).catch(() => {});
      fireTriggers({
        event: "mkt_handoff",
        data: {
          contactId: before.id, name: before.name, company: before.company,
          email: before.email, tier: String(before.tier), score: String(body.score ?? before.score),
        },
      }).catch(() => {});

      const companyPart = before.company ? ` · ${before.company}` : "";
      notifyUsers({
        type: "mkt_handoff",
        title: "Handoff a ventas",
        body: `${before.name}${companyPart} · Tier ${before.tier} · Score ${body.score ?? before.score}`,
        priority: "high",
        resourceType: "contact", resourceId: before.id,
        link: `/contacts/${before.id}`,
      }).catch(() => {});
    }

    // Detect engagement change
    if ("engagement_status" in body && body.engagement_status !== before.engagement_status) {
      fireTriggers({
        event: "mkt_engagement_changed",
        data: {
          contactId: before.id, name: before.name,
          previousStatus: before.engagement_status,
          newStatus: String(body.engagement_status),
        },
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
