"use client";

import React, { useEffect, useState } from "react";
import { MktBrevoHub } from "@/components/marketing/mkt-brevo-hub";

const GOLD = "#C39A4C";

const card: React.CSSProperties = {
  background: "var(--mkt-card, #111111)",
  border: "1px solid var(--mkt-border, #1e1e1e)",
  borderRadius: 12,
  padding: "20px 22px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, color: GOLD }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 1, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

interface DisplayCampaign {
  id: number;
  name: string;
  status: string;
  totalContacts: number;
  openRate: number;
  clickRate: number;
}

interface GA4Data {
  sessions: number;
  pageviews: number;
  activeUsers: number;
  bounceRate: number;
  newUsers: number;
  topPages: { page: string; views: number }[];
  trafficSources: { source: string; sessions: number }[];
  daily: { date: string; sessions: number }[];
  error?: string;
}

function safeN(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function mapBrevoCampaign(c: any): DisplayCampaign {
  const stats = c.statistics ?? {};
  const csList: any[] = Array.isArray(stats.campaignStats) ? stats.campaignStats : [];
  const gs = stats.globalStats ?? {};
  const sent   = csList.length > 0 ? csList.reduce((sum: number, cs: any) => sum + safeN(cs.sent), 0)         : safeN(gs.sent ?? gs.delivered);
  const opens  = csList.length > 0 ? csList.reduce((sum: number, cs: any) => sum + safeN(cs.uniqueViews), 0)  : safeN(gs.uniqueViews);
  const clicks = csList.length > 0 ? csList.reduce((sum: number, cs: any) => sum + safeN(cs.uniqueClicks), 0) : safeN(gs.uniqueClicks);
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    totalContacts: sent,
    openRate:  sent > 0 ? Math.round((opens / sent) * 1000) / 10 : 0,
    clickRate: sent > 0 ? Math.round((clicks / sent) * 1000) / 10 : 0,
  };
}

export function MktAnalytics({ onNavigate: _onNavigate }: { onNavigate?: (section: string) => void }) {
  const [campaigns, setCampaigns] = useState<DisplayCampaign[]>([]);
  const [brevoLoading, setBrevoLoading] = useState(true);
  const [ga4, setGa4] = useState<GA4Data | null>(null);
  const [ga4Loading, setGa4Loading] = useState(true);
  const [showHub, setShowHub] = useState(false);
  const [showGA4Detail, setShowGA4Detail] = useState(false);

  useEffect(() => {
    fetch("/api/brevo/campaigns")
      .then(r => r.json())
      .then(d => {
        const raw: any[] = d.campaigns || [];
        setCampaigns(raw.map(mapBrevoCampaign));
      })
      .catch(() => {})
      .finally(() => setBrevoLoading(false));

    fetch("/api/ga4")
      .then(r => r.json())
      .then(setGa4)
      .catch(() => setGa4({ error: "network", sessions: 0, pageviews: 0, activeUsers: 0, bounceRate: 0, newUsers: 0, topPages: [], trafficSources: [], daily: [] }))
      .finally(() => setGa4Loading(false));
  }, []);

  const totalSent    = campaigns.reduce((s, c) => s + c.totalContacts, 0);
  const avgOpenRate  = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.openRate, 0)  / campaigns.length : 0;
  const avgClickRate = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.clickRate, 0) / campaigns.length : 0;
  const best = campaigns.length > 0 ? campaigns.reduce((a, b) => b.openRate > a.openRate ? b : a) : null;

  const ga4Connected    = ga4 && !ga4.error;
  const ga4NotConnected = ga4?.error === "ga4_not_connected";

  // GA4 detail: sparkline max for scaling
  const maxSessions = ga4Connected && ga4 ? Math.max(...ga4.daily.map(d => d.sessions), 1) : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>Visión 360 de canales de marketing. Brevo y GA4 conectados.</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>

        {/* Brevo */}
        <div style={{ ...card, border: "1px solid rgba(195,154,76,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text)" }}>Brevo Overview</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(72,187,120,0.15)", color: "#48bb78" }}>Conectado</span>
          </div>
          {brevoLoading ? (
            <div style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>Cargando…</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <KPI label="Campañas" value={campaigns.length} />
                <KPI label="Total enviados" value={totalSent.toLocaleString("es-CO")} />
                <KPI label="Open rate avg" value={`${avgOpenRate.toFixed(1)}%`} />
                <KPI label="Click rate avg" value={`${avgClickRate.toFixed(1)}%`} />
              </div>
              {best && best.openRate > 0 && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(195,154,76,0.06)", border: "1px solid rgba(195,154,76,0.15)", fontSize: 11 }}>
                  <div style={{ color: "var(--mkt-text-muted)", marginBottom: 3 }}>Mejor campaña</div>
                  <div style={{ fontWeight: 600, color: "var(--mkt-text)", marginBottom: 2 }}>{best.name}</div>
                  <div style={{ color: "var(--mkt-text-muted)" }}>Open {best.openRate.toFixed(1)}% · Clicks {best.clickRate.toFixed(1)}%</div>
                </div>
              )}
              <button
                onClick={() => setShowHub(v => !v)}
                style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(195,154,76,0.3)", background: showHub ? "rgba(195,154,76,0.12)" : "transparent", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                {showHub ? "Ocultar datos Brevo ↑" : "Ver todos los datos de Brevo ↓"}
              </button>
            </>
          )}
        </div>

        {/* Google Analytics 4 */}
        <div style={{ ...card, border: ga4Connected ? "1px solid rgba(195,154,76,0.3)" : "1px solid var(--mkt-border, #1e1e1e)", opacity: ga4Connected ? 1 : ga4NotConnected ? 0.75 : 0.55 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text)" }}>Google Analytics 4</div>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
              background: ga4Connected ? "rgba(72,187,120,0.15)" : "rgba(109,31,46,0.25)",
              color: ga4Connected ? "#48bb78" : "#f87171",
            }}>
              {ga4Connected ? "Conectado" : "Pendiente"}
            </span>
          </div>

          {ga4Loading ? (
            <div style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>Cargando…</div>
          ) : ga4Connected && ga4 ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <KPI label="Sesiones (30d)" value={ga4.sessions.toLocaleString("es-CO")} />
                <KPI label="Páginas vistas" value={ga4.pageviews.toLocaleString("es-CO")} />
                <KPI label="Usuarios activos" value={ga4.activeUsers.toLocaleString("es-CO")} />
                <KPI label="Bounce Rate" value={`${(ga4.bounceRate * 100).toFixed(1)}%`} />
              </div>
              {ga4.trafficSources.length > 0 && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(195,154,76,0.06)", border: "1px solid rgba(195,154,76,0.15)", fontSize: 11 }}>
                  <div style={{ color: "var(--mkt-text-muted)", marginBottom: 6 }}>Top fuente</div>
                  {ga4.trafficSources.slice(0, 3).map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "var(--mkt-text-muted)", marginBottom: 3 }}>
                      <span>{s.source}</span>
                      <span style={{ fontWeight: 600, color: "var(--mkt-text)" }}>{s.sessions}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowGA4Detail(v => !v)}
                style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(195,154,76,0.3)", background: showGA4Detail ? "rgba(195,154,76,0.12)" : "transparent", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                {showGA4Detail ? "Ocultar Analytics ↑" : "Ver Analytics ↓"}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>
                {ga4NotConnected
                  ? "Conecta Google Analytics para ver sesiones y tráfico en tiempo real."
                  : "Sin datos disponibles. Conecta la integración para ver métricas en tiempo real."}
              </div>
              <button
                onClick={() => window.open("/api/auth/signin/google?callbackUrl=/marketing", "_blank")}
                style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid var(--mkt-border, #1e1e1e)", background: "transparent", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                Conectar GA4
              </button>
            </>
          )}
        </div>

        {/* LinkedIn — pending */}
        <div style={{ ...card, opacity: 0.45 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text)" }}>LinkedIn API</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(109,31,46,0.25)", color: "#f87171" }}>Pendiente</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>Sin datos disponibles. Conecta la integración para ver métricas en tiempo real.</div>
          <button disabled style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid var(--mkt-border, #1e1e1e)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 12, cursor: "not-allowed" }}>
            Conectar
          </button>
        </div>

        {/* Meta — not configured */}
        <div style={{ ...card, opacity: 0.45 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text)" }}>Meta Ads</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(100,100,100,0.25)", color: "#9ca3af" }}>No configurado</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>Sin datos disponibles. Conecta la integración para ver métricas en tiempo real.</div>
          <button disabled style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid var(--mkt-border, #1e1e1e)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 12, cursor: "not-allowed" }}>
            Conectar
          </button>
        </div>

      </div>

      {/* Inline Brevo data panel */}
      {showHub && (
        <div style={{ borderRadius: 12, border: "1px solid rgba(195,154,76,0.25)", background: "rgba(195,154,76,0.03)", padding: "20px 22px" }}>
          <MktBrevoHub />
        </div>
      )}

      {/* Inline GA4 detail panel */}
      {showGA4Detail && ga4Connected && ga4 && (
        <div style={{ borderRadius: 12, border: "1px solid rgba(195,154,76,0.25)", background: "rgba(195,154,76,0.03)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Traffic sources bar chart */}
          {ga4.trafficSources.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mkt-text)", marginBottom: 12 }}>Fuentes de Tráfico</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ga4.trafficSources.slice(0, 8).map((s, i) => {
                  const maxS = Math.max(...ga4.trafficSources.map(x => x.sessions), 1);
                  const pct = Math.round((s.sessions / maxS) * 100);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 110, fontSize: 11, color: "var(--mkt-text-muted)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.source}</div>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--mkt-border, #1e1e1e)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: GOLD, transition: "width 0.4s ease" }} />
                      </div>
                      <div style={{ width: 40, fontSize: 11, fontWeight: 600, color: "var(--mkt-text)", textAlign: "right", flexShrink: 0 }}>{s.sessions}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily sessions sparkline */}
          {ga4.daily.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mkt-text)", marginBottom: 12 }}>Sesiones diarias (30d)</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
                {ga4.daily.map((d, i) => {
                  const h = Math.max(4, Math.round((d.sessions / maxSessions) * 56));
                  return (
                    <div key={i} title={`${d.date}: ${d.sessions}`} style={{ flex: 1, height: h, borderRadius: "2px 2px 0 0", background: GOLD, opacity: 0.75, minWidth: 3 }} />
                  );
                })}
              </div>
            </div>
          )}

          {/* Top pages table */}
          {ga4.topPages.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mkt-text)", marginBottom: 10 }}>Páginas más vistas</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--mkt-text-muted)", fontWeight: 600, paddingBottom: 4, borderBottom: "1px solid var(--mkt-border, #1e1e1e)" }}>
                  <span>Página</span><span>Vistas</span>
                </div>
                {ga4.topPages.slice(0, 10).map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mkt-text-muted)", padding: "3px 0" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>{p.page}</span>
                    <span style={{ fontWeight: 600, color: "var(--mkt-text)", flexShrink: 0 }}>{p.views.toLocaleString("es-CO")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
