"use client";

import React, { useEffect, useState, useCallback } from "react";
import { BSLoading } from "../ui/BSLoading";
import type { MktSection } from "./mkt-types";

type Stage = "awareness" | "consideration" | "conversion";
type PlatformId = "linkedin" | "meta" | "google_ads";

interface PlatformRow {
  id: PlatformId; label: string; stage: Stage; stageLabel: string; badge: string;
  activeCampaigns: number; connected: boolean;
  headline: { key: "impressions" | "followers" | "leads"; value: number | null; goal: number; pctToGoal: number | null };
  metrics: { cpmCents: number | null; frequency: number | null; engagementRate: number | null; ctr: number | null; impressions: number | null; followers: number | null; reach: number | null };
  leads: number; conversions: number; revenueCents: number; cplCents: number | null;
}
interface GateCriterion { label: string; current: string; target: string; met: boolean }
interface StageGate { platform: PlatformId; label: string; fromLabel: string; toLabel: string; criteria: GateCriterion[]; pending: number; total: number }
interface FunnelData {
  periodDays: number; lastSyncAt: number | null; anyConnected: boolean; activePlatforms: number;
  platforms: PlatformRow[];
  stageSummary: Record<Stage, string[]>;
  gaps: { stage: Stage; severity: string; title: string; message: string }[];
  stageGates: StageGate[];
}

const STAGES: { id: Stage; tag: string; title: string; desc: string; color: string }[] = [
  { id: "awareness", tag: "TOFU", title: "Awareness", desc: "Maximizar alcance e impresiones. KPI: CPM, impresiones, frecuencia.", color: "#3b82f6" },
  { id: "consideration", tag: "MOFU", title: "Consideration", desc: "Generar engagement y leads. KPI: CTR, leads, CPL.", color: "#a78bfa" },
  { id: "conversion", tag: "BOFU", title: "Conversion", desc: "Cerrar y atribuir revenue. KPI: conversiones, CAC, ROAS.", color: "#22c55e" },
];
const STAGE_COLOR: Record<Stage, string> = { awareness: "#3b82f6", consideration: "#a78bfa", conversion: "#22c55e" };
const PLATFORM_COLOR: Record<PlatformId, string> = { linkedin: "#0a66c2", meta: "#1877f2", google_ads: "#ea4335" };

function fmt(n: number): string { return n.toLocaleString("es-CO"); }
function fmtCOP(cents: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.round(cents / 100));
}
function relTime(ts: number | null): string {
  if (!ts) return "sin sincronizar";
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "hace segundos";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`;
}

function ActionBtn({ children, primary, onClick }: { children: React.ReactNode; primary?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9,
      fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
      background: primary ? "var(--mkt-accent)" : "var(--mkt-surface)",
      color: primary ? "#0a0a0a" : "var(--mkt-text-muted)",
      border: `1px solid ${primary ? "var(--mkt-accent)" : "var(--mkt-border)"}`,
    }}>{children}</button>
  );
}

// Compact platform card shown inside a funnel-stage column.
function StageCard({ p }: { p: PlatformRow }) {
  const color = PLATFORM_COLOR[p.id];
  const headlineVal = p.headline.value;
  const unit = p.headline.key === "impressions" ? "impresiones" : p.headline.key === "followers" ? "seguidores" : "leads";
  return (
    <div style={{ padding: 14, borderRadius: 12, background: "var(--mkt-surface)", border: `1px solid ${color}55` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: color }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mkt-text)" }}>{p.label}</span>
        <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: `${color}22`, color }}>{p.badge}</span>
      </div>
      {headlineVal != null ? (
        <>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--mkt-text)", lineHeight: 1.1 }}>
            {p.headline.key === "followers" && headlineVal > 0 ? "+" : ""}{fmt(headlineVal)}
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--mkt-text-muted)", marginLeft: 6 }}>{unit}</span>
          </div>
          {p.headline.pctToGoal != null && (
            <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 4 }}>
              Meta: {fmt(p.headline.goal)} · <span style={{ color: p.headline.pctToGoal >= 100 ? "#22c55e" : "var(--mkt-accent)", fontWeight: 600 }}>{p.headline.pctToGoal}%</span>
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: "var(--mkt-text-muted)", lineHeight: 1.4 }}>
          {p.activeCampaigns} campaña{p.activeCampaigns === 1 ? "" : "s"} · conecta {p.label} para ver {unit}
        </div>
      )}
    </div>
  );
}

export function MktFunnelPlatforms({ onNavigate }: { onNavigate?: (s: MktSection) => void }) {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | PlatformId>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/funnel-platforms");
      const d = await res.json();
      if (!d.error) setData(d);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <BSLoading label="Cargando funnel por plataforma…" />;
  if (!data) return <div style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>Sin datos.</div>;

  const goConnect = () => onNavigate?.("integrations");
  const platformsByStage = (s: Stage) => data.platforms.filter(p => p.stage === s);
  const visible = tab === "all" ? data.platforms : data.platforms.filter(p => p.id === tab);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--mkt-text)", margin: 0 }}>Funnel por Plataforma</h2>
            <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.05)", color: "var(--mkt-text-muted)" }}>
              {data.activePlatforms} plataforma{data.activePlatforms === 1 ? "" : "s"} activa{data.activePlatforms === 1 ? "" : "s"}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", margin: "4px 0 0" }}>
            Mapa en vivo de qué etapa del embudo está corriendo cada canal pagado y orgánico
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionBtn>Últimos {data.periodDays} días</ActionBtn>
          <ActionBtn onClick={() => onNavigate?.("export")}>Exportar</ActionBtn>
          <ActionBtn primary onClick={() => onNavigate?.("campaigns")}>+ Nueva campaña</ActionBtn>
        </div>
      </div>

      {/* Tab strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setTab("all")} style={{
          display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, cursor: "pointer",
          fontSize: 12.5, fontWeight: 600, border: `1px solid ${tab === "all" ? "var(--mkt-accent)" : "var(--mkt-border)"}`,
          background: tab === "all" ? "var(--mkt-nav-active-bg)" : "var(--mkt-surface)",
          color: tab === "all" ? "var(--mkt-accent)" : "var(--mkt-text-muted)",
        }}>▦ Vista General</button>
        {data.platforms.map(p => (
          <button key={p.id} onClick={() => setTab(p.id)} style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, cursor: "pointer",
            fontSize: 12.5, fontWeight: 500, border: `1px solid ${tab === p.id ? PLATFORM_COLOR[p.id] : "var(--mkt-border)"}`,
            background: tab === p.id ? `${PLATFORM_COLOR[p.id]}18` : "var(--mkt-surface)",
            color: tab === p.id ? PLATFORM_COLOR[p.id] : "var(--mkt-text-muted)",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: PLATFORM_COLOR[p.id] }} />
            {p.label}
            <span style={{ fontSize: 10, color: STAGE_COLOR[p.stage], fontWeight: 600 }}>{p.stageLabel}</span>
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--mkt-text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: data.lastSyncAt ? "#22c55e" : "var(--mkt-text-muted)" }} />
          Última sync: {relTime(data.lastSyncAt)}
        </span>
      </div>

      {/* Gap detection banner */}
      {tab === "all" && data.gaps.map((g, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 14, padding: 18, borderRadius: 12,
          background: "rgba(209,156,21,0.05)", border: "1px solid rgba(209,156,21,0.3)",
        }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: "rgba(209,156,21,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mkt-accent)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text)" }}>{g.title}</span>
              <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "var(--mkt-text-muted)" }}>Detección automática</span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--mkt-text-muted)", margin: 0, lineHeight: 1.55 }}>{g.message}</p>
          </div>
          <ActionBtn primary onClick={() => onNavigate?.("campaigns")}>Crear campaña</ActionBtn>
        </div>
      ))}

      {/* Mapa del Funnel */}
      {tab === "all" && (
        <div style={{ padding: 20, borderRadius: 14, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text)" }}>Mapa del Funnel</div>
              <div style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginTop: 2 }}>Cada plataforma posicionada en la etapa donde está operando hoy</div>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {STAGES.map(s => (
                <span key={s.id} style={{ fontSize: 11, color: "var(--mkt-text-muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 4, background: s.color }} />{s.title}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {STAGES.map(stage => {
              const ps = platformsByStage(stage.id);
              return (
                <div key={stage.id} style={{ borderRadius: 12, padding: 14, background: `linear-gradient(180deg, ${stage.color}0d, transparent)`, border: `1px solid ${stage.color}22`, minHeight: 220, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: stage.color, letterSpacing: "0.05em" }}>{stage.title.toUpperCase()} · {stage.tag}</div>
                    <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 4, lineHeight: 1.4 }}>{stage.desc}</div>
                  </div>
                  {ps.length > 0 ? ps.map(p => <StageCard key={p.id} p={p} />) : (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 10, border: "1px dashed var(--mkt-border)", textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text-muted)" }}>Etapa vacía</div>
                      <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", lineHeight: 1.4 }}>No tienes campañas activas en esta etapa. Riesgo de perder leads.</div>
                      <button onClick={() => onNavigate?.("campaigns")} style={{ background: "none", border: "none", color: "var(--mkt-accent)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>+ Crear campaña</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stage tallies */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 14 }}>
            {STAGES.map(stage => {
              const names = data.stageSummary[stage.id];
              const empty = names.length === 0;
              return (
                <div key={stage.id} style={{ padding: 14, borderRadius: 10, background: "var(--mkt-bg)", border: "1px solid var(--mkt-border)", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 6 }}>Plataformas en {stage.title.toLowerCase()}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: empty ? "#ef4444" : "var(--mkt-text)" }}>{names.length}</div>
                  <div style={{ fontSize: 11, color: empty ? "#ef4444" : "var(--mkt-text-muted)", marginTop: 4 }}>{empty ? "⚠ Hueco crítico" : names.join(", ")}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Health por Plataforma */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text)" }}>Health por Plataforma</div>
          {!data.anyConnected && (
            <button onClick={goConnect} style={{ background: "none", border: "none", color: "var(--mkt-accent)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>Conecta tus plataformas →</button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(visible.length, 3)}, 1fr)`, gap: 14 }}>
          {visible.map(p => {
            const color = PLATFORM_COLOR[p.id];
            const hv = p.headline.value;
            const unit = p.headline.key === "impressions" ? "IMPRESIONES" : p.headline.key === "followers" ? "SEGUIDORES" : "LEADS";
            const pct = p.headline.pctToGoal;
            return (
              <div key={p.id} style={{ padding: 18, borderRadius: 12, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: `${color}22`, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{p.label[0]}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mkt-text)" }}>{p.label}</div>
                    <div style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{p.activeCampaigns} campaña{p.activeCampaigns === 1 ? "" : "s"} activa{p.activeCampaigns === 1 ? "" : "s"}</div>
                  </div>
                  <span style={{ marginLeft: "auto", padding: "3px 9px", borderRadius: 9, fontSize: 10, fontWeight: 600, background: `${STAGE_COLOR[p.stage]}1f`, color: STAGE_COLOR[p.stage] }}>{p.stageLabel}</span>
                </div>

                {hv != null ? (
                  <>
                    <div style={{ fontSize: 30, fontWeight: 800, color: "var(--mkt-text)", lineHeight: 1 }}>{p.headline.key === "followers" && hv > 0 ? "+" : ""}{fmt(hv)}</div>
                    <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", letterSpacing: "0.05em", marginTop: 4 }}>{unit} · {data.periodDays}D</div>
                    {pct != null && (
                      <>
                        <div style={{ height: 6, borderRadius: 3, background: "var(--mkt-bg)", overflow: "hidden", margin: "12px 0 5px" }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--mkt-text-muted)" }}>
                          <span>Meta: {fmt(p.headline.goal)} {p.headline.key === "leads" ? "leads" : ""}</span>
                          <span style={{ color: pct >= 100 ? "#22c55e" : "var(--mkt-accent)", fontWeight: 700 }}>{pct}% al {p.headline.key === "leads" ? "goal" : "gate"}</span>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{ padding: "14px 0" }}>
                    <button onClick={goConnect} style={{ width: "100%", padding: "10px", borderRadius: 9, border: `1px dashed ${color}66`, background: `${color}0d`, color, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Conecta {p.label} para ver {p.headline.key === "impressions" ? "impresiones" : "seguidores"} →
                    </button>
                  </div>
                )}

                {/* Secondary metrics — real where we have them, else connect-prompt */}
                <div style={{ display: "flex", gap: 20, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--mkt-border)" }}>
                  {p.headline.key === "leads" ? (
                    <>
                      <Metric label="Conversiones" value={`${fmt(p.conversions)}`} />
                      <Metric label="Revenue" value={p.revenueCents > 0 ? fmtCOP(p.revenueCents) : "—"} />
                    </>
                  ) : (
                    <>
                      <Metric label="CPM" value={p.metrics.cpmCents != null ? fmtCOP(p.metrics.cpmCents) : "—"} muted={p.metrics.cpmCents == null} />
                      <Metric label="Leads atribuidos" value={fmt(p.leads)} />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Gates */}
      {tab === "all" && data.stageGates.length > 0 && (
        <div style={{ background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--mkt-border)" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text)" }}>Stage Gates — Criterios para avanzar al siguiente nivel</div>
              <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 2 }}>Reglas claras de cuándo &quot;graduar&quot; una campaña a la siguiente etapa del funnel</div>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "var(--mkt-text-muted)" }}>
                  {["Plataforma", "Etapa actual → siguiente", "Criterio 1", "Criterio 2", "Criterio 3", "Acción"].map((h, i) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: i >= 2 && i <= 4 ? "center" : "left", fontWeight: 600, borderBottom: "1px solid var(--mkt-border)", whiteSpace: "nowrap", fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.stageGates.map(g => (
                  <tr key={g.platform} style={{ borderBottom: "1px solid var(--mkt-border)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--mkt-text)", fontWeight: 600 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 7, height: 7, borderRadius: 4, background: PLATFORM_COLOR[g.platform] }} />{g.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                        <span style={{ padding: "2px 8px", borderRadius: 7, background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontWeight: 600 }}>{g.fromLabel}</span>
                        →
                        <span style={{ padding: "2px 8px", borderRadius: 7, background: "rgba(167,139,250,0.15)", color: "#a78bfa", fontWeight: 600 }}>{g.toLabel}</span>
                      </span>
                    </td>
                    {g.criteria.map((c, i) => (
                      <td key={i} style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: c.met ? "#22c55e" : "var(--mkt-text)", fontWeight: 600 }}>
                          {c.met ? "✓ " : ""}{c.current} <span style={{ color: "var(--mkt-text-muted)", fontWeight: 400 }}>/ {c.target}</span>
                        </div>
                        <div style={{ fontSize: 9.5, color: "var(--mkt-text-muted)", marginTop: 2 }}>{c.label}</div>
                      </td>
                    ))}
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: g.pending === 0 ? "#22c55e" : "var(--mkt-accent)" }}>
                        {g.pending === 0 ? "✓ Listo para graduar" : `${g.pending}/${g.total} pendientes`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", textAlign: "right", lineHeight: 1.5 }}>
        Leads, conversiones y revenue son datos reales de tu pipeline. Las métricas de pauta (impresiones, CPM, seguidores, frecuencia, CTR) se llenan al conectar Meta / LinkedIn / Google Ads en <button onClick={goConnect} style={{ background: "none", border: "none", color: "var(--mkt-accent)", cursor: "pointer", fontSize: 10, padding: 0 }}>Integraciones</button>.
      </div>
    </div>
  );
}

function Metric({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: "var(--mkt-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: muted ? "var(--mkt-text-muted)" : "var(--mkt-text)", marginTop: 3 }}>{value}</div>
    </div>
  );
}
