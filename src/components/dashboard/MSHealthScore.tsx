"use client";

import { useEffect, useState } from "react";

interface BreakdownItem {
  pts: number;
  max: number;
  rate?: number;
  count?: number;
}

interface MSHealthData {
  score: number;
  breakdown: {
    handoffAcceptance: BreakdownItem;
    returnRate: BreakdownItem;
    mqlToSql: BreakdownItem;
    staleLead: BreakdownItem;
    volume: BreakdownItem;
  };
  label: string;
}

export interface MSHealthProps {
  initialData?: MSHealthData | null;
}

const BREAKDOWN_LABELS: Record<string, string> = {
  handoffAcceptance: "Aceptación de handoffs",
  returnRate: "Tasa de retorno",
  mqlToSql: "MQL→SQL",
  staleLead: "Leads estancados",
  volume: "Volumen",
};

// Keys match the API response shape exactly
const BREAKDOWN_ORDER = ["handoffAcceptance", "returnRate", "mqlToSql", "staleLead", "volume"] as const;

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excelente", color: "#22c55e" };
  if (score >= 60) return { label: "Bueno", color: "#D19C15" };
  if (score >= 40) return { label: "Regular", color: "#f97316" };
  return { label: "Crítico", color: "#ef4444" };
}

function getBarColor(pts: number, max: number): string {
  const ratio = max > 0 ? pts / max : 0;
  if (ratio >= 0.8) return "#22c55e";
  if (ratio >= 0.5) return "#D19C15";
  return "#ef4444";
}

export function MSHealthScore({ initialData }: MSHealthProps) {
  const [data, setData] = useState<MSHealthData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    fetch("/api/ms-health")
      .then(r => r.json())
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialData]);

  const cardStyle: React.CSSProperties = {
    borderRadius: 12,
    padding: 20,
    border: "1px solid var(--border)",
    background: "var(--card)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="bs-skeleton" style={{ height: 14, width: 90 }} />
          <div className="bs-skeleton" style={{ height: 11, width: 150, marginTop: 4 }} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <div className="bs-skeleton" style={{ height: 52, width: 80, borderRadius: 8 }} />
          <div className="bs-skeleton" style={{ height: 20, width: 50 }} />
        </div>
        {BREAKDOWN_ORDER.map(key => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="bs-skeleton" style={{ height: 11, width: 140 }} />
            <div className="bs-skeleton" style={{ flex: 1, height: 5, borderRadius: 3 }} />
            <div className="bs-skeleton" style={{ height: 11, width: 36 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={cardStyle}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Salud M+S</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Actualizado en tiempo real</div>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sin datos disponibles</p>
      </div>
    );
  }

  const { score, breakdown, label } = data;
  const { label: statusLabel, color: statusColor } = getScoreLabel(score);

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>Salud M+S</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
            Actualizado en tiempo real
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
          background: `${statusColor}18`, color: statusColor, letterSpacing: "0.04em",
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Score display */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{
          fontSize: 54, fontWeight: 800, letterSpacing: "-0.04em",
          lineHeight: 1, color: statusColor,
        }}>
          {score}
        </span>
        <span style={{ fontSize: 18, fontWeight: 400, color: "var(--muted-foreground)", letterSpacing: "-0.02em" }}>
          /100
        </span>
      </div>

      {/* Label from API */}
      {label && label !== statusLabel && (
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: -10 }}>{label}</div>
      )}

      {/* Breakdown rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {BREAKDOWN_ORDER.map(key => {
          const item = breakdown[key];
          const fill = item.max > 0 ? (item.pts / item.max) * 100 : 0;
          const barColor = getBarColor(item.pts, item.max);
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 11, color: "var(--muted-foreground)",
                minWidth: 150, flexShrink: 0,
              }}>
                {BREAKDOWN_LABELS[key]}
              </span>
              <div style={{
                flex: 1, height: 5, borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${Math.min(100, fill)}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: barColor,
                  transition: "width 0.6s ease",
                }} />
              </div>
              <span style={{
                fontSize: 10, color: "var(--muted-foreground)",
                minWidth: 32, textAlign: "right", flexShrink: 0,
              }}>
                {item.pts}/{item.max}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
