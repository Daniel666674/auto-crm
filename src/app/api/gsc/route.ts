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

async function gscQuery(accessToken: string, siteUrl: string, body: object) {
  const siteEncoded = encodeURIComponent(siteUrl);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${siteEncoded}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  return { data, status: res.status };
}

interface SiteEntry { siteUrl: string; permissionLevel: string }

async function fetchSites(accessToken: string): Promise<SiteEntry[]> {
  try {
    const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.siteEntry ?? []).filter((s: SiteEntry) => s.permissionLevel !== "siteUnverifiedUser");
  } catch { return []; }
}

// Pick the best property the user can actually read.
// Priority: configured SITE_URL → exact match in user's verified sites → first accessible
function pickAccessibleSite(configured: string, sites: SiteEntry[]): string | null {
  if (sites.length === 0) return null;
  const exact = sites.find(s => s.siteUrl === configured);
  if (exact) return exact.siteUrl;
  // Try stripping/adding www on URL-prefix properties to match what user expects
  const stripWww = configured.replace(/^https?:\/\/www\./, m => m.replace("www.", ""));
  const addWww = configured.replace(/^(https?:\/\/)(?!www\.)/, "$1www.");
  const variant = sites.find(s => s.siteUrl === stripWww || s.siteUrl === addWww);
  if (variant) return variant.siteUrl;
  // Try domain property variant
  const host = configured.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  const domainProp = sites.find(s => s.siteUrl === `sc-domain:${host}`);
  if (domainProp) return domainProp.siteUrl;
  // Fall back to highest-permission site
  const owner = sites.find(s => s.permissionLevel === "siteOwner");
  return (owner ?? sites[0]).siteUrl;
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

  // Resolve which site to query: prefer configured, fall back to one the user owns
  const userSites = await fetchSites(accessToken);
  const resolvedSite = pickAccessibleSite(SITE_URL, userSites) ?? SITE_URL;
  const usedFallback = resolvedSite !== SITE_URL;

  const base = { startDate, endDate, rowLimit: 10 };

  try {
    const [overview, queries, pages, countries, daily] = await Promise.all([
      gscQuery(accessToken, resolvedSite, { ...base, dimensions: [] }),
      gscQuery(accessToken, resolvedSite, { ...base, dimensions: ["query"],   orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }] }),
      gscQuery(accessToken, resolvedSite, { ...base, dimensions: ["page"],    orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }] }),
      gscQuery(accessToken, resolvedSite, { ...base, dimensions: ["country"], orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }], rowLimit: 6 }),
      gscQuery(accessToken, resolvedSite, { startDate, endDate, dimensions: ["date"],  orderBy: [{ fieldName: "date", sortOrder: "ASCENDING" }], rowLimit: 90 }),
    ]);

    if (overview.data?.error) {
      const code = overview.data.error.code ?? overview.status;
      const reason = overview.data.error.errors?.[0]?.reason ?? "";
      const rawMsg = overview.data.error.message ?? "GSC error";
      const sitesDisplay = userSites.map(s => `${s.siteUrl} (${s.permissionLevel})`);

      let friendly = rawMsg;
      if (reason === "insufficientPermissions" || rawMsg.toLowerCase().includes("permission")) {
        friendly = userSites.length === 0
          ? `El token funciona pero ninguna propiedad de Search Console está disponible para este usuario. Agrega tu correo (con permiso 'Restricted' o 'Full') a una propiedad en https://search.google.com/search-console.`
          : `Sin acceso a "${resolvedSite}". Verifica los permisos en Search Console.`;
      } else if (code === 401 || reason === "authError" || rawMsg.toLowerCase().includes("invalid_grant")) {
        friendly = "Token Google inválido o expirado. Cierra sesión y vuelve a entrar.";
      } else if (rawMsg.toLowerCase().includes("api") && rawMsg.toLowerCase().includes("disabled")) {
        friendly = "La Search Console API no está habilitada en el proyecto de Google Cloud. Actívala en https://console.cloud.google.com/apis/library/searchconsole.googleapis.com.";
      }

      return NextResponse.json({
        error: "gsc_error",
        message: friendly,
        code,
        reason,
        siteUrl: resolvedSite,
        configuredSiteUrl: SITE_URL,
        availableSites: sitesDisplay,
        rawMessage: rawMsg,
      }, { status: code === 401 || code === 403 ? 403 : 502 });
    }

    const mapRow = (r: any) => ({
      keys: r.keys ?? [],
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    });

    const totals = {
      clicks: overview.data.rows?.[0]?.clicks ?? 0,
      impressions: overview.data.rows?.[0]?.impressions ?? 0,
      ctr: overview.data.rows?.[0]?.ctr ?? 0,
      position: overview.data.rows?.[0]?.position ?? 0,
    };

    const report = {
      totals,
      queries: (queries.data.rows ?? []).map(mapRow),
      pages: (pages.data.rows ?? []).map(mapRow),
      countries: (countries.data.rows ?? []).map(mapRow),
      daily: (daily.data.rows ?? []).map(mapRow),
      range: { startDate, endDate, preset },
      siteUrl: resolvedSite,
      configuredSiteUrl: SITE_URL,
      usedFallback,
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
