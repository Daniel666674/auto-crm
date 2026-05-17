import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  return NextResponse.json({
    brevo: !!process.env.BREVO_API_KEY,
    apollo: !!process.env.APOLLO_API_KEY,
    ga4Property: process.env.GA4_PROPERTY_ID ?? null,
    gscSiteUrl: process.env.GSC_SITE_URL ?? "sc-domain:blackscale.consulting",
  });
}
