import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts, crmSettings } from "@/db/schema";
import { eq, isNull, and, lt } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_SLA_HOURS = 24;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Read SLA from settings
  const settingRow = db
    .select()
    .from(crmSettings)
    .where(eq(crmSettings.key, "mql_response_hours"))
    .get();

  let slaHours = DEFAULT_SLA_HOURS;
  if (settingRow) {
    const parsed = Number(settingRow.value);
    if (Number.isFinite(parsed) && parsed > 0) {
      slaHours = parsed;
    }
  }

  const now = Date.now();
  const slaMs = slaHours * 3600 * 1000;
  const cutoff = new Date(now - slaMs);

  // Find contacts where lifecycleStage = 'MQL', not returned to marketing,
  // and updatedAt is older than SLA window (meaning they've sat in MQL longer than allowed)
  const mqlBreaches = db
    .select({
      id: contacts.id,
      name: contacts.name,
      company: contacts.company,
      updatedAt: contacts.updatedAt,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.lifecycleStage, "MQL"),
        isNull(contacts.returnedToMarketingAt),
        lt(contacts.updatedAt, cutoff)
      )
    )
    .all();

  const breaches = mqlBreaches.map((c) => {
    const updatedMs =
      c.updatedAt instanceof Date
        ? c.updatedAt.getTime()
        : Number(c.updatedAt);

    const hoursOverdue = Math.floor((now - updatedMs) / 3600000 - slaHours);

    return {
      contactId: c.id,
      name: c.name,
      company: c.company ?? null,
      hoursOverdue: Math.max(0, hoursOverdue),
      becameMqlAt: updatedMs,
    };
  });

  // Sort by most overdue first
  breaches.sort((a, b) => b.hoursOverdue - a.hoursOverdue);

  const criticalBreaches = breaches.filter(
    (b) => b.hoursOverdue > slaHours
  ).length;

  return NextResponse.json({
    slaHours,
    breaches,
    totalBreaches: breaches.length,
    criticalBreaches,
  });
}
