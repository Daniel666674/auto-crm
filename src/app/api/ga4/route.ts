import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { googleTokens, analyticsCache } from "@/db/schema";
import { eq } from "drizzle-orm";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? "530528809";
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

async function getValidAccessToken(userId: string): Promise<string | null> {
  const row = db.select().from(googleTokens).where(eq(googleTokens.userId, userId)).get();
  if (!row) return null;

  const now = Date.now();
  const expired = !row.expiryDate || row.expiryDate < now + 60000;

  if (!expired) return row.accessTokenEnc;

  if (!row.refreshTokenEnc) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: row.refreshTokenEnc,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data.access_token) return null;

  const newExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
  db.update(googleTokens)
    .set({ accessTokenEnc: data.access_token, expiryDate: newExpiry, updatedAt: new Date() })
    .where(eq(googleTokens.userId, userId))
    .run();

  return data.access_token;
}

async function runGA4Report(accessToken: string, body: object) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  return res.json();
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const bypass = req.nextUrl.searchParams.get("bypass") === "1";

  // Serve cache if fresh (unless bypass requested)
  if (!bypass) {
    const cached = db.select().from(analyticsCache).where(eq(analyticsCache.id, "ga4")).get();
    if (cached) {
      const age = Date.now() - new Date(cached.cachedAt).getTime();
      if (age < CACHE_TTL) return NextResponse.json(JSON.parse(cached.data));
    }
  }

  const accessToken = await getValidAccessToken(session.user.id as string);
  if (!accessToken) {
    return NextResponse.json(
      { error: "ga4_not_connected", message: "Conecta GA4 desde Configuración → Integraciones" },
      { status: 403 }
    );
  }

  try {
    const [overview, pages, sources, daily] = await Promise.all([
      runGA4Report(accessToken, {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        metrics: [
          { name: "sessions" }, { name: "screenPageViews" },
          { name: "activeUsers" }, { name: "bounceRate" }, { name: "newUsers" },
        ],
      }),
      runGA4Report(accessToken, {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
      runGA4Report(accessToken, {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      runGA4Report(accessToken, {
        dateRanges: [{ startDate: "29daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    ]);

    const row0 = overview.rows?.[0];
    const report = {
      sessions: parseInt(row0?.metricValues?.[0]?.value ?? "0", 10),
      pageviews: parseInt(row0?.metricValues?.[1]?.value ?? "0", 10),
      activeUsers: parseInt(row0?.metricValues?.[2]?.value ?? "0", 10),
      bounceRate: parseFloat(row0?.metricValues?.[3]?.value ?? "0"),
      newUsers: parseInt(row0?.metricValues?.[4]?.value ?? "0", 10),
      topPages: (pages.rows ?? []).map((r: any) => ({
        page: r.dimensionValues?.[0]?.value ?? "/",
        views: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
      })),
      trafficSources: (sources.rows ?? []).map((r: any) => ({
        source: r.dimensionValues?.[0]?.value ?? "(direct)",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
      })),
      daily: (daily.rows ?? []).map((r: any) => ({
        date: r.dimensionValues?.[0]?.value ?? "",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
        pageviews: parseInt(r.metricValues?.[1]?.value ?? "0", 10),
      })),
      fetchedAt: new Date().toISOString(),
    };

    db.insert(analyticsCache)
      .values({ id: "ga4", data: JSON.stringify(report) })
      .onConflictDoUpdate({ target: analyticsCache.id, set: { data: JSON.stringify(report), cachedAt: new Date() } })
      .run();

    return NextResponse.json(report);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
