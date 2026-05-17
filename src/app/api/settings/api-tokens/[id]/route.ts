import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { apiTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  // Soft delete: set revokedAt instead of hard-deleting (keeps audit trail)
  db.update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(eq(apiTokens.id, id))
    .run();

  return NextResponse.json({ success: true });
}
