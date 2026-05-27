"use client";

import React, { useEffect, useRef, useState } from "react";
import { BSLoading } from "@/components/ui/BSLoading";

const GOLD = "#C39A4C";

interface Metrics {
  windowDays: number;
  sent: number;
  delivered: number;
  uniqueOpens: number;
  totalOpens: number;
  confirmedOpens: number;
  mppOpens: number;
  filteredOpens: number;
  uniqueClicks: number;
  totalClicks: number;
  replies: number;
  unsubscribes: number;
  bounces: number;
  complaints: number;
  rates: {
    openRate: number; clickRate: number; ctor: number;
    replyRate: number; bounceRate: number; unsubRate: number;
  };
  topLinks: { url: string; clicks: number }[];
  daily: { date: string; sent: number; opens: number; clicks: number; replies: number }[];
  error?: string;
}

const card: React.CSSProperties = {
  background: "var(--mkt-card, #111111)",
  border: "1px solid var(--mkt-border, #1e1e1e)",
  borderRadius: 12,
  padding: "18px 20px",
};

function Kpi({ label, value, sub, accent, primary }: { label: string; value: string; sub?: string; accent?: string; primary?: boolean }) {
  return (
    <div style={{ ...card, ...(primary ? { border: `1px solid rgba(195,154,76,0.35)` } : {}) }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent ?? GOLD }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 1, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

const WINDOWS = [7, 30, 90];

export function MktEmailPerformance() {
  const [days, setDays] = useState(30);
  const [m, setM] = useState<Metrics | null>(null);
  // loadedDays tracks which window is reflected in `m` — loading is derived,
  // so no synchronous setState is needed inside the effect body.
  const [loadedDays, setLoadedDays] = useState<number | null>(null);
  const cancelRef = useRef<boolean>(false);
  const loading = loadedDays !== days;

  useEffect(() => {
    cancelRef.current = false;
    fetch(`/api/email/metrics?days=${days}`)
      .then(r => r.json())
      .then(data => { if (!cancelRef.current) { setM(data); setLoadedDays(days); } })
      .catch(() => { if (!cancelRef.current) { setM(null); setLoadedDays(days); } });
    return () => { cancelRef.current = true; };
  }, [days]);

  const maxDaily = m?.daily.reduce((mx, d) => Math.max(mx, d.sent, d.opens, d.clicks), 0) ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>
          Rendimiento de email enviado desde el CRM (Gmail). Clicks y respuestas son las señales de intención reales; las aperturas son indicativas.
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {WINDOWS.map(w => (
            <button key={w} onClick={() => setDays(w)} style={{
              padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: `1px solid ${days === w ? GOLD : "var(--mkt-border, #1e1e1e)"}`,
              background: days === w ? "rgba(195,154,76,0.12)" : "transparent",
              color: days === w ? GOLD : "var(--mkt-text-muted)",
            }}>{w}d</button>
          ))}
        </div>
      </div>

      {loading ? (
        <BSLoading label="Cargando métricas de email…" minHeight={160} />
      ) : !m || m.error ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 0", color: "var(--mkt-text-muted)", fontSize: 13 }}>
          {m?.error ? `Error: ${m.error}` : "No se pudieron cargar las métricas."}
        </div>
      ) : m.sent === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 0", color: "var(--mkt-text-muted)", fontSize: 13 }}>
          Aún no se han enviado emails en esta ventana. Las métricas aparecerán cuando envíes secuencias o campañas desde el CRM.
        </div>
      ) : (
        <>
          {/* Primary signals: clicks + replies */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            <Kpi primary label="Click Rate" value={`${m.rates.clickRate}%`} sub={`${m.uniqueClicks} de ${m.delivered} entregados`} accent="#48bb78" />
            <Kpi primary label="Reply Rate" value={`${m.rates.replyRate}%`} sub={`${m.replies} respuestas`} accent="#48bb78" />
            <Kpi label="CTOR" value={`${m.rates.ctor}%`} sub="clicks / aperturas confirmadas" />
            <Kpi label="Enviados" value={m.sent.toLocaleString("es-CO")} sub={`${m.delivered} entregados`} />
          </div>

          {/* Opens — confirmed (real reads) vs Apple MPP (prefetch, excluded) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            <Kpi label="Aperturas confirmadas" value={`${m.rates.openRate}%`} sub={`${m.uniqueOpens} lecturas reales (humano + Gmail)`} accent="#48bb78" />
            <Kpi label="Apple MPP" value={String(m.mppOpens)} sub="prefetch de Apple · no contadas" accent="#9ca3af" />
            <Kpi label="Filtradas" value={String(m.filteredOpens)} sub="bots / scanners / prefetch" accent="#9ca3af" />
          </div>

          {/* Deliverability health */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            <Kpi label="Bounce Rate" value={`${m.rates.bounceRate}%`} sub={`${m.bounces} rebotes`} accent={m.rates.bounceRate > 2 ? "#f87171" : "#9ca3af"} />
            <Kpi label="Unsub Rate" value={`${m.rates.unsubRate}%`} sub={`${m.unsubscribes} bajas`} accent={m.rates.unsubRate > 0.5 ? "#f87171" : "#9ca3af"} />
            <Kpi label="Quejas (spam)" value={String(m.complaints)} accent={m.complaints > 0 ? "#f87171" : "#9ca3af"} />
          </div>

          {/* Daily activity */}
          {m.daily.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--mkt-text)" }}>Actividad diaria</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
                {m.daily.map(d => (
                  <div key={d.date} title={`${d.date} · ${d.sent} env · ${d.opens} ap · ${d.clicks} clk · ${d.replies} resp`}
                    style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 1, minWidth: 3 }}>
                    <div style={{ height: maxDaily ? `${(d.clicks / maxDaily) * 100}%` : 0, background: "#48bb78", borderRadius: "2px 2px 0 0", minHeight: d.clicks ? 2 : 0 }} />
                    <div style={{ height: maxDaily ? `${(d.opens / maxDaily) * 100}%` : 0, background: "rgba(195,154,76,0.5)", minHeight: d.opens ? 2 : 0 }} />
                    <div style={{ height: maxDaily ? `${(d.sent / maxDaily) * 100}%` : 0, background: "rgba(255,255,255,0.12)", minHeight: d.sent ? 2 : 0 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 10, color: "var(--mkt-text-muted)" }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, background: "rgba(255,255,255,0.12)", marginRight: 4 }} />Enviados</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, background: "rgba(195,154,76,0.5)", marginRight: 4 }} />Aperturas</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#48bb78", marginRight: 4 }} />Clicks</span>
              </div>
            </div>
          )}

          {/* Top clicked links */}
          {m.topLinks.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--mkt-text)" }}>Enlaces más clickeados</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {m.topLinks.map((l, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--mkt-border, #1e1e1e)" }}>
                    <span style={{ color: "var(--mkt-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.url}</span>
                    <span style={{ fontWeight: 700, color: GOLD, flexShrink: 0 }}>{l.clicks}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
