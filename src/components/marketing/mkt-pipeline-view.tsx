"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/constants";

interface Deal {
  id: string;
  title: string;
  value: number;
  probability: number;
  expectedClose: number | null;
  contactName: string | null;
  contactTemperature: string | null;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  isWon: boolean;
  isLost: boolean;
  deals: Deal[];
}

const TEMP_COLOR: Record<string, string> = {
  hot: "#22c55e",
  warm: "#f59e0b",
  cold: "#60a5fa",
};

const TEMP_LABEL: Record<string, string> = {
  hot: "Caliente",
  warm: "Tibio",
  cold: "Frío",
};

function DealCard({ deal }: { deal: Deal }) {
  const tempColor = TEMP_COLOR[deal.contactTemperature ?? ""] ?? "var(--mkt-text-muted)";
  const tempLabel = TEMP_LABEL[deal.contactTemperature ?? ""] ?? "—";
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 8, marginBottom: 8,
      background: "var(--mkt-bg)", border: "1px solid var(--mkt-border)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 4, lineHeight: 1.3 }}>
        {deal.title}
      </div>
      {deal.contactName && (
        <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 6 }}>
          {deal.contactName}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mkt-accent)" }}>
          {formatCurrency(deal.value)}
        </span>
        <span style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>
          {deal.probability}%
        </span>
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: tempColor, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: tempColor }}>{tempLabel}</span>
      </div>
    </div>
  );
}

function StageColumn({ stage, dim }: { stage: Stage; dim: boolean }) {
  const total = stage.deals.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{
      width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
      opacity: dim ? 0.45 : 1,
    }}>
      <div style={{
        padding: "10px 14px", borderRadius: "8px 8px 0 0",
        background: "var(--mkt-surface)", borderBottom: `2px solid ${stage.color}`,
        border: "1px solid var(--mkt-border)", borderBottomColor: stage.color,
        marginBottom: 2,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mkt-text)" }}>{stage.name}</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
          <span style={{ color: "var(--mkt-text-muted)" }}>{stage.deals.length} deal{stage.deals.length !== 1 ? "s" : ""}</span>
          <span style={{ color: "var(--mkt-accent)", fontWeight: 600 }}>{formatCurrency(total)}</span>
        </div>
      </div>
      <div style={{
        flex: 1, padding: "10px 8px", background: "rgba(255,255,255,0.01)",
        border: "1px solid var(--mkt-border)", borderTop: "none", borderRadius: "0 0 8px 8px",
        minHeight: 80,
      }}>
        {stage.deals.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", textAlign: "center", paddingTop: 16 }}>
            Sin deals
          </div>
        ) : (
          stage.deals.map(d => <DealCard key={d.id} deal={d} />)
        )}
      </div>
    </div>
  );
}

export function MktPipelineView() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/pipeline")
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) { setError("Respuesta inesperada"); return; }
        setStages(data);
      })
      .catch(() => setError("Error al cargar el pipeline"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>Cargando pipeline…</div>;
  if (error) return <div style={{ fontSize: 13, color: "#ef4444" }}>{error}</div>;

  const activeStages = stages.filter(s => !s.isWon && !s.isLost);
  const closedStages = stages.filter(s => s.isWon || s.isLost);
  const allDeals = stages.flatMap(s => s.deals);
  const totalValue = activeStages.flatMap(s => s.deals).reduce((s, d) => s + d.value, 0);
  const weightedValue = activeStages.flatMap(s => s.deals).reduce((s, d) => s + d.value * (d.probability / 100), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "Etapas activas", value: activeStages.length },
          { label: "Total deals", value: allDeals.length },
          { label: "Valor pipeline", value: formatCurrency(totalValue) },
          { label: "Valor ponderado", value: formatCurrency(Math.round(weightedValue)) },
        ].map(kpi => (
          <div key={kpi.label} style={{
            padding: "10px 16px", borderRadius: 8, background: "var(--mkt-surface)",
            border: "1px solid var(--mkt-border)", minWidth: 130,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--mkt-text)" }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Columns */}
      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        <div style={{ display: "flex", gap: 12, minWidth: "max-content", alignItems: "flex-start" }}>
          {activeStages.map(s => <StageColumn key={s.id} stage={s} dim={false} />)}
          {closedStages.map(s => <StageColumn key={s.id} stage={s} dim={true} />)}
        </div>
      </div>
    </div>
  );
}
