"use client";

import React from "react";
import { formatCurrency } from "@/lib/constants";
import type { PipelineColumn } from "@/types";

interface Props {
  columns: PipelineColumn[];
}

export function PipelineMetricsBar({ columns }: Props) {
  const openDeals = columns.filter(c => !c.isWon && !c.isLost).flatMap(c => c.deals);
  const wonDeals  = columns.filter(c => c.isWon).flatMap(c => c.deals);
  const totalValue = openDeals.reduce((s, d) => s + d.value, 0);
  const weightedValue = openDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const avgDealSize = openDeals.length > 0 ? totalValue / openDeals.length : 0;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const wonThisMonth = wonDeals.filter(d => {
    const ts = d.updatedAt instanceof Date ? d.updatedAt.getTime() : new Date(d.updatedAt).getTime();
    return ts >= monthStart.getTime();
  });
  const wonThisMonthValue = wonThisMonth.reduce((s, d) => s + d.value, 0);

  const tiles: { label: string; value: string; sub?: string; color?: string }[] = [
    { label: "Pipeline abierto", value: formatCurrency(totalValue), sub: `${openDeals.length} deals` },
    { label: "Ponderado",        value: formatCurrency(weightedValue), sub: "× probabilidad", color: "var(--primary)" },
    { label: "Ticket promedio",  value: formatCurrency(Math.round(avgDealSize)) },
    { label: "Ganado este mes",  value: formatCurrency(wonThisMonthValue), sub: `${wonThisMonth.length} cerrados`, color: "#22c55e" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
      {tiles.map(t => (
        <div key={t.label} style={{
          padding: "10px 14px", borderRadius: 10, background: "var(--card)",
          border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 2,
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t.label}
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: t.color || "var(--foreground)" }}>{t.value}</span>
          {t.sub && <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{t.sub}</span>}
        </div>
      ))}
    </div>
  );
}
