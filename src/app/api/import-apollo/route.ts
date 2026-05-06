import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runApolloImport } from "@/lib/apollo-import";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = db.select().from(crmSettings).all();
  const get = (key: string) => rows.find(r => r.key === key)?.value ?? null;

  return NextResponse.json({
    lastSync: get("apollo_last_sync"),
    lastInserted: get("apollo_last_inserted"),
    totalRows: get("apollo_total_rows"),
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await runApolloImport();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
