"use client";

import React, { useEffect, useState } from "react";

interface Stats {
  campaigns: { total: number; totalSent: number; avgOpenRate: number; avgClickRate: number; totalConversions: number };
  contacts: { total: number; newThisWeek: number; handoffsThisWeek: number };
  best: { name: string; openRate: number; clickRate: number; conversions: number } | null;
}

const card: React.CSSProperties = { background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 };

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#C39A4C" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#718096", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#718096", marginTop: 1, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

function PendingCard({ name, reason }: { name: string; reason: string }) {
  return (
    <div style={{ ...card, opacity: 0.55 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{name}</div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(109,31,46,0.25)", color: "#f87171" }}>{reason}</span>
      </div>
      <div style={{ fontSize: 12, color: "#718096" }}>Sin datos disponibles. Conecta la integración para ver métricas en tiempo real.</div>
      <button disabled style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid #1e1e1e", background: "transparent", color: "#718096", fontSize: 12, cursor: "not-allowed" }}>
        Conectar
      </button>
    </div>
  );
}

export function MktAnalytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/app/api/marketing/stats")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setStats(d); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const s = stats;
  const n = (v: unknown) => { const x = Number(v); return isNaN(x) ? 0 : x; };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 12, color: "#718096" }}>Visión 360 de canales de marketing. Solo Brevo está conectado.</div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(109,31,46,0.15)", border: "1px solid #6D1F2E", fontSize: 12, color: "#f87171" }}>{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {/* Brevo — real data */}
        <div style={{ ...card, border: "1px solid rgba(195,154,76,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Brevo Overview</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(72,187,120,0.15)", color: "#48bb78" }}>Conectado</span>
          </div>

          {loading ? (
            <div style={{ fontSize: 12, color: "#718096" }}>Cargando…</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <KPI label="Campañas" value={n(s?.campaigns.total)} />
                <KPI label="Total enviados" value={n(s?.campaigns.totalSent).toLocaleString("es-CO")} />
                <KPI label="Open rate avg" value={`${n(s?.campaigns.avgOpenRate).toFixed(1)}%`} />
                <KPI label="Click rate avg" value={`${n(s?.campaigns.avgClickRate).toFixed(1)}%`} />
              </div>
              {s?.best && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(195,154,76,0.06)", border: "1px solid rgba(195,154,76,0.15)", fontSize: 11 }}>
                  <div style={{ color: "#718096", marginBottom: 3 }}>Mejor campaña</div>
                  <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>{s.best.name}</div>
                  <div style={{ color: "#718096" }}>Open {n(s.best.openRate).toFixed(1)}% · Clicks {n(s.best.clickRate).toFixed(1)}%</div>
                </div>
              )}
              <button
                onClick={() => window.open("https://app.brevo.com", "_blank")}
                style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(195,154,76,0.3)", background: "transparent", color: "#C39A4C", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
              >
                Ver datos →
              </button>
            </>
          )}
        </div>

        <PendingCard name="Google Analytics" reason="Pendiente" />
        <PendingCard name="LinkedIn API" reason="Pendiente" />
        <PendingCard name="Meta Ads" reason="No configurado" />
      </div>
    </div>
  );
}
