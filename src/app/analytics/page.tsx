"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, TrendingUp, Users, Search, ChevronUp, ChevronDown } from "lucide-react";

const GOLD = "#C39A4C";

interface BrevoCampaign {
  id: number;
  name: string;
  status: string;
  sentDate?: string;
  scheduledAt?: string;
  statistics?: {
    globalStats?: {
      sent?: number;
      delivered?: number;
      uniqueViews?: number;
      uniqueClicks?: number;
      hardBounces?: number;
      softBounces?: number;
      unsubscriptions?: number;
    };
  };
}

interface GA4Data {
  sessions: number;
  pageviews: number;
  activeUsers: number;
  bounceRate: number;
  newUsers: number;
  topPages: { page: string; views: number }[];
  trafficSources: { source: string; sessions: number }[];
  daily: { date: string; sessions: number; pageviews: number }[];
  fetchedAt?: string;
  error?: string;
}

type TimeRange = "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";
type SortKey = "name" | "sent" | "opens" | "clicks" | "openPct" | "clickPct";
type SortDir = "asc" | "desc";

function safeN(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function pct(num: number, den: number): string {
  if (den === 0) return "—";
  return ((num / den) * 100).toFixed(1) + "%";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" });
}

function SCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ?? "var(--foreground)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const TIME_OPTIONS: { key: TimeRange; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "yesterday", label: "Ayer" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
  { key: "custom", label: "Personalizado" },
];

function getDateRange(range: TimeRange, customFrom: string, customTo: string): { from: Date; to: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today") return { from: today, to: now };
  if (range === "yesterday") {
    const y = new Date(today); y.setDate(y.getDate() - 1);
    const ye = new Date(today); ye.setMilliseconds(-1);
    return { from: y, to: ye };
  }
  if (range === "7d") { const f = new Date(today); f.setDate(f.getDate() - 6); return { from: f, to: now }; }
  if (range === "30d") { const f = new Date(today); f.setDate(f.getDate() - 29); return { from: f, to: now }; }
  if (range === "90d") { const f = new Date(today); f.setDate(f.getDate() - 89); return { from: f, to: now }; }
  if (range === "custom" && customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(customTo + "T23:59:59") };
  }
  return null;
}

function campaignDate(c: BrevoCampaign): Date | null {
  const d = c.sentDate || c.scheduledAt;
  return d ? new Date(d) : null;
}

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<BrevoCampaign[]>([]);
  const [brevoLoading, setBrevoLoading] = useState(true);
  const [brevoError, setBrevoError] = useState("");
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [ga4, setGa4] = useState<GA4Data | null>(null);
  const [ga4Loading, setGa4Loading] = useState(true);

  // Time filter for campaigns
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Campaign table controls
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadBrevo = () => {
    setBrevoLoading(true);
    setBrevoError("");
    fetch("/api/brevo/campaigns")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setBrevoError(d.error); return; }
        setCampaigns(d.campaigns || []);
        setFetchedAt(new Date());
      })
      .catch(() => setBrevoError("Error de red al conectar con Brevo"))
      .finally(() => setBrevoLoading(false));
  };

  const loadGA4 = (bypass = false) => {
    setGa4Loading(true);
    fetch(`/api/ga4${bypass ? "?bypass=1" : ""}`)
      .then(r => r.json())
      .then(setGa4)
      .catch(() => setGa4({ error: "network", sessions: 0, pageviews: 0, activeUsers: 0, bounceRate: 0, newUsers: 0, topPages: [], trafficSources: [], daily: [] }))
      .finally(() => setGa4Loading(false));
  };

  useEffect(() => { loadBrevo(); loadGA4(); }, []);

  // Filter campaigns by time range
  const filteredCampaigns = useMemo(() => {
    const range = getDateRange(timeRange, customFrom, customTo);
    let list = campaigns;
    if (range) {
      list = list.filter(c => {
        const d = campaignDate(c);
        if (!d) return timeRange === "30d" || timeRange === "90d"; // no date = include in broad ranges
        return d >= range.from && d <= range.to;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [campaigns, timeRange, customFrom, customTo, search]);

  // Sort campaigns
  const sortedCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((a, b) => {
      const gs = (c: BrevoCampaign) => c.statistics?.globalStats ?? {};
      let va = 0, vb = 0;
      if (sortKey === "name") {
        const diff = a.name.localeCompare(b.name);
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortKey === "sent") { va = safeN(gs(a).sent); vb = safeN(gs(b).sent); }
      if (sortKey === "opens") { va = safeN(gs(a).uniqueViews); vb = safeN(gs(b).uniqueViews); }
      if (sortKey === "clicks") { va = safeN(gs(a).uniqueClicks); vb = safeN(gs(b).uniqueClicks); }
      if (sortKey === "openPct") { const sa = safeN(gs(a).sent); const sb = safeN(gs(b).sent); va = sa > 0 ? safeN(gs(a).uniqueViews) / sa : 0; vb = sb > 0 ? safeN(gs(b).uniqueViews) / sb : 0; }
      if (sortKey === "clickPct") { const sa = safeN(gs(a).sent); const sb = safeN(gs(b).sent); va = sa > 0 ? safeN(gs(a).uniqueClicks) / sa : 0; vb = sb > 0 ? safeN(gs(b).uniqueClicks) / sb : 0; }
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [filteredCampaigns, sortKey, sortDir]);

  const totals = useMemo(() => filteredCampaigns.reduce(
    (acc, c) => {
      const gs = c.statistics?.globalStats ?? {};
      return {
        sent: acc.sent + safeN(gs.sent),
        delivered: acc.delivered + safeN(gs.delivered),
        opens: acc.opens + safeN(gs.uniqueViews),
        clicks: acc.clicks + safeN(gs.uniqueClicks),
        bounces: acc.bounces + safeN(gs.hardBounces) + safeN(gs.softBounces),
        unsubs: acc.unsubs + safeN(gs.unsubscriptions),
      };
    },
    { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubs: 0 }
  ), [filteredCampaigns]);

  const ga4Connected = ga4 && !ga4.error;
  const ga4NotConnected = ga4?.error === "ga4_not_connected";
  const dailyLast14 = (ga4?.daily ?? []).slice(-14);
  const dailyMax = Math.max(...dailyLast14.map(d => d.sessions), 1);

  const loading = brevoLoading || ga4Loading;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp size={10} style={{ opacity: 0.25 }} />;
    return sortDir === "asc" ? <ChevronUp size={10} style={{ color: GOLD }} /> : <ChevronDown size={10} style={{ color: GOLD }} />;
  }

  function ThSort({ k, label }: { k: SortKey; label: string }) {
    return (
      <th
        onClick={() => toggleSort(k)}
        style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: sortKey === k ? GOLD : "var(--muted-foreground)", fontSize: 11, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>{label}<SortIcon k={k} /></span>
      </th>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Analytics</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
            Brevo Email Marketing · Google Analytics 4
            {fetchedAt && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>· actualizado {fetchedAt.toLocaleTimeString("es-CO")}</span>}
          </p>
        </div>
        <button
          onClick={() => { loadBrevo(); loadGA4(true); }}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 12, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {brevoError && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#ef4444" }}>
          {brevoError}
        </div>
      )}

      {/* ── Brevo Section ────────────────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>✉ Brevo Email Marketing</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(72,187,120,0.12)", color: "#48bb78" }}>CONECTADO</span>
          </div>

          {/* Time range picker */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setTimeRange(opt.key)}
                style={{
                  padding: "4px 12px", borderRadius: 20, border: "1px solid var(--border)", fontSize: 11, cursor: "pointer", fontWeight: 600,
                  background: timeRange === opt.key ? GOLD : "transparent",
                  color: timeRange === opt.key ? "#0a0a0a" : "var(--muted-foreground)",
                }}>
                {opt.label}
              </button>
            ))}
            {timeRange === "custom" && (
              <>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }} />
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>→</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }} />
              </>
            )}
          </div>
        </div>

        {brevoLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ height: 88, borderRadius: 12, background: "var(--card)", opacity: 0.5 }} />)}
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 16 }}>
              <SCard label="Campañas" value={filteredCampaigns.length} accent={GOLD} sub={`de ${campaigns.length} total`} />
              <SCard label="Total enviados" value={totals.sent.toLocaleString("es-CO")} />
              <SCard label="Entregados" value={totals.delivered.toLocaleString("es-CO")} sub={pct(totals.delivered, totals.sent)} />
              <SCard label="Abiertos" value={totals.opens.toLocaleString("es-CO")} accent={totals.sent > 0 ? "#22c55e" : undefined} sub={pct(totals.opens, totals.sent) + " open rate"} />
              <SCard label="Clicks" value={totals.clicks.toLocaleString("es-CO")} sub={pct(totals.clicks, totals.sent) + " click rate"} />
              <SCard label="Bajas" value={totals.unsubs.toLocaleString("es-CO")} sub={pct(totals.unsubs, totals.sent)} />
            </div>

            {/* Search bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
                <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar campaña..."
                  style={{ width: "100%", paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12, outline: "none" }}
                />
              </div>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{sortedCampaigns.length} campaña{sortedCampaigns.length !== 1 ? "s" : ""}</span>
            </div>

            {sortedCampaigns.length > 0 && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                        <ThSort k="name" label="Nombre" />
                        <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--muted-foreground)", fontSize: 11, whiteSpace: "nowrap" }}>Estado</th>
                        <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--muted-foreground)", fontSize: 11, whiteSpace: "nowrap" }}>Fecha</th>
                        <ThSort k="sent" label="Enviados" />
                        <ThSort k="opens" label="Abiertos" />
                        <ThSort k="openPct" label="Open%" />
                        <ThSort k="clicks" label="Clicks" />
                        <ThSort k="clickPct" label="Click%" />
                        <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--muted-foreground)", fontSize: 11 }}>Bajas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCampaigns.map(c => {
                        const gs = c.statistics?.globalStats ?? {};
                        const sent = safeN(gs.sent);
                        const opens = safeN(gs.uniqueViews);
                        const clicks = safeN(gs.uniqueClicks);
                        const bounces = safeN(gs.hardBounces) + safeN(gs.softBounces);
                        const unsubs = safeN(gs.unsubscriptions);
                        const openRate = sent > 0 ? (opens / sent) * 100 : 0;
                        const isExpanded = expandedId === c.id;
                        return (
                          <>
                            <tr
                              key={c.id}
                              onClick={() => setExpandedId(isExpanded ? null : c.id)}
                              style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.1s" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <td style={{ padding: "10px 14px", fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                                  background: c.status === "sent" ? "rgba(72,187,120,0.12)" : "rgba(195,154,76,0.12)",
                                  color: c.status === "sent" ? "#48bb78" : GOLD,
                                  textTransform: "capitalize",
                                }}>{c.status}</span>
                              </td>
                              <td style={{ padding: "10px 14px", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{campaignDate(c) ? fmtDate((c.sentDate || c.scheduledAt)!) : "—"}</td>
                              <td style={{ padding: "10px 14px" }}>{sent.toLocaleString("es-CO")}</td>
                              <td style={{ padding: "10px 14px" }}>{opens.toLocaleString("es-CO")}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ color: openRate >= 30 ? "#22c55e" : openRate >= 20 ? GOLD : "var(--muted-foreground)", fontWeight: 600 }}>
                                  {pct(opens, sent)}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px" }}>{clicks.toLocaleString("es-CO")}</td>
                              <td style={{ padding: "10px 14px" }}>{pct(clicks, sent)}</td>
                              <td style={{ padding: "10px 14px", color: "var(--muted-foreground)" }}>{unsubs}</td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${c.id}-exp`} style={{ background: "rgba(195,154,76,0.03)", borderBottom: "1px solid var(--border)" }}>
                                <td colSpan={9} style={{ padding: "14px 20px" }}>
                                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 12 }}>
                                    <div><span style={{ color: "var(--muted-foreground)" }}>Bounces duro: </span><span style={{ fontWeight: 600 }}>{safeN(gs.hardBounces)}</span></div>
                                    <div><span style={{ color: "var(--muted-foreground)" }}>Bounces suave: </span><span style={{ fontWeight: 600 }}>{safeN(gs.softBounces)}</span></div>
                                    <div><span style={{ color: "var(--muted-foreground)" }}>Entregados: </span><span style={{ fontWeight: 600 }}>{safeN(gs.delivered).toLocaleString("es-CO")}</span></div>
                                    <div><span style={{ color: "var(--muted-foreground)" }}>Tasa entrega: </span><span style={{ fontWeight: 600 }}>{pct(safeN(gs.delivered), sent)}</span></div>
                                    <div><span style={{ color: "var(--muted-foreground)" }}>Click/Open: </span><span style={{ fontWeight: 600 }}>{opens > 0 ? ((clicks / opens) * 100).toFixed(1) + "%" : "—"}</span></div>
                                    {bounces > 0 && <div><span style={{ color: "var(--muted-foreground)" }}>Tasa rebote: </span><span style={{ fontWeight: 600, color: "#ef4444" }}>{pct(bounces, sent)}</span></div>}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {sortedCampaigns.length === 0 && !brevoLoading && (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                Sin campañas para el período seleccionado
              </div>
            )}
          </>
        )}
      </section>

      {/* ── GA4 Section ──────────────────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>G Google Analytics 4</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            background: ga4Connected ? "rgba(72,187,120,0.12)" : "rgba(239,68,68,0.1)",
            color: ga4Connected ? "#48bb78" : "#ef4444",
          }}>
            {ga4Loading ? "VERIFICANDO" : ga4Connected ? "CONECTADO" : "NO CONECTADO"}
          </span>
          {ga4Connected && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Últimos 30 días · Property 530528809</span>}
          {ga4Connected && (
            <button
              onClick={() => loadGA4(true)}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 11, cursor: "pointer" }}>
              <RefreshCw size={10} /> Refrescar
            </button>
          )}
        </div>

        {ga4Loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ height: 88, borderRadius: 12, background: "var(--card)", opacity: 0.5 }} />)}
          </div>
        ) : ga4NotConnected || !ga4Connected ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>
              Conecta Google Analytics 4 para ver sesiones, páginas vistas y fuentes de tráfico en tiempo real.
            </div>
            <button
              onClick={() => { window.location.href = "/api/auth/signin/google?callbackUrl=/analytics"; }}
              style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: GOLD, color: "#0a0a0a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Conectar GA4
            </button>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 10 }}>
              También desde Configuración → Integraciones
            </div>
          </div>
        ) : ga4 ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <SCard label="Sesiones (30d)" value={ga4.sessions.toLocaleString("es-CO")} accent={GOLD} sub={`${ga4.newUsers.toLocaleString()} nuevos usuarios`} />
              <SCard label="Páginas vistas" value={ga4.pageviews.toLocaleString("es-CO")} sub={`${ga4.activeUsers.toLocaleString()} usuarios activos`} />
              <SCard label="Bounce Rate" value={`${(ga4.bounceRate * 100).toFixed(1)}%`} />
              <SCard label="Páginas / sesión" value={ga4.sessions > 0 ? (ga4.pageviews / ga4.sessions).toFixed(1) : "—"} />
            </div>

            {/* Daily bar chart */}
            {dailyLast14.length > 0 && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <TrendingUp size={13} style={{ color: GOLD }} /> Sesiones diarias — últimos 14 días
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                  {dailyLast14.map((d, i) => {
                    const h = Math.max(4, (d.sessions / dailyMax) * 80);
                    const isLast = i === dailyLast14.length - 1;
                    const dateStr = `${d.date.slice(6, 8)}/${d.date.slice(4, 6)}`;
                    return (
                      <div key={i} title={`${dateStr}: ${d.sessions} sesiones · ${d.pageviews} págs`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "default" }}>
                        <div style={{ width: "100%", background: GOLD, opacity: isLast ? 1 : 0.45, borderRadius: "3px 3px 0 0", height: h }} />
                        {(i === 0 || i === 6 || isLast) && (
                          <span style={{ fontSize: 9, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{dateStr}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Top pages */}
              {ga4.topPages.length > 0 && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Top páginas</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {ga4.topPages.slice(0, 8).map((p, i) => {
                      const maxV = ga4.topPages[0].views;
                      const w = Math.round((p.views / maxV) * 100);
                      return (
                        <div key={i}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{p.page}</span>
                            <span style={{ fontWeight: 600 }}>{p.views.toLocaleString()}</span>
                          </div>
                          <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                            <div style={{ height: "100%", borderRadius: 2, width: `${w}%`, background: GOLD }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Traffic sources */}
              {ga4.trafficSources.length > 0 && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={13} /> Fuentes de tráfico
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {ga4.trafficSources.map((s, i) => {
                      const total = ga4.trafficSources.reduce((sum, x) => sum + x.sessions, 0);
                      const w = total > 0 ? Math.round((s.sessions / total) * 100) : 0;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
                          <span style={{ color: "var(--muted-foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.source}</span>
                          <span style={{ fontWeight: 600, width: 32, textAlign: "right" }}>{s.sessions}</span>
                          <div style={{ width: 80, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", flexShrink: 0 }}>
                            <div style={{ height: "100%", borderRadius: 2, width: `${w}%`, background: "#3b82f6" }} />
                          </div>
                          <span style={{ fontSize: 10, color: "var(--muted-foreground)", width: 28, textAlign: "right" }}>{w}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
