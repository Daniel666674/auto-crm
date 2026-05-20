import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMonthlyTarget, DEFAULT_MONTHLY_TARGET } from "@/lib/targets";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const monthlyTarget = getMonthlyTarget();
  return NextResponse.json({ monthlyTarget, isDefault: monthlyTarget === DEFAULT_MONTHLY_TARGET });
}
