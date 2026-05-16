import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { googleTokens, analyticsCache } from "@/db/schema";
import { eq } from "drizzle-orm";

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

const SITE_URL = process.env.GSC_SITE_URL ?? "sc-domain:blackscale.consulting";

async function refreshToken(row: typeof googleTokens.$inferSelect): Promise<string | null> {
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
    .where(eq(googleTokens.userId, row.userId))
    .run();
  return data.access_token;
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const allTokens = db.select().from(googleTokens).all();
  const ordered = [
    ...allTokens.filter(r => r.userId === userId),
    ...allTokens.filter(r => r.userId !== userId),
  ];
  for (const row of ordered) {
    const expired = !row.expiryDate || row.expiryDate < Date.now() + 60000;
    if (!expired) return row.accessTokenEnc;
    const refreshed = await refreshToken(row);
    if (refreshed) return refreshed;
  }
  return null;
}

function computeRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const today = fmt(now);
  const ago = (n: number) => fmt(new Date(now.getTime() - n * 86400000));
  const startOfWeek = () => {
    const r = new Date(now);
    r.setDate(r.getDate() - (r.getDay() === 0 ? 6 : r.getDay() - 1));
    r.setHours(0, 0, 0, 0);
    return r;
  };
  switch (preset) {
    case "7d":    return { startDate: ago(7),  endDate: today };
    case "28d":   return { startDate: ago(28), endDate: today };
    case "90d":   return { startDate: ago(90), endDate: today };
    case "thisWeek":  return { startDate: fmt(startOfWeek()), endDate: today };
    case "lastWeek": {
      const s = new Date(startOfWeek().getTime() - 7 * 86400000);
      const e = new Date(s.getTime() + 6 * 86400000);
      return { startDate: fmt(s), endDate: fmt(e) };
    }
    case "thisMonth": return { startDate: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: today };
    case "lastMonth": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: fmt(s), endDate: fmt(e) };
    }
    case "30d":
    default:      return { startDate: ago(30), endDate: today };
  }
}

async function gscQuery(accessToken: string, body: object) {
  const siteEncoded = encodeURIComponent(SITE_URL);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${siteEncoded}/searchAnalytics/query`,
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
  const customStart = sp.get("start");
  const customEnd = sp.get("end");

  const { startDate, endDate } = customStart && customEnd
    ? { startDate: customStart, endDate: customEnd }
    : computeRange(preset);

  const cacheId = `gsc_${startDate}_${endDate}`;

  if (!bypass) {
    const cached = db.select().from(analyticsCache).where(eq(analyticsCache.id, cacheId)).get();
    if (cached) {
      const age = Date.now() - new Date(cached.cachedAt).getTime();
      if (age < CACHE_TTL) return NextResponse.json(JSON.parse(cached.data));
    }
  }

  const accessToken = await getValidAccessToken(session.user.id as string);
  if (!accessToken) {
    return NextResponse.json(
      { error: "gsc_not_connected", message: "Inicia sesión con Google para activar Search Console" },
      { status: 403 }
    );
  }

  const base = { startDate, endDate, rowLimit: 10 };

  try {
    const [overview, queries, pages, countries, daily] = await Promise.all([
      gscQuery(accessToken, { ...base, dimensions: [] }),
      gscQuery(accessToken, { ...base, dimensions: ["query"],   orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }] }),
      gscQuery(accessToken, { ...base, dimensions: ["page"],    orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }] }),
      gscQuery(accessToken, { ...base, dimensions: ["country"], orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }], rowLimit: 6 }),
      gscQuery(accessToken, { startDate, endDate, dimensions: ["date"],  orderBy: [{ fieldName: "date", sortOrder: "ASCENDING" }], rowLimit: 90 }),
    ]);

    if (overview.error) {
      const code = overview.error.code;
      if (code === 401 || code === 403) {
        return NextResponse.json({ error: "gsc_not_connected", message: "El token de Google no tiene acceso a Search Console. Cierra sesión y vuelve a entrar para re-autorizar." }, { status: 403 });
      }
      return NextResponse.json({ error: overview.error.message ?? "GSC error" }, { status: 502 });
    }

    const mapRow = (r: any) => ({
      keys: r.keys ?? [],
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    });

    const totals = {
      clicks: overview.rows?.[0]?.clicks ?? 0,
      impressions: overview.rows?.[0]?.impressions ?? 0,
      ctr: overview.rows?.[0]?.ctr ?? 0,
      position: overview.rows?.[0]?.position ?? 0,
    };

    const report = {
      totals,
      queries: (queries.rows ?? []).map(mapRow),
      pages: (pages.rows ?? []).map(mapRow),
      countries: (countries.rows ?? []).map(mapRow),
      daily: (daily.rows ?? []).map(mapRow),
      range: { startDate, endDate, preset },
      siteUrl: SITE_URL,
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
