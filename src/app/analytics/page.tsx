"use client";

import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, Users } from "lucide-react";

const GOLD = "#C39A4C";

interface BrevoCampaign {
  id: number;
  name: string;
  status: string;
  statistics?: {
    globalStats?: {
      sent?: number;
      delivered?: number;
      uniqueOpens?: number;
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

function safeN(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function pct(num: number, den: number): string {
  if (den === 0) return "—";
  return ((num / den) * 100).toFixed(1) + "%";
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

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<BrevoCampaign[]>([]);
  const [brevoLoading, setBrevoLoading] = useState(true);
  const [brevoError, setBrevoError] = useState("");
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [ga4, setGa4] = useState<GA4Data | null>(null);
  const [ga4Loading, setGa4Loading] = useState(true);

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

  const totals = campaigns.reduce(
    (acc, c) => {
      const gs = c.statistics?.globalStats ?? {};
      return {
        sent: acc.sent + safeN(gs.sent),
        delivered: acc.delivered + safeN(gs.delivered),
        opens: acc.opens + safeN(gs.uniqueOpens),
        clicks: acc.clicks + safeN(gs.uniqueClicks),
        bounces: acc.bounces + safeN(gs.hardBounces) + safeN(gs.softBounces),
        unsubs: acc.unsubs + safeN(gs.unsubscriptions),
      };
    },
    { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubs: 0 }
  );

  const ga4Connected = ga4 && !ga4.error;
  const ga4NotConnected = ga4?.error === "ga4_not_connected";
  const dailyLast14 = (ga4?.daily ?? []).slice(-14);
  const dailyMax = Math.max(...dailyLast14.map(d => d.sessions), 1);

  const loading = brevoLoading || ga4Loading;

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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>✉ Brevo Email Marketing</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(72,187,120,0.12)", color: "#48bb78" }}>CONECTADO</span>
        </div>

        {brevoLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ height: 88, borderRadius: 12, background: "var(--card)", opacity: 0.5 }} />)}
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <SCard label="Campañas" value={campaigns.length} accent={GOLD} />
              <SCard label="Total enviados" value={totals.sent.toLocaleString("es-CO")} />
              <SCard label="Open Rate" value={pct(totals.opens, totals.sent)} accent={totals.sent > 0 ? "#22c55e" : undefined} />
              <SCard label="Click Rate" value={pct(totals.clicks, totals.sent)} />
            </div>

            {campaigns.length > 0 && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700 }}>Detalle por campaña</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Nombre", "Estado", "Enviados", "Abiertos", "Clicks", "Open%", "Click%"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--muted-foreground)", fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => {
                        const gs = c.statistics?.globalStats ?? {};
                        const sent = safeN(gs.sent);
                        const opens = safeN(gs.uniqueOpens);
                        const clicks = safeN(gs.uniqueClicks);
                        return (
                          <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</td>
                            <td style={{ padding: "10px 14px", color: "var(--muted-foreground)", textTransform: "capitalize" }}>{c.status}</td>
                            <td style={{ padding: "10px 14px" }}>{sent.toLocaleString("es-CO")}</td>
                            <td style={{ padding: "10px 14px" }}>{opens.toLocaleString("es-CO")}</td>
                            <td style={{ padding: "10px 14px" }}>{clicks.toLocaleString("es-CO")}</td>
                            <td style={{ padding: "10px 14px", color: sent > 0 ? GOLD : "var(--muted-foreground)" }}>{pct(opens, sent)}</td>
                            <td style={{ padding: "10px 14px" }}>{pct(clicks, sent)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 64 }}>
                  {dailyLast14.map((d, i) => {
                    const h = Math.max(4, (d.sessions / dailyMax) * 64);
                    const isLast = i === dailyLast14.length - 1;
                    const dateStr = `${d.date.slice(6, 8)}/${d.date.slice(4, 6)}`;
                    return (
                      <div key={i} title={`${dateStr}: ${d.sessions} sesiones`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "default" }}>
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
                          <div style={{ width: 64, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", flexShrink: 0 }}>
                            <div style={{ height: "100%", borderRadius: 2, width: `${w}%`, background: "#3b82f6" }} />
                          </div>
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
