"use client";

import React, { useEffect, useState } from "react";
import { GA4Detail } from "@/components/analytics/ga4-detail";
import { GSCPanel } from "@/components/analytics/gsc-panel";
import { MktBrevoHub } from "@/components/marketing/mkt-brevo-hub";

const GOLD = "#C39A4C";

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
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
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 1, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

interface Campaign {
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

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brevoLoading, setBrevoLoading] = useState(true);
  const [ga4, setGa4] = useState<GA4Data | null>(null);
  const [ga4Loading, setGa4Loading] = useState(true);
  const [showBrevo, setShowBrevo] = useState(false);
  const [showGA4, setShowGA4] = useState(false);

  useEffect(() => {
    fetch("/api/brevo/campaigns")
      .then(r => r.json())
      .then(d => {
        const raw = d.campaigns || [];
        const mapped: Campaign[] = raw.map((c: any) => {
          const gs = c.statistics?.globalStats ?? {};
          const sent = safeN(gs.sent);
          const opens = safeN(gs.uniqueViews);
          const clicks = safeN(gs.uniqueClicks);
          return {
            id: c.id,
            name: c.name,
            status: c.status,
            totalContacts: sent,
            openRate: sent > 0 ? (opens / sent) * 100 : 0,
            clickRate: sent > 0 ? (clicks / sent) * 100 : 0,
          };
        });
        setCampaigns(mapped);
      })
      .catch(() => {})
      .finally(() => setBrevoLoading(false));

    fetch("/api/ga4")
      .then(r => r.json())
      .then(setGa4)
      .catch(() => setGa4({ error: "network", sessions: 0, pageviews: 0, activeUsers: 0, bounceRate: 0, newUsers: 0, topPages: [], trafficSources: [], daily: [] }))
      .finally(() => setGa4Loading(false));
  }, []);

  const totalSent = campaigns.reduce((s, c) => s + c.totalContacts, 0);
  const avgOpenRate = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.openRate, 0) / campaigns.length : 0;
  const avgClickRate = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.clickRate, 0) / campaigns.length : 0;
  const best = campaigns.length > 0 ? campaigns.reduce((a, b) => b.openRate > a.openRate ? b : a) : null;

  const ga4Connected = ga4 && !ga4.error;
  const ga4NotConnected = ga4?.error === "ga4_not_connected";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Analytics</h1>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>Visión 360 de canales de marketing. Brevo y GA4 conectados.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>

        {/* Brevo */}
        <div style={{ ...cardStyle, border: "1px solid rgba(195,154,76,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Brevo Overview</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(72,187,120,0.15)", color: "#48bb78" }}>Conectado</span>
          </div>
          {brevoLoading ? (
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Cargando…</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <KPI label="Campañas" value={campaigns.length} />
                <KPI label="Total contactos" value={totalSent.toLocaleString("es-CO")} />
                <KPI label="Open rate avg" value={`${avgOpenRate.toFixed(1)}%`} />
                <KPI label="Click rate avg" value={`${avgClickRate.toFixed(1)}%`} />
              </div>
              {best && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(195,154,76,0.06)", border: "1px solid rgba(195,154,76,0.15)", fontSize: 11 }}>
                  <div style={{ color: "var(--muted-foreground)", marginBottom: 3 }}>Mejor campaña</div>
                  <div style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 2 }}>{best.name}</div>
                  <div style={{ color: "var(--muted-foreground)" }}>Open {best.openRate.toFixed(1)}% · Clicks {best.clickRate.toFixed(1)}%</div>
                </div>
              )}
              <button
                onClick={() => setShowBrevo(v => !v)}
                style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(195,154,76,0.3)", background: showBrevo ? "rgba(195,154,76,0.12)" : "transparent", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                {showBrevo ? "Ocultar datos Brevo ↑" : "Ver todos los datos de Brevo ↓"}
              </button>
            </>
          )}
        </div>

        {/* Google Analytics 4 */}
        <div style={{ ...cardStyle, border: ga4Connected ? "1px solid rgba(195,154,76,0.3)" : "1px solid var(--border)", opacity: ga4Connected ? 1 : ga4NotConnected ? 0.75 : 0.55 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Google Analytics 4</div>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
              background: ga4Connected ? "rgba(72,187,120,0.15)" : "rgba(109,31,46,0.25)",
              color: ga4Connected ? "#48bb78" : "#f87171",
            }}>
              {ga4Connected ? "Conectado" : "Pendiente"}
            </span>
          </div>

          {ga4Loading ? (
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Cargando…</div>
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
                  <div style={{ color: "var(--muted-foreground)", marginBottom: 6 }}>Top fuente</div>
                  {ga4.trafficSources.slice(0, 3).map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "var(--muted-foreground)", marginBottom: 3 }}>
                      <span>{s.source}</span>
                      <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{s.sessions}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowGA4(v => !v)}
                style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(195,154,76,0.3)", background: showGA4 ? "rgba(195,154,76,0.12)" : "transparent", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                {showGA4 ? "Ocultar Analytics ↑" : "Ver Analytics detallado ↓"}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                {ga4NotConnected
                  ? "Conecta Google Analytics para ver sesiones y tráfico en tiempo real."
                  : "Sin datos disponibles. Conecta la integración para ver métricas en tiempo real."}
              </div>
              <button
                onClick={() => window.open("/api/auth/signin/google?callbackUrl=/analytics", "_blank")}
                style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                Conectar GA4
              </button>
            </>
          )}
        </div>

        {/* LinkedIn — pending */}
        <div style={{ ...cardStyle, opacity: 0.45 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>LinkedIn API</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(109,31,46,0.25)", color: "#f87171" }}>Pendiente</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sin datos disponibles. Conecta la integración para ver métricas en tiempo real.</div>
          <button disabled style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 12, cursor: "not-allowed" }}>
            Conectar
          </button>
        </div>

        {/* Meta — not configured */}
        <div style={{ ...cardStyle, opacity: 0.45 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Meta Ads</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(100,100,100,0.25)", color: "#9ca3af" }}>No configurado</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sin datos disponibles. Conecta la integración para ver métricas en tiempo real.</div>
          <button disabled style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 12, cursor: "not-allowed" }}>
            Conectar
          </button>
        </div>

      </div>

      {/* Inline Brevo data hub */}
      {showBrevo && (
        <div style={{
          borderRadius: 12, border: "1px solid rgba(195,154,76,0.25)",
          background: "rgba(195,154,76,0.03)",
          padding: "20px 22px",
        }}>
          <MktBrevoHub />
        </div>
      )}

      {/* Inline GA4 detail with date filters */}
      {showGA4 && (
        <div style={{
          borderRadius: 12, border: "1px solid rgba(195,154,76,0.25)",
          background: "rgba(195,154,76,0.03)",
          padding: "20px 22px",
        }}>
          <GA4Detail />
        </div>
      )}

      {/* Google Search Console — self-contained expandable panel */}
      <GSCPanel />
    </div>
  );
}
