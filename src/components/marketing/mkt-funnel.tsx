"use client";

import React, { useEffect, useState } from "react";
import { mktFormatCOP } from "./mkt-utils";
import { MKT_SOURCE_LABELS } from "./mkt-types";

interface FunnelData {
  hasData: boolean;
  leads: number;
  engaged: number;
  mql: number;
  handoff: number;
  won: number;
  revenue: { wonCents: number; openCents: number; wonCount: number; openCount: number };
  sources: Array<{
    source: string;
    leads: number;
    engaged: number;
    mql: number;
    handoff: number;
    won: number;
    wonCents: number;
    conversion: number;
  }>;
  updatedAt: number;
}

const STAGE_META: Array<{ key: keyof Pick<FunnelData, "leads" | "engaged" | "mql" | "handoff" | "won">; label: string; sub: string; color: string }> = [
  { key: "leads", label: "Leads", sub: "Contactos totales", color: "var(--mkt-text-muted)" },
  { key: "engaged", label: "Engaged", sub: "Abrieron o clickearon", color: "#f59e0b" },
  { key: "mql", label: "MQL", sub: "Calificados por marketing", color: "#ef4444" },
  { key: "handoff", label: "Entregados a Ventas", sub: "Pasados al pipeline", color: "var(--mkt-accent)" },
  { key: "won", label: "Ganados", sub: "Deals cerrados", color: "#22c55e" },
];

function pct(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 12, background: "var(--mkt-surface)", border: `1px solid ${accent ? "var(--mkt-accent)" : "var(--mkt-border)"}`, minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? "var(--mkt-accent)" : "var(--mkt-text)", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function MktFunnel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/app/api/marketing/funnel")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>Calculando embudo…</div>;
  if (error) return <div style={{ fontSize: 13, color: "#ef4444" }}>{error}</div>;
  if (!data) return null;

  const counts: Record<string, number> = { leads: data.leads, engaged: data.engaged, mql: data.mql, handoff: data.handoff, won: data.won };
  const top = Math.max(data.leads, 1);

  // Empty state — honest, no fake numbers.
  if (!data.hasData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "50vh", gap: 12, textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mkt-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h18l-7 8v6l-4 2v-8z" />
          </svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--mkt-text)" }}>Tu embudo está listo</div>
        <div style={{ fontSize: 13, color: "var(--mkt-text-muted)", maxWidth: 380, lineHeight: 1.5 }}>
          Aún no hay leads. Usa <strong style={{ color: "var(--mkt-accent)" }}>Sincronizar Brevo</strong> en el panel izquierdo para poblar el embudo con tus contactos reales — y verás cada etapa hasta los deals ganados.
        </div>
      </div>
    );
  }

  const overallConv = pct(data.won, data.leads);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* KPI strip — what a CMO/CEO checks first */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <Kpi label="Leads totales" value={data.leads.toLocaleString("es-CO")} />
        <Kpi label="MQL (calificados)" value={data.mql.toLocaleString("es-CO")} />
        <Kpi label="Entregados a ventas" value={data.handoff.toLocaleString("es-CO")} />
        <Kpi label="Revenue ganado" value={mktFormatCOP(data.revenue.wonCents / 100)} accent />
        <Kpi label="Conversión lead→deal" value={overallConv} />
      </div>

      {/* The funnel */}
      <div style={{ background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mkt-text)", marginBottom: 16 }}>Embudo de marketing</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {STAGE_META.map((stage, i) => {
            const count = counts[stage.key];
            const width = Math.max((count / top) * 100, count > 0 ? 6 : 2);
            const prev = i > 0 ? counts[STAGE_META[i - 1].key] : null;
            const conv = prev != null ? pct(count, prev) : null;
            return (
              <div key={stage.key}>
                {conv != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0 2px 8px", height: 18 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--mkt-text-muted)" strokeWidth="2" style={{ opacity: 0.4 }}>
                      <path d="M12 5v14m0 0l-6-6m6 6l6-6" />
                    </svg>
                    <span style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{conv} continúa</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 150, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)" }}>{stage.label}</div>
                    <div style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{stage.sub}</div>
                  </div>
                  <div style={{ flex: 1, height: 38, position: "relative", display: "flex", alignItems: "center" }}>
                    <div style={{
                      width: `${width}%`, height: "100%", borderRadius: 8,
                      background: stage.color, opacity: stage.color.startsWith("var") ? 0.85 : 0.9,
                      display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12,
                      transition: "width 0.4s ease", minWidth: 44,
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: stage.key === "leads" ? "var(--mkt-text)" : "#0a0a0a" }}>
                        {count.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginLeft: 10 }}>{pct(count, top)} del total</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue impact — the CEO bottom line */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <div style={{ padding: 18, borderRadius: 12, background: "var(--mkt-surface)", border: "1px solid #22c55e" }}>
          <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 6 }}>Revenue ganado · atribuido a marketing</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e", letterSpacing: "-0.02em" }}>{mktFormatCOP(data.revenue.wonCents / 100)}</div>
          <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 4 }}>{data.revenue.wonCount} deals cerrados</div>
        </div>
        <div style={{ padding: 18, borderRadius: 12, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)" }}>
          <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 6 }}>Pipeline abierto · atribuido a marketing</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--mkt-accent)", letterSpacing: "-0.02em" }}>{mktFormatCOP(data.revenue.openCents / 100)}</div>
          <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 4 }}>{data.revenue.openCount} deals en curso</div>
        </div>
      </div>

      {/* Source breakdown */}
      {data.sources.length > 0 && (
        <div style={{ background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--mkt-border)", fontSize: 13, fontWeight: 700, color: "var(--mkt-text)" }}>
            Embudo por fuente
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "var(--mkt-text-muted)" }}>
                  {["Fuente", "Leads", "Engaged", "MQL", "A Ventas", "Ganados", "Revenue", "Conv."].map((h, i) => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: i === 0 ? "left" : "right", fontWeight: 600, borderBottom: "1px solid var(--mkt-border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sources.map(s => (
                  <tr key={s.source} style={{ borderBottom: "1px solid var(--mkt-border)" }}>
                    <td style={{ padding: "9px 14px", color: "var(--mkt-text)", fontWeight: 600 }}>{MKT_SOURCE_LABELS[s.source] ?? s.source}</td>
                    <td style={{ padding: "9px 14px", color: "var(--mkt-text)", textAlign: "right" }}>{s.leads.toLocaleString("es-CO")}</td>
                    <td style={{ padding: "9px 14px", color: "var(--mkt-text-muted)", textAlign: "right" }}>{s.engaged.toLocaleString("es-CO")}</td>
                    <td style={{ padding: "9px 14px", color: "var(--mkt-text-muted)", textAlign: "right" }}>{s.mql.toLocaleString("es-CO")}</td>
                    <td style={{ padding: "9px 14px", color: "var(--mkt-text-muted)", textAlign: "right" }}>{s.handoff.toLocaleString("es-CO")}</td>
                    <td style={{ padding: "9px 14px", color: "#22c55e", textAlign: "right", fontWeight: 600 }}>{s.won.toLocaleString("es-CO")}</td>
                    <td style={{ padding: "9px 14px", color: "var(--mkt-text)", textAlign: "right" }}>{s.wonCents > 0 ? mktFormatCOP(s.wonCents / 100) : "—"}</td>
                    <td style={{ padding: "9px 14px", color: s.conversion >= 5 ? "#22c55e" : "var(--mkt-text-muted)", textAlign: "right", fontWeight: 600 }}>{s.conversion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", textAlign: "right" }}>
        Datos reales · Brevo + pipeline de ventas. Revenue atribuido a contactos entregados desde marketing.
      </div>
    </div>
  );
}
