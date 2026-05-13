"use client";

import React, { useEffect, useState } from "react";
import { useMkt } from "./mkt-provider";

interface Stats {
  campaigns: { total: number; totalSent: number; avgOpenRate: number; avgClickRate: number; totalConversions: number };
  contacts: { total: number; newThisWeek: number; handoffsThisWeek: number };
  best: { name: string; openRate: number; clickRate: number; conversions: number } | null;
}

function todayLabel() {
  const d = new Date();
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${d.getDate()} de ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const n = (v: unknown) => { const x = Number(v); return isNaN(x) ? 0 : x; };

const card: React.CSSProperties = { background: "#111111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 18px" };

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent ? "#C39A4C" : "#e2e8f0" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#718096", marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#718096", marginTop: 2, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

export function MktDigest() {
  const { contacts } = useMkt();
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

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newContacts = contacts.filter(c => (c.lastActivity || 0) >= weekAgo).length;
  const handoffsWeek = contacts.filter(c => c.readyForSales && c.passedToSalesAt && c.passedToSalesAt >= weekAgo).length;

  const handleExportCSV = () => {
    const rows = [
      ["Métrica", "Valor"],
      ["Semana", todayLabel()],
      ["Nuevos contactos", newContacts],
      ["Handoffs a ventas", handoffsWeek],
      ["Campañas totales", n(stats?.campaigns.total)],
      ["Total enviados", n(stats?.campaigns.totalSent)],
      ["Open rate avg %", n(stats?.campaigns.avgOpenRate).toFixed(1)],
      ["Click rate avg %", n(stats?.campaigns.avgClickRate).toFixed(1)],
      ["Conversiones", n(stats?.campaigns.totalConversions)],
      ["Mejor campaña", stats?.best?.name ?? "—"],
      ["Mejor open rate %", n(stats?.best?.openRate).toFixed(1)],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `digest-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>Resumen de la semana</div>
          <div style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>{todayLabel()}</div>
        </div>
        <button onClick={handleExportCSV} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #1e1e1e", background: "transparent", color: "#C39A4C", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Exportar CSV
        </button>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(109,31,46,0.15)", border: "1px solid #6D1F2E", fontSize: 12, color: "#f87171" }}>{error}</div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: "#718096" }}>Cargando resumen…</div>
      ) : (
        <>
          {/* Contactos */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Contactos esta semana</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
              <KpiCard label="Nuevos contactos" value={newContacts} accent />
              <KpiCard label="Handoffs a ventas" value={handoffsWeek} />
            </div>
          </div>

          {/* Email */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Email (Brevo acumulado)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
              <KpiCard label="Total enviados" value={n(stats?.campaigns.totalSent).toLocaleString("es-CO")} />
              <KpiCard label="Open rate avg" value={`${n(stats?.campaigns.avgOpenRate).toFixed(1)}%`} />
              <KpiCard label="Total clicks" value={n(stats?.campaigns.totalConversions)} />
              <KpiCard label="Replies" value="—" sub="No disponible en Brevo v3" />
            </div>
          </div>

          {/* Mejor campaña */}
          {stats?.best && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Mejor campaña</div>
              <div style={{ ...card, display: "flex", flexDirection: "column", gap: 8, borderColor: "rgba(195,154,76,0.3)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{stats.best.name}</div>
                <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#718096" }}>
                  <span>Open rate <strong style={{ color: "#C39A4C" }}>{n(stats.best.openRate).toFixed(1)}%</strong></span>
                  <span>Clicks <strong style={{ color: "#e2e8f0" }}>{n(stats.best.clickRate).toFixed(1)}%</strong></span>
                  <span>Conversiones <strong style={{ color: "#e2e8f0" }}>{n(stats.best.conversions)}</strong></span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
