import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";

export async function POST() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user?.id || role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const secret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  db.insert(crmSettings)
    .values({ key: "dapta_webhook_secret", value: secret })
    .onConflictDoUpdate({ target: crmSettings.key, set: { value: secret } })
    .run();

  return NextResponse.json({ secret });
}
