"use client";

import React, { useEffect, useState, useCallback } from "react";
import { BSLoading } from "../ui/BSLoading";

const ACCENT = "var(--mkt-accent)";

interface ApiData {
  period: { months: number; fromTs: number; toTs: number };
  summary: {
    totalContacts: number;
    totalHandoffs: number;
    handoffRate: number;
    hotContacts: number;
    avgHandoffDays: number | null;
    tierCounts: Array<{ tier: number; count: number }>;
  };
  funnel: Array<{ stage: string; count: number }>;
  sourceBreakdown: Array<{ source: string; total: number; handoffs: number; engaged: number; hot: number; conversionRate: number }>;
  channelBreakdown: Array<{ channel: string; campaigns: number; contactsSent: number; avgOpenRate: number; avgClickRate: number; conversions: number }>;
  monthlyTrend: Array<{ label: string; handoffs: number; avgOpenRate: number; campaignsStarted: number }>;
  outcomeBreakdown: Array<{ label: string; type: string; count: number }>;
  topCampaigns: Array<{ id: string; name: string; status: string; channel: string; openRate: number; clickRate: number; conversions: number; totalContacts: number }>;
}

const SOURCE_LABELS: Record<string, string> = {
  website: "Sitio Web", referido: "Referido", redes_sociales: "Redes Sociales",
  formulario: "Formulario", evento: "Evento", llamada_fria: "Llamada Fría",
  whatsapp: "WhatsApp", unknown: "Sin fuente",
};

const card: React.CSSProperties = {
  background: "var(--mkt-card)", border: "1px solid var(--mkt-border)",
  borderRadius: 12, padding: 20,
};

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--mkt-text)", marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MonthlyBars({ data }: { data: ApiData["monthlyTrend"] }) {
  if (data.length === 0) return <div style={{ padding: 24, textAlign: "center", color: "var(--mkt-text-muted)", fontSize: 12 }}>Sin datos</div>;
  const maxH = Math.max(1, ...data.map((d) => d.handoffs));
  const maxOpen = Math.max(1, ...data.map((d) => d.avgOpenRate));
  const W = 720, H = 220, padding = 32;
  const barW = (W - 2 * padding) / data.length;
  const linePts = data.map((d, i) => {
    const x = padding + i * barW + barW / 2;
    const y = H - padding - (d.avgOpenRate / maxOpen) * (H - 2 * padding);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: "100%" }} preserveAspectRatio="xMidYMid meet">
      {[0.25, 0.5, 0.75, 1].map((p) => (
        <line key={p}
          x1={padding} y1={H - padding - p * (H - 2 * padding)}
          x2={W - padding} y2={H - padding - p * (H - 2 * padding)}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}
      {data.map((d, i) => {
        const x = padding + i * barW + 6;
        const w = barW - 12;
        const h = (d.handoffs / maxH) * (H - 2 * padding);
        return (
          <g key={i}>
            <rect x={x} y={H - padding - h} width={w} height={h} fill={ACCENT} opacity={0.55} rx={2} />
            <text x={x + w / 2} y={H - padding + 14} fill="rgba(255,255,255,0.5)" fontSize="9" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
      <polyline points={linePts} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = padding + i * barW + barW / 2;
        const y = H - padding - (d.avgOpenRate / maxOpen) * (H - 2 * padding);
        return <circle key={i} cx={x} cy={y} r={3} fill="#22c55e" />;
      })}
      <g transform={`translate(${padding}, ${H + 18})`}>
        <rect width={10} height={10} fill={ACCENT} opacity={0.55} />
        <text x={14} y={9} fill="rgba(255,255,255,0.7)" fontSize="10">Handoffs</text>
        <line x1={90} y1={5} x2={110} y2={5} stroke="#22c55e" strokeWidth={2} />
        <text x={114} y={9} fill="rgba(255,255,255,0.7)" fontSize="10">Avg Open Rate</text>
      </g>
    </svg>
  );
}

function Funnel({ data }: { data: ApiData["funnel"] }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const conversion = data[0].count > 0 ? (d.count / data[0].count) * 100 : 0;
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: "var(--mkt-text)" }}>{d.stage}</span>
              <span style={{ color: "var(--mkt-text-muted)" }}>{d.count} · {conversion.toFixed(0)}%</span>
            </div>
            <div style={{ height: 24, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${ACCENT}, rgba(195,154,76,0.4))`, transition: "width 0.3s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const PRESETS = [
  { months: 3, label: "3M" },
  { months: 6, label: "6M" },
  { months: 12, label: "12M" },
  { months: 24, label: "24M" },
];

export function MktIntelligence() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/marketing/intelligence?months=${months}`);
      setData(await r.json());
    } finally { setLoading(false); }
  }, [months]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return <BSLoading label="Cargando inteligencia…" />;
  }

  const s = data.summary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mkt-text)" }}>Marketing Intelligence</div>
          <div style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginTop: 2 }}>
            Atribución, embudo y rendimiento de campañas — últimos {months} meses
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", borderRadius: 8 }}>
          {PRESETS.map((p) => (
            <button key={p.months} onClick={() => setMonths(p.months)} style={{
              padding: "4px 12px", fontSize: 11, borderRadius: 5, border: "none",
              background: months === p.months ? ACCENT : "transparent",
              color: months === p.months ? "#0a0a0a" : "var(--mkt-text-muted)",
              fontWeight: months === p.months ? 600 : 400, cursor: "pointer",
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Contactos totales" value={String(s.totalContacts)} />
        <KPI label="Handoffs a ventas" value={String(s.totalHandoffs)} sub={`Tasa ${s.handoffRate.toFixed(1)}%`} />
        <KPI label="Contactos hot/warm" value={String(s.hotContacts)} />
        <KPI label="Tiempo a handoff" value={s.avgHandoffDays !== null ? `${s.avgHandoffDays}d` : "—"} sub="Días promedio" />
        <KPI label="Distribución Tier" value={s.tierCounts.map((t) => `T${t.tier}:${t.count}`).join(" · ")} />
      </div>

      {/* Monthly trend */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 12 }}>Tendencia mensual</div>
        <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 12 }}>
          Handoffs (barras doradas) y open rate promedio de campañas (línea verde)
        </div>
        <MonthlyBars data={data.monthlyTrend} />
      </div>

      {/* Two-col: Funnel & Source attribution */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 12 }}>Embudo de engagement</div>
          <Funnel data={data.funnel} />
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 12 }}>Atribución por fuente</div>
          {data.sourceBreakdown.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--mkt-text-muted)" }}>Sin datos</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.sourceBreakdown.slice(0, 7).map((row) => {
                const maxH = Math.max(1, ...data.sourceBreakdown.map((r) => r.handoffs));
                return (
                  <div key={row.source}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: "var(--mkt-text)" }}>{SOURCE_LABELS[row.source] ?? row.source}</span>
                      <span style={{ color: "var(--mkt-text-muted)" }}>
                        {row.handoffs} handoffs · {row.conversionRate.toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(row.handoffs / maxH) * 100}%`, background: ACCENT }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Channel performance */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 12 }}>Rendimiento por canal</div>
        {data.channelBreakdown.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--mkt-text-muted)" }}>Sin campañas</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--mkt-border)" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500, color: "var(--mkt-text-muted)" }}>Canal</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, color: "var(--mkt-text-muted)" }}>Campañas</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, color: "var(--mkt-text-muted)" }}>Contactos</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, color: "var(--mkt-text-muted)" }}>Open rate</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, color: "var(--mkt-text-muted)" }}>Click rate</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 500, color: "var(--mkt-text-muted)" }}>Conversiones</th>
              </tr>
            </thead>
            <tbody>
              {data.channelBreakdown.map((c) => (
                <tr key={c.channel} style={{ borderBottom: "1px solid var(--mkt-border)" }}>
                  <td style={{ padding: "8px 10px", color: "var(--mkt-text)" }}>{c.channel}</td>
                  <td style={{ textAlign: "right", padding: "8px 10px", color: "var(--mkt-text)" }}>{c.campaigns}</td>
                  <td style={{ textAlign: "right", padding: "8px 10px", color: "var(--mkt-text)" }}>{c.contactsSent}</td>
                  <td style={{ textAlign: "right", padding: "8px 10px", color: "var(--mkt-text)" }}>{c.avgOpenRate.toFixed(1)}%</td>
                  <td style={{ textAlign: "right", padding: "8px 10px", color: "var(--mkt-text)" }}>{c.avgClickRate.toFixed(1)}%</td>
                  <td style={{ textAlign: "right", padding: "8px 10px", color: ACCENT, fontWeight: 600 }}>{c.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Top campaigns + Outcomes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 12 }}>Top campañas por conversiones</div>
          {data.topCampaigns.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--mkt-text-muted)" }}>Sin datos</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.topCampaigns.map((c) => (
                <div key={c.id} style={{ padding: "10px 12px", background: "var(--mkt-surface)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text)" }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 2 }}>
                      {c.channel} · {c.openRate.toFixed(1)}% open · {c.clickRate.toFixed(1)}% click
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT }}>{c.conversions}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 12 }}>Outcomes de campañas</div>
          {data.outcomeBreakdown.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--mkt-text-muted)" }}>
              No hay campañas con outcome asignado.<br />
              Marca campañas completadas con un outcome para ver análisis aquí.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.outcomeBreakdown.map((o, i) => {
                const total = data.outcomeBreakdown.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? (o.count / total) * 100 : 0;
                const color = o.type === "success" ? "#22c55e" : o.type === "underperformed" ? "#f59e0b" : "#ef4444";
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: "var(--mkt-text)" }}>{o.label}</span>
                      <span style={{ color: "var(--mkt-text-muted)" }}>{o.count} · {pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color, opacity: 0.7 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
