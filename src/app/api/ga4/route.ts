import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { googleTokens, analyticsCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptToken, decryptToken } from "@/lib/google-calendar";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? "530528809";
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

function computeRange(preset: string, customStart?: string, customEnd?: string): { startDate: string; endDate: string; key: string } {
  if (customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd, key: `${customStart}_${customEnd}` };
  }
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  const today = fmt(now);
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const startOfWeek = (d: Date) => {
    const r = new Date(d);
    const day = r.getDay();
    r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
    r.setHours(0, 0, 0, 0);
    return r;
  };
  switch (preset) {
    case "today":     return { startDate: "today",     endDate: "today",     key: "today" };
    case "yesterday": return { startDate: "yesterday", endDate: "yesterday", key: "yesterday" };
    case "7d":        return { startDate: "7daysAgo",  endDate: "today",     key: "7d" };
    case "28d":       return { startDate: "28daysAgo", endDate: "today",     key: "28d" };
    case "90d":       return { startDate: "90daysAgo", endDate: "today",     key: "90d" };
    case "thisWeek": {
      const s = startOfWeek(now);
      return { startDate: fmt(s), endDate: today, key: `thisWeek_${fmt(s)}` };
    }
    case "lastWeek": {
      const s = addDays(startOfWeek(now), -7);
      const e = addDays(s, 6);
      return { startDate: fmt(s), endDate: fmt(e), key: `lastWeek_${fmt(s)}` };
    }
    case "thisMonth": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: fmt(s), endDate: today, key: `thisMonth_${fmt(s)}` };
    }
    case "lastMonth": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: fmt(s), endDate: fmt(e), key: `lastMonth_${fmt(s)}` };
    }
    case "30d":
    default:          return { startDate: "30daysAgo", endDate: "today", key: "30d" };
  }
}

async function refreshToken(row: typeof googleTokens.$inferSelect): Promise<string | null> {
  if (!row.refreshTokenEnc) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: decryptToken(row.refreshTokenEnc),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.access_token) return null;
  const newExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
  db.update(googleTokens).set({ accessTokenEnc: encryptToken(data.access_token), expiryDate: newExpiry, updatedAt: new Date() }).where(eq(googleTokens.userId, row.userId)).run();
  return data.access_token;
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  // Try current user's token first, then fall back to any stored token
  const allTokens = db.select().from(googleTokens).all();
  const ordered = [
    ...allTokens.filter(r => r.userId === userId),
    ...allTokens.filter(r => r.userId !== userId),
  ];

  for (const row of ordered) {
    const now = Date.now();
    const expired = !row.expiryDate || row.expiryDate < now + 60000;
    if (!expired) return decryptToken(row.accessTokenEnc);
    const refreshed = await refreshToken(row);
    if (refreshed) return refreshed;
  }
  return null;
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

  const sp = req.nextUrl.searchParams;
  const bypass = sp.get("bypass") === "1";
  const preset = sp.get("preset") ?? "30d";
  const start = sp.get("start") ?? undefined;
  const end = sp.get("end") ?? undefined;
  const { startDate, endDate, key } = computeRange(preset, start ?? undefined, end ?? undefined);
  const cacheId = `ga4_${key}`;

  // Shorter TTL for "today"/"yesterday" which can still change
  const sameDay = startDate === "today" || startDate === "yesterday" || startDate === endDate;
  const ttl = sameDay ? 60 * 60 * 1000 : CACHE_TTL;

  // Serve cache if fresh (unless bypass requested)
  if (!bypass) {
    const cached = db.select().from(analyticsCache).where(eq(analyticsCache.id, cacheId)).get();
    if (cached) {
      const age = Date.now() - new Date(cached.cachedAt).getTime();
      if (age < ttl) return NextResponse.json(JSON.parse(cached.data));
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
    const dr = [{ startDate, endDate }];
    const [overview, pages, sources, devices, daily] = await Promise.all([
      runGA4Report(accessToken, {
        dateRanges: dr,
        metrics: [
          { name: "sessions" }, { name: "screenPageViews" },
          { name: "activeUsers" }, { name: "bounceRate" }, { name: "newUsers" },
          { name: "averageSessionDuration" },
        ],
      }),
      runGA4Report(accessToken, {
        dateRanges: dr,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
      runGA4Report(accessToken, {
        dateRanges: dr,
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      runGA4Report(accessToken, {
        dateRanges: dr,
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),
      runGA4Report(accessToken, {
        dateRanges: dr,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "screenPageViews" }, { name: "activeUsers" }],
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
      avgSessionDuration: parseFloat(row0?.metricValues?.[5]?.value ?? "0"),
      topPages: (pages.rows ?? []).map((r: any) => ({
        page: r.dimensionValues?.[0]?.value ?? "/",
        views: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
      })),
      trafficSources: (sources.rows ?? []).map((r: any) => ({
        source: r.dimensionValues?.[0]?.value ?? "(direct)",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
      })),
      deviceBreakdown: (devices.rows ?? []).map((r: any) => ({
        device: r.dimensionValues?.[0]?.value ?? "unknown",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
      })),
      daily: (daily.rows ?? []).map((r: any) => ({
        date: r.dimensionValues?.[0]?.value ?? "",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
        pageviews: parseInt(r.metricValues?.[1]?.value ?? "0", 10),
        users: parseInt(r.metricValues?.[2]?.value ?? "0", 10),
      })),
      range: { startDate, endDate, preset },
      fetchedAt: new Date().toISOString(),
    };

    db.insert(analyticsCache)
      .values({ id: cacheId, data: JSON.stringify(report) })
      .onConflictDoUpdate({ target: analyticsCache.id, set: { data: JSON.stringify(report), cachedAt: new Date() } })
      .run();

    return NextResponse.json(report);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
