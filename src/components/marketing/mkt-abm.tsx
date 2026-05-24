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
  tierA: number; tierB: number; tierC: number; tierD: number;
  topFitScore: number; avgFitScore: number;
  hot: number; warm: number; cold: number;
  avgEngagementScore: number;
  emailsSent: number; emailOpens: number; emailReplies: number;
  sigLinkedinAds: boolean; sigMetaAds: boolean; sigGoogleAds: boolean; sigVacancy: boolean;
  abmPriority: number;
  engagementLevel: "high" | "medium" | "low";
  hasPipeline: boolean;
  lifecycleStages: string[];
}

interface AbmData {
  accounts: AbmAccount[];
  totals: {
    accounts: number; withPipeline: number; totalPipeline: number;
    totalWon: number; highEngagement: number; tierAAccounts: number;
  };
}

const CARD: React.CSSProperties = {
  borderRadius: 10, padding: "14px 18px",
  background: "var(--mkt-card, var(--card))",
  border: "1px solid var(--mkt-border, var(--border))",
};
const TIER_COLORS: Record<string, string> = { A: "#16a34a", B: "#C39A4C", C: "#4299e1", D: "#64748b" };
const TEMP_COLORS = { hot: "#ef4444", warm: "#f97316", cold: "#64748b" };
const ENGAGEMENT_CFG = {
  high: { label: "Alta", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  medium: { label: "Media", color: "#D19C15", bg: "rgba(209,156,21,0.12)" },
  low: { label: "Baja", color: "#64748b", bg: "rgba(255,255,255,0.05)" },
};
const LIFECYCLE_LABELS: Record<string, string> = {
  subscriber: "Suscriptor", lead: "Lead", MQL: "MQL", SQL: "SQL",
  opportunity: "Oportunidad", customer: "Cliente", evangelist: "Evangelista",
};
const LIFECYCLE_COLORS: Record<string, string> = {
  subscriber: "#94a3b8", lead: "#60a5fa", MQL: "#a78bfa",
  SQL: "#f59e0b", opportunity: "#f97316", customer: "#22c55e", evangelist: "#ec4899",
};

function Pill({ n, color }: { n: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 20, background: `${color}22`, color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />{n}
    </span>
  );
}

function PriorityBar({ value }: { value: number }) {
  const color = value >= 70 ? "#22c55e" : value >= 40 ? "#C39A4C" : "#64748b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 6, borderRadius: 3, background: "var(--mkt-bg, #0a0a0a)", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function SignalDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span title={label} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: on ? "rgba(195,154,76,0.15)" : "rgba(255,255,255,0.05)", color: on ? "#C39A4C" : "#64748b", fontWeight: 600 }}>
      {label}
    </span>
  );
}

type FilterKey = "all" | "pipeline" | "engaged" | "tierA" | "signals";

export function MktAbm() {
  const [data, setData] = useState<AbmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/marketing/abm")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setData({ accounts: [], totals: { accounts: 0, withPipeline: 0, totalPipeline: 0, totalWon: 0, highEngagement: 0, tierAAccounts: 0 } }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <BSLoading label="Cargando cuentas ABM…" />;
  if (!data) return null;

  const accounts = data.accounts.filter(a => {
    if (filter === "pipeline") return a.hasPipeline;
    if (filter === "engaged") return a.engagementLevel !== "low";
    if (filter === "tierA") return a.tierA > 0;
    if (filter === "signals") return a.sigLinkedinAds || a.sigMetaAds || a.sigGoogleAds || a.sigVacancy;
    return true;
  });

  const th: React.CSSProperties = {
    padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted, #718096)",
    textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left",
    borderBottom: "1px solid var(--mkt-border, #1e1e1e)", whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "11px 14px", fontSize: 12, color: "var(--mkt-text, #e2e8f0)",
    borderBottom: "1px solid var(--mkt-border, #1e1e1e)", verticalAlign: "middle",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mkt-text, #e2e8f0)" }}>ABM — Cuentas Objetivo</div>
        <div style={{ width: 40, height: 3, background: "#C39A4C", borderRadius: 2, marginTop: 4 }} />
        <div style={{ fontSize: 12, color: "var(--mkt-text-muted, #718096)", marginTop: 6 }}>
          Priorización inteligente por Fit ICP, pipeline y señales de intención. Cada cuenta rankeada por ABM Priority.
        </div>
      </div>

      {/* Totals */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {[
          { label: "Cuentas totales", value: String(data.totals.accounts) },
          { label: "Tier A presentes", value: String(data.totals.tierAAccounts), accent: true },
          { label: "Con pipeline", value: String(data.totals.withPipeline) },
          { label: "Pipeline total", value: formatCurrency(data.totals.totalPipeline), accent: true },
          { label: "Ganado", value: formatCurrency(data.totals.totalWon) },
          { label: "Alta engagement", value: String(data.totals.highEngagement) },
        ].map(({ label, value, accent }) => (
          <div key={label} style={CARD}>
            <div style={{ fontSize: 18, fontWeight: 700, color: accent ? "#C39A4C" : "var(--mkt-text, #e2e8f0)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--mkt-text-muted, #718096)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {([
          ["all", "Todas"],
          ["tierA", "Tier A"],
          ["pipeline", "Con pipeline"],
          ["engaged", "Con engagement"],
          ["signals", "Con señales"],
        ] as [FilterKey, string][]).map(([k, label]) => (
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
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--mkt-text-muted, #718096)", alignSelf: "center" }}>
          {accounts.length} cuenta{accounts.length !== 1 ? "s" : ""}
        </span>
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
                  <th style={th}>ABM Priority</th>
                  <th style={th}>Fit Tiers</th>
                  <th style={th}>Temperatura</th>
                  <th style={th}>Pipeline</th>
                  <th style={th}>Señales</th>
                  <th style={th}>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a, i) => {
                  const cfg = ENGAGEMENT_CFG[a.engagementLevel];
                  const isLast = i === accounts.length - 1;
                  const isExpanded = expanded === a.company;
                  const cell = { ...td, borderBottom: (isLast && !isExpanded) ? "none" : td.borderBottom };
                  const openRate = a.emailsSent > 0 ? Math.round((a.emailOpens / a.emailsSent) * 100) : 0;
                  const replyRate = a.emailsSent > 0 ? Math.round((a.emailReplies / a.emailsSent) * 100) : 0;

                  return (
                    <React.Fragment key={a.company}>
                      <tr
                        style={{ cursor: "pointer", transition: "background 0.15s" }}
                        onClick={() => setExpanded(isExpanded ? null : a.company)}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}
                      >
                        <td style={{ ...cell, maxWidth: 220 }}>
                          <div style={{ fontWeight: 600, color: "var(--mkt-text, #e2e8f0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.company}</div>
                          {a.industry && <div style={{ fontSize: 11, color: "var(--mkt-text-muted, #718096)" }}>{a.industry}</div>}
                          <div style={{ fontSize: 10, color: "var(--mkt-text-muted, #718096)", marginTop: 2 }}>{a.stakeholders} contacto{a.stakeholders !== 1 ? "s" : ""}</div>
                        </td>
                        <td style={cell}>
                          <PriorityBar value={a.abmPriority} />
                        </td>
                        <td style={cell}>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            {a.tierA > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${TIER_COLORS.A}22`, color: TIER_COLORS.A }}>A:{a.tierA}</span>}
                            {a.tierB > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${TIER_COLORS.B}22`, color: TIER_COLORS.B }}>B:{a.tierB}</span>}
                            {a.tierC > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${TIER_COLORS.C}22`, color: TIER_COLORS.C }}>C:{a.tierC}</span>}
                            {a.tierD > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${TIER_COLORS.D}22`, color: TIER_COLORS.D }}>D:{a.tierD}</span>}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--mkt-text-muted, #718096)", marginTop: 3 }}>Top fit: {a.topFitScore}</div>
                        </td>
                        <td style={cell}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {a.hot > 0 && <Pill n={a.hot} color={TEMP_COLORS.hot} />}
                            {a.warm > 0 && <Pill n={a.warm} color={TEMP_COLORS.warm} />}
                            {a.cold > 0 && <Pill n={a.cold} color={TEMP_COLORS.cold} />}
                          </div>
                        </td>
                        <td style={{ ...cell, fontWeight: 700, color: a.pipelineValue > 0 ? "#C39A4C" : "var(--mkt-text-muted, #718096)" }}>
                          {a.pipelineValue > 0 ? formatCurrency(a.pipelineValue) : "—"}
                          {a.openDeals > 0 && <div style={{ fontSize: 10, fontWeight: 400, color: "var(--mkt-text-muted, #718096)" }}>{a.openDeals} deal{a.openDeals !== 1 ? "s" : ""}</div>}
                        </td>
                        <td style={cell}>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            <SignalDot on={a.sigLinkedinAds} label="LI Ads" />
                            <SignalDot on={a.sigMetaAds} label="Meta" />
                            <SignalDot on={a.sigGoogleAds} label="GAds" />
                            <SignalDot on={a.sigVacancy} label="Vacancy" />
                          </div>
                        </td>
                        <td style={cell}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          {a.lifecycleStages.length > 0 && (
                            <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                              {a.lifecycleStages.map(s => (
                                <span key={s} style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: `${LIFECYCLE_COLORS[s] ?? "#94a3b8"}22`, color: LIFECYCLE_COLORS[s] ?? "#94a3b8" }}>
                                  {LIFECYCLE_LABELS[s] ?? s}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: "14px 18px", background: "rgba(255,255,255,0.02)", borderBottom: isLast ? "none" : td.borderBottom }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mkt-text-muted, #718096)", textTransform: "uppercase", marginBottom: 6 }}>Email Performance</div>
                                <div style={{ fontSize: 12, color: "var(--mkt-text, #e2e8f0)" }}>Enviados: <b>{a.emailsSent}</b></div>
                                <div style={{ fontSize: 12, color: "var(--mkt-text, #e2e8f0)" }}>Aperturas: <b>{a.emailOpens}</b> ({openRate}%)</div>
                                <div style={{ fontSize: 12, color: "var(--mkt-text, #e2e8f0)" }}>Respuestas: <b>{a.emailReplies}</b> ({replyRate}%)</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mkt-text-muted, #718096)", textTransform: "uppercase", marginBottom: 6 }}>Fit ICP</div>
                                <div style={{ fontSize: 12, color: "var(--mkt-text, #e2e8f0)" }}>Top Score: <b style={{ color: "#C39A4C" }}>{a.topFitScore}</b></div>
                                <div style={{ fontSize: 12, color: "var(--mkt-text, #e2e8f0)" }}>Promedio: <b>{a.avgFitScore}</b></div>
                              </div>
                              {a.wonValue > 0 && (
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mkt-text-muted, #718096)", textTransform: "uppercase", marginBottom: 6 }}>Historial</div>
                                  <div style={{ fontSize: 12, color: "var(--mkt-text, #e2e8f0)" }}>Ganado: <b style={{ color: "#22c55e" }}>{formatCurrency(a.wonValue)}</b></div>
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mkt-text-muted, #718096)", textTransform: "uppercase", marginBottom: 6 }}>Acciones</div>
                                <button
                                  onClick={e => { e.stopPropagation(); window.location.assign(`/accounts/${encodeURIComponent(a.company)}`); }}
                                  style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer", background: "rgba(195,154,76,0.15)", border: "1px solid #C39A4C55", color: "#C39A4C" }}>
                                  Ver cuenta →
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "8px 14px", fontSize: 10, color: "var(--mkt-text-muted, #718096)", borderTop: "1px solid var(--mkt-border, #1e1e1e)" }}>
            ABM Priority = Tier A (40%) + Pipeline (30%) + Engagement (20%) + Fit score (10%) · Clic en una cuenta para ver detalles
          </div>
        </div>
      )}
    </div>
  );
}
