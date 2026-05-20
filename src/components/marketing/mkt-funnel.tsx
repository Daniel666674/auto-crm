"use client";

import React, { useEffect, useState, useCallback } from "react";
import { BSLoading } from "../ui/BSLoading";

interface FunnelData {
  lifecycleCounts: Record<string, number>;
  conversionRates: { from: string; to: string; rate: number; dropoff: number }[];
  dealStageBreakdown: {
    id: string; name: string; order: number; color: string;
    isWon: boolean; isLost: boolean; count: number; value: number;
  }[];
  returnedCount: number;
  totalContacts: number;
}

const STAGE_LABELS: Record<string, string> = {
  subscriber: "Suscriptor", lead: "Lead", MQL: "MQL", SQL: "SQL",
  opportunity: "Oportunidad", customer: "Cliente", evangelist: "Evangelista",
};
const STAGE_COLORS: Record<string, string> = {
  subscriber: "#94a3b8", lead: "#60a5fa", MQL: "#a78bfa",
  SQL: "#f59e0b", opportunity: "#f97316", customer: "#22c55e", evangelist: "#ec4899",
};

function formatCOP(cents: number): string {
  const cop = Math.round(cents / 100);
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(cop);
}

export function MktFunnel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/funnel");
      const d = await res.json();
      if (!d.error) setData(d);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return <BSLoading label="Cargando funnel…" />;
  }

  const maxLifecycle = Math.max(...Object.values(data.lifecycleCounts), 1);
  const stages = Object.keys(STAGE_LABELS).filter(s => data.lifecycleCounts[s] !== undefined);

  const totalPipelineValue = data.dealStageBreakdown.filter(s => !s.isLost).reduce((sum, s) => sum + s.value, 0);
  const wonStages = data.dealStageBreakdown.filter(s => s.isWon);
  const wonValue = wonStages.reduce((sum, s) => sum + s.value, 0);
  const wonCount = wonStages.reduce((sum, s) => sum + s.count, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--mkt-text)", margin: "0 0 4px" }}>
          Funnel Dashboard
        </h2>
        <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", margin: 0 }}>
          Conversión completa: del Suscriptor al Cliente. Incluye la cola de re-engagement.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {[
          { label: "Contactos totales", value: data.totalContacts.toString(), color: "var(--mkt-text)" },
          { label: "Clientes", value: (data.lifecycleCounts.customer ?? 0).toString(), color: "#22c55e" },
          { label: "Deals ganados", value: wonCount.toString(), color: "#22c55e" },
          { label: "Valor ganado", value: formatCOP(wonValue), color: "var(--mkt-accent)" },
          { label: "Pipeline activo", value: formatCOP(totalPipelineValue), color: "var(--mkt-text)" },
          { label: "En re-engagement", value: data.returnedCount.toString(), color: "#a78bfa" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: 14, borderRadius: 10, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Lifecycle funnel bars */}
      <div style={{ padding: 18, borderRadius: 12, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mkt-text)", marginBottom: 14 }}>
          Lifecycle (Suscriptor → Evangelista)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stages.map((stageId, i) => {
            const count = data.lifecycleCounts[stageId];
            const widthPct = (count / maxLifecycle) * 100;
            const color = STAGE_COLORS[stageId];
            const nextConv = data.conversionRates[i];
            return (
              <div key={stageId}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                  <div style={{ width: 100, fontSize: 12, color: "var(--mkt-text)", fontWeight: 600 }}>{STAGE_LABELS[stageId]}</div>
                  <div style={{ flex: 1, height: 22, borderRadius: 6, background: "var(--mkt-bg)", overflow: "hidden", position: "relative" }}>
                    <div style={{ width: `${widthPct}%`, height: "100%", background: color, opacity: 0.85, transition: "width 0.4s" }} />
                    <span style={{ position: "absolute", left: 10, top: 0, lineHeight: "22px", fontSize: 11, fontWeight: 700, color: widthPct > 15 ? "#0a0a0a" : "var(--mkt-text)" }}>
                      {count}
                    </span>
                  </div>
                </div>
                {nextConv && i < stages.length - 1 && (
                  <div style={{ marginLeft: 110, display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "var(--mkt-text-muted)", paddingLeft: 8, paddingBottom: 3 }}>
                    <span style={{ width: 1, height: 10, background: "var(--mkt-border)" }} />
                    <span>↓ {nextConv.rate}% pasa a {STAGE_LABELS[nextConv.to]}</span>
                    {nextConv.dropoff > 0 && (
                      <span style={{ color: nextConv.dropoff > nextConv.rate ? "#f59e0b" : "var(--mkt-text-muted)" }}>
                        · {nextConv.dropoff} dropoff
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal stage funnel */}
      <div style={{ padding: 18, borderRadius: 12, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mkt-text)", marginBottom: 14 }}>
          Pipeline de Sales (por etapa)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(() => {
            const maxDealCount = Math.max(...data.dealStageBreakdown.map(s => s.count), 1);
            return data.dealStageBreakdown.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 140, fontSize: 12, color: "var(--mkt-text)", fontWeight: 600 }}>{s.name}</div>
                <div style={{ flex: 1, height: 18, borderRadius: 5, background: "var(--mkt-bg)", overflow: "hidden" }}>
                  <div style={{ width: `${(s.count / maxDealCount) * 100}%`, height: "100%", background: s.color, opacity: 0.85 }} />
                </div>
                <div style={{ width: 60, textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--mkt-text)" }}>{s.count}</div>
                <div style={{ width: 130, textAlign: "right", fontSize: 11, color: "var(--mkt-text-muted)" }}>{formatCOP(s.value)}</div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
