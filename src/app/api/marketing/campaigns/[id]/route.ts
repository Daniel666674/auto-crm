import { NextResponse } from "next/server";
import { mktDb } from "@/db/mkt-db";
import { fireTriggers } from "@/lib/triggers";
import { notifyUsers } from "@/lib/notify";
import { notifySlackCampaignLaunched } from "@/lib/slack";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = mktDb.prepare("SELECT * FROM mkt_campaigns WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });

    const allowed: Record<string, string> = {
      name: "name",
      status: "status",
      targetSegment: "target_segment",
      cadenceType: "cadence_type",
      channel: "channel",
      ownerId: "owner_id",
      outcomeReasonId: "outcome_reason_id",
      outcomeNotes: "outcome_notes",
      totalContacts: "total_contacts",
    };
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [key, col] of Object.entries(allowed)) {
      if (key in body) {
        sets.push(`${col} = ?`);
        vals.push(body[key]);
      }
    }

    // Auto-stamp closed_at when status flips to "completed" or "paused"
    const prevStatus = existing.status as string;
    const newStatus = body.status as string | undefined;
    if (newStatus && newStatus !== prevStatus) {
      if (["completed", "paused", "cancelled"].includes(newStatus)) {
        sets.push("closed_at = ?");
        vals.push(Date.now());
      } else if (newStatus === "active") {
        sets.push("closed_at = ?");
        vals.push(null);
      }
    }

    if (sets.length === 0) return NextResponse.json({ ok: true });
    vals.push(id);
    mktDb.prepare(`UPDATE mkt_campaigns SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

    // Fire triggers + slack on status transitions — non-blocking
    if (newStatus && newStatus !== prevStatus) {
      if (newStatus === "active") {
        notifySlackCampaignLaunched({
          id,
          name: (body.name ?? existing.name) as string,
          channel: (body.channel ?? existing.channel ?? "email") as string,
          targetSegment: (body.targetSegment ?? existing.target_segment ?? "") as string,
          totalContacts: Number(body.totalContacts ?? existing.total_contacts ?? 0),
        }).catch(() => {});
      }
      if (newStatus === "completed") {
        fireTriggers({
          event: "campaign_completed",
          data: {
            campaignId: id,
            campaignName: (body.name ?? existing.name) as string,
            outcomeReasonId: (body.outcomeReasonId ?? existing.outcome_reason_id ?? "") as string,
          },
        }).catch(() => {});

        notifyUsers({
          type: "campaign_completed",
          title: "Campaña completada",
          body: String(body.name ?? existing.name ?? "Campaña"),
          priority: "medium",
          resourceType: "campaign", resourceId: id,
          link: `/marketing`,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    mktDb.prepare("DELETE FROM mkt_campaigns WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
