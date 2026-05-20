"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/constants";
import { BSLoading } from "../ui/BSLoading";

interface AbmAccount {
  company: string;
  industry: string | null;
  stakeholders: number;
  pipelineValue: number;
  wonValue: number;
  openDeals: number;
  lastActivityAt: number | null;
  mktContacts: number;
  hot: number;
  warm: number;
  cold: number;
  avgEngagementScore: number;
  engagementLevel: "high" | "medium" | "low";
  hasPipeline: boolean;
}

interface AbmData {
  accounts: AbmAccount[];
  totals: { accounts: number; withPipeline: number; totalPipeline: number; totalWon: number; highEngagement: number };
}

const CARD: React.CSSProperties = {
  borderRadius: 10, padding: "14px 18px",
  background: "var(--mkt-card, var(--card))",
  border: "1px solid var(--mkt-border, var(--border))",
};

const ENGAGEMENT_CFG = {
  high: { label: "Alta", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  medium: { label: "Media", color: "#D19C15", bg: "rgba(209,156,21,0.12)" },
  low: { label: "Baja", color: "var(--mkt-text-muted, #718096)", bg: "rgba(255,255,255,0.05)" },
};

export function MktAbm() {
  const [data, setData] = useState<AbmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pipeline" | "engaged">("all");

  useEffect(() => {
    fetch("/api/marketing/abm")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setData({ accounts: [], totals: { accounts: 0, withPipeline: 0, totalPipeline: 0, totalWon: 0, highEngagement: 0 } }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BSLoading label="Cargando cuentas…" />;
  if (!data) return null;

  const accounts = data.accounts.filter(a => {
    if (filter === "pipeline") return a.hasPipeline;
    if (filter === "engaged") return a.engagementLevel !== "low";
    return true;
  });

  const th: React.CSSProperties = {
    padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted, #718096)",
    textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left",
    borderBottom: "1px solid var(--mkt-border, #1e1e1e)", whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "12px 14px", fontSize: 12, color: "var(--mkt-text, #e2e8f0)",
    borderBottom: "1px solid var(--mkt-border, #1e1e1e)", verticalAlign: "middle",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mkt-text, #e2e8f0)" }}>ABM — Cuentas Objetivo</div>
        <div style={{ width: 40, height: 3, background: "#C39A4C", borderRadius: 2, marginTop: 4 }} />
        <div style={{ fontSize: 12, color: "var(--mkt-text-muted, #718096)", marginTop: 6 }}>
          Marketing basado en cuentas — pipeline de ventas y engagement de marketing por empresa.
        </div>
      </div>

      {/* Totals */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {[
          { label: "CUENTAS", value: String(data.totals.accounts) },
          { label: "CON PIPELINE", value: String(data.totals.withPipeline) },
          { label: "PIPELINE TOTAL", value: formatCurrency(data.totals.totalPipeline), accent: true },
          { label: "GANADO", value: formatCurrency(data.totals.totalWon) },
          { label: "ALTA ENGAGEMENT", value: String(data.totals.highEngagement) },
        ].map(({ label, value, accent }) => (
          <div key={label} style={CARD}>
            <div style={{ fontSize: 18, fontWeight: 700, color: accent ? "#C39A4C" : "var(--mkt-text, #e2e8f0)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--mkt-text-muted, #718096)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8 }}>
        {([["all", "Todas"], ["pipeline", "Con pipeline"], ["engaged", "Con engagement"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${filter === k ? "#C39A4C" : "var(--mkt-border, #1e1e1e)"}`,
              background: filter === k ? "rgba(195,154,76,0.12)" : "transparent",
              color: filter === k ? "#C39A4C" : "var(--mkt-text-muted, #718096)",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {accounts.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", padding: "40px 0", color: "var(--mkt-text-muted, #718096)", fontSize: 13 }}>
          Sin cuentas para este filtro.
        </div>
      ) : (
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Cuenta</th>
                  <th style={th}>Stakeholders</th>
                  <th style={th}>Pipeline</th>
                  <th style={th}>Deals abiertos</th>
                  <th style={th}>Engagement Mkt</th>
                  <th style={th}>Nivel</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a, i) => {
                  const cfg = ENGAGEMENT_CFG[a.engagementLevel];
                  const isLast = i === accounts.length - 1;
                  const cell = { ...td, borderBottom: isLast ? "none" : td.borderBottom };
                  return (
                    <tr
                      key={a.company}
                      style={{ cursor: "pointer" }}
                      onClick={() => window.location.assign(`/accounts/${encodeURIComponent(a.company)}`)}
                    >
                      <td style={{ ...cell, maxWidth: 240 }}>
                        <div style={{ fontWeight: 600, color: "var(--mkt-text, #e2e8f0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.company}</div>
                        {a.industry && <div style={{ fontSize: 11, color: "var(--mkt-text-muted, #718096)" }}>{a.industry}</div>}
                      </td>
                      <td style={cell}>{a.stakeholders}</td>
                      <td style={{ ...cell, fontWeight: 700, color: a.pipelineValue > 0 ? "#C39A4C" : "var(--mkt-text-muted, #718096)" }}>
                        {a.pipelineValue > 0 ? formatCurrency(a.pipelineValue) : "—"}
                      </td>
                      <td style={cell}>{a.openDeals || "—"}</td>
                      <td style={cell}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {a.hot > 0 && <Pill n={a.hot} color="#ef4444" />}
                          {a.warm > 0 && <Pill n={a.warm} color="#D19C15" />}
                          {a.cold > 0 && <Pill n={a.cold} color="#64748b" />}
                          {a.mktContacts === 0 && <span style={{ fontSize: 11, color: "var(--mkt-text-muted, #718096)" }}>—</span>}
                        </div>
                      </td>
                      <td style={cell}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "8px 14px", fontSize: 10, color: "var(--mkt-text-muted, #718096)", borderTop: "1px solid var(--mkt-border, #1e1e1e)" }}>
            <span style={{ color: "#ef4444" }}>●</span> hot · <span style={{ color: "#D19C15" }}>●</span> warm · <span style={{ color: "#64748b" }}>●</span> cold · clic en una cuenta para ver el detalle
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ n, color }: { n: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 20, background: `${color}22`, color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />{n}
    </span>
  );
}
