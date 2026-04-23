"use client";

import React from "react";
import { useMkt } from "./mkt-provider";
import { mktFormatCOP } from "./mkt-utils";
import { MKT_SOURCES, MKT_SOURCE_LABELS } from "./mkt-types";

export function MktAttributionDashboard() {
  const { contacts } = useMkt();

  const sources = MKT_SOURCES.map(src => {
    const cs = contacts.filter(c => c.source === src);
    const total = cs.length;
    const hot = cs.filter(c => c.engagementStatus === "hot").length;
    const deals = cs.filter(c => c.passedToSalesAt).length;
    const engaged = cs.filter(c => c.engagementStatus === "hot" || c.engagementStatus === "warm").length;
    const pipelineValue = cs.reduce((sum, c) =>
      sum + (c.passedToSalesAt ? (c.tier === 1 ? 25000000 : c.tier === 2 ? 12000000 : 5000000) : 0), 0);
    const conversionRate = total > 0 ? Math.round((deals / total) * 100) : 0;
    return { src, label: MKT_SOURCE_LABELS[src], total, hot, deals, engaged, pipelineValue, conversionRate };
  }).filter(s => s.total > 0).sort((a, b) => b.conversionRate - a.conversionRate);

  const bestSrc = sources[0]?.src;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sources.map((s, i) => {
        const isBest = s.src === bestSrc;
        return (
          <div key={s.src} style={{
            padding: 18, borderRadius: 12, display: "flex", alignItems: "center", gap: 16,
            background: "var(--mkt-surface)",
            border: `1px solid ${isBest ? "var(--mkt-accent)" : "var(--mkt-border)"}`,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: isBest ? "var(--mkt-accent)" : "var(--mkt-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: isBest ? "#0a0a0a" : "var(--mkt-text-muted)", fontSize: 12, fontWeight: 700,
            }}>{i + 1}</div>

            <div style={{ width: 120, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--mkt-text)" }}>{s.label}</span>
                {isBest && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                    background: "var(--mkt-accent)", color: "#0a0a0a",
                  }}>MEJOR</span>
                )}
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
              {[
                { label: "Total", value: s.total, color: "var(--mkt-text-muted)" },
                { label: "Engaged", value: s.engaged, color: "#f59e0b" },
                { label: "Hot", value: s.hot, color: "#ef4444" },
                { label: "Deals", value: s.deals, color: "#22c55e" },
              ].map((step, j) => (
                <React.Fragment key={step.label}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: step.color }}>{step.value}</div>
                    <div style={{ fontSize: 9, color: "var(--mkt-text-muted)" }}>{step.label}</div>
                  </div>
                  {j < 3 && (
                    <svg width="16" height="10" viewBox="0 0 16 10" style={{ opacity: 0.2, flexShrink: 0 }}>
                      <path d="M1 5h14m-4-4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div style={{ textAlign: "right", width: 120 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-accent)" }}>
                {mktFormatCOP(s.pipelineValue)}
              </div>
              <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{s.conversionRate}% conversión</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
