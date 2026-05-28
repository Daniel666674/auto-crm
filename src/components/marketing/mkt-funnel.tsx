"use client";

import React, { useEffect, useState, useCallback } from "react";
import { BSLoading } from "../ui/BSLoading";

const PLATFORMS = ["all", "meta", "google", "linkedin", "brevo", "organic", "otro"] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  all: "Total",
  meta: "Meta",
  google: "Google",
  linkedin: "LinkedIn",
  brevo: "Email (Brevo)",
  organic: "Organic",
  otro: "Otro",
};

const PLATFORM_COLORS: Record<Platform, string> = {
  all: "#C39A4C",
  meta: "#1877f2",
  google: "#ea4335",
  linkedin: "#0a66c2",
  brevo: "#00BFA5",
  organic: "#22c55e",
  otro: "#94a3b8",
};

const PLATFORM_HINTS: Record<Exclude<Platform, "all">, string> = {
  meta: "Etiqueta los contactos con source=meta/facebook/instagram o usa utm_source=facebook en el link de tus anuncios.",
  google: "Etiqueta los contactos con source=google/google_ads o usa utm_source=google en tus anuncios.",
  linkedin: "Etiqueta los contactos con source=linkedin o usa utm_source=linkedin en tus campañas.",
  brevo: "Los contactos sincronizados desde Brevo se etiquetan automáticamente con el tag 'brevo'.",
  organic: "Contactos con source=website/organic/seo sin parámetros utm_source.",
  otro: "Contactos sin atribución clara a ninguna de las plataformas anteriores.",
};

interface FunnelData {
  platform: Platform;
  platformCounts: Record<Exclude<Platform, "all">, number>;
  lifecycleCounts: Record<string, number>;
  conversionRates: { from: string; to: string; rate: number; dropoff: number }[];
  dealStageBreakdown: {
    id: string; name: string; order: number; color: string;
    isWon: boolean; isLost: boolean; count: number; value: number;
  }[];
  returnedCount: number;
  totalContacts: number;
  tierCounts: { A: number; B: number; C: number; D: number };
  tempCounts: { hot: number; warm: number; cold: number };
  sourceCounts: Record<string, number>;
  emailPerf: { sent: number; opens: number; clicks: number; replies: number; openRate: number; clickRate: number; replyRate: number };
  mqlCount: number;
  sqlCount: number;
  mqlToSqlRate: number;
  winRate: number;
  wonCount: number;
  lostCount: number;
}

const STAGE_LABELS: Record<string, string> = {
  subscriber: "Suscriptor", lead: "Lead", MQL: "MQL", SQL: "SQL",
  opportunity: "Oportunidad", customer: "Cliente", evangelist: "Evangelista",
};
const STAGE_COLORS: Record<string, string> = {
  subscriber: "#94a3b8", lead: "#60a5fa", MQL: "#a78bfa",
  SQL: "#f59e0b", opportunity: "#f97316", customer: "#22c55e", evangelist: "#ec4899",
};
const TIER_COLORS: Record<string, string> = { A: "#16a34a", B: "#C39A4C", C: "#4299e1", D: "#64748b" };
const TEMP_COLORS: Record<string, string> = { hot: "#ef4444", warm: "#f97316", cold: "#60a5fa" };
const TEMP_LABELS: Record<string, string> = { hot: "Caliente", warm: "Tibio", cold: "Frío" };

function formatCOP(cents: number): string {
  const cop = Math.round(cents / 100);
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(cop);
}

function KpiCard({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? "var(--mkt-text)" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 18, borderRadius: 12, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mkt-text)", marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function RateBar({ label, rate, color, note }: { label: string; rate: number; color: string; note?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--mkt-text)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{rate}%{note ? <span style={{ fontWeight: 400, color: "var(--mkt-text-muted)", marginLeft: 4 }}>{note}</span> : null}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "var(--mkt-bg)", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(rate, 100)}%`, height: "100%", background: color, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

export function MktFunnel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<Platform>("all");

  const load = useCallback(async (p: Platform) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/funnel?platform=${p}`);
      const d = await res.json();
      if (!d.error) setData(d);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(platform); }, [load, platform]);

  if (loading && !data) {
    return <BSLoading label="Cargando funnel…" />;
  }

  if (!data) {
    return <div style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>Sin datos.</div>;
  }

  const maxLifecycle = Math.max(...Object.values(data.lifecycleCounts), 1);
  const stages = Object.keys(STAGE_LABELS).filter(s => data.lifecycleCounts[s] !== undefined);

  const totalPipelineValue = data.dealStageBreakdown.filter(s => !s.isLost).reduce((sum, s) => sum + s.value, 0);
  const wonStages = data.dealStageBreakdown.filter(s => s.isWon);
  const wonValue = wonStages.reduce((sum, s) => sum + s.value, 0);
  const wonCount = wonStages.reduce((sum, s) => sum + s.count, 0);

  const totalTier = Object.values(data.tierCounts).reduce((a, b) => a + b, 0) || 1;
  const totalTemp = Object.values(data.tempCounts).reduce((a, b) => a + b, 0) || 1;

  const sortedSources = Object.entries(data.sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxSource = Math.max(...sortedSources.map(([, v]) => v), 1);

  const accent = PLATFORM_COLORS[platform];
  const platformIsEmpty = platform !== "all" && data.totalContacts === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--mkt-text)", margin: "0 0 4px" }}>
          Funnel de Alto Rendimiento
        </h2>
        <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", margin: 0 }}>
          Vista completa: calidad del pipeline, engagement, email y conversión hasta cierre.
        </p>
      </div>

      {/* Platform chip strip */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {PLATFORMS.map(p => {
          const isActive = p === platform;
          const count = p === "all"
            ? Object.values(data.platformCounts).reduce((a, b) => a + b, 0)
            : data.platformCounts[p];
          const color = PLATFORM_COLORS[p];
          return (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: isActive ? `${color}22` : "var(--mkt-surface)",
                border: `1px solid ${isActive ? color : "var(--mkt-border)"}`,
                color: isActive ? color : "var(--mkt-text-muted)",
                transition: "all 0.12s",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
              {PLATFORM_LABELS[p]}
              <span style={{
                padding: "1px 6px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                background: isActive ? color : "var(--mkt-bg)",
                color: isActive ? "#0a0a0a" : "var(--mkt-text-muted)",
                marginLeft: 2,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {platformIsEmpty && (
        <div style={{
          padding: 16, borderRadius: 10,
          background: `${accent}11`,
          border: `1px solid ${accent}33`,
          fontSize: 13, color: "var(--mkt-text)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: accent }}>
            Sin contactos atribuidos a {PLATFORM_LABELS[platform]}
          </div>
          <div style={{ fontSize: 12, color: "var(--mkt-text-muted)", lineHeight: 1.5 }}>
            {PLATFORM_HINTS[platform as Exclude<Platform, "all">]}
          </div>
        </div>
      )}

      {/* Top-level KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        <KpiCard label="Contactos totales" value={data.totalContacts.toString()} />
        <KpiCard label="MQLs calificados" value={data.mqlCount.toString()} color="#a78bfa" sub="fitScore ≥ 60" />
        <KpiCard label="SQLs listos" value={data.sqlCount.toString()} color="#f59e0b" sub="MQL + intención" />
        <KpiCard label="MQL → SQL" value={`${data.mqlToSqlRate}%`} color={data.mqlToSqlRate >= 30 ? "#22c55e" : "#f59e0b"} />
        <KpiCard label="Win rate" value={`${data.winRate}%`} color={data.winRate >= 40 ? "#22c55e" : data.winRate >= 20 ? "#f97316" : "#ef4444"} sub={`${data.wonCount}G / ${data.lostCount}P`} />
        <KpiCard label="Clientes" value={(data.lifecycleCounts.customer ?? 0).toString()} color="#22c55e" />
        <KpiCard label="Valor ganado" value={formatCOP(wonValue)} color="var(--mkt-accent)" />
        <KpiCard label="Pipeline activo" value={formatCOP(totalPipelineValue)} />
        <KpiCard label="Re-engagement" value={data.returnedCount.toString()} color="#a78bfa" />
      </div>

      {/* Fit Tier + Temperature row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Tier distribution */}
        <SectionBox title="Distribución de Fit (ICP)">
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {(["A", "B", "C", "D"] as const).map(tier => (
              <div key={tier} style={{ flex: 1, textAlign: "center", padding: "10px 4px", borderRadius: 8, background: "var(--mkt-bg)", border: `2px solid ${TIER_COLORS[tier]}22` }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: TIER_COLORS[tier] }}>{data.tierCounts[tier]}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TIER_COLORS[tier], marginTop: 2 }}>Tier {tier}</div>
                <div style={{ fontSize: 9, color: "var(--mkt-text-muted)", marginTop: 1 }}>
                  {Math.round((data.tierCounts[tier] / totalTier) * 100)}%
                </div>
              </div>
            ))}
          </div>
          {/* Segment bar */}
          <div style={{ height: 10, borderRadius: 5, overflow: "hidden", display: "flex" }}>
            {(["A", "B", "C", "D"] as const).map(tier => (
              <div key={tier} style={{ width: `${(data.tierCounts[tier] / totalTier) * 100}%`, background: TIER_COLORS[tier], transition: "width 0.4s" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {(["A", "B", "C", "D"] as const).map(tier => (
              <div key={tier} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: TIER_COLORS[tier] }} />
                <span style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>Tier {tier}</span>
              </div>
            ))}
          </div>
        </SectionBox>

        {/* Temperature split */}
        <SectionBox title="Temperatura de Leads">
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {(["hot", "warm", "cold"] as const).map(t => (
              <div key={t} style={{ flex: 1, textAlign: "center", padding: "10px 4px", borderRadius: 8, background: "var(--mkt-bg)", border: `2px solid ${TEMP_COLORS[t]}22` }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: TEMP_COLORS[t] }}>{data.tempCounts[t]}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TEMP_COLORS[t], marginTop: 2 }}>{TEMP_LABELS[t]}</div>
                <div style={{ fontSize: 9, color: "var(--mkt-text-muted)", marginTop: 1 }}>
                  {Math.round((data.tempCounts[t] / totalTemp) * 100)}%
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 10, borderRadius: 5, overflow: "hidden", display: "flex" }}>
            {(["hot", "warm", "cold"] as const).map(t => (
              <div key={t} style={{ width: `${(data.tempCounts[t] / totalTemp) * 100}%`, background: TEMP_COLORS[t], transition: "width 0.4s" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {(["hot", "warm", "cold"] as const).map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: TEMP_COLORS[t] }} />
                <span style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{TEMP_LABELS[t]}</span>
              </div>
            ))}
          </div>
        </SectionBox>
      </div>

      {/* Email performance */}
      <SectionBox title="Rendimiento de Email">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Enviados", value: data.emailPerf.sent.toString(), color: "var(--mkt-text)" },
            { label: "Aperturas", value: data.emailPerf.opens.toString(), color: "#60a5fa" },
            { label: "Clics", value: data.emailPerf.clicks.toString(), color: "#a78bfa" },
            { label: "Respuestas", value: data.emailPerf.replies.toString(), color: "#22c55e" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center", padding: "10px 4px", borderRadius: 8, background: "var(--mkt-bg)" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        <RateBar label="Open Rate" rate={data.emailPerf.openRate} color="#60a5fa" note={`${data.emailPerf.opens} aperturas`} />
        <RateBar label="Click Rate" rate={data.emailPerf.clickRate} color="#a78bfa" note={`${data.emailPerf.clicks} clics`} />
        <RateBar label="Reply Rate" rate={data.emailPerf.replyRate} color="#22c55e" note={`${data.emailPerf.replies} respuestas`} />
      </SectionBox>

      {/* Sources */}
      {sortedSources.length > 0 && (
        <SectionBox title="Contactos por Fuente">
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {sortedSources.map(([src, count]) => (
              <div key={src} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 100, fontSize: 12, color: "var(--mkt-text)", fontWeight: 600, textTransform: "capitalize" }}>{src}</div>
                <div style={{ flex: 1, height: 16, borderRadius: 4, background: "var(--mkt-bg)", overflow: "hidden" }}>
                  <div style={{ width: `${(count / maxSource) * 100}%`, height: "100%", background: "var(--mkt-accent)", opacity: 0.75, transition: "width 0.4s" }} />
                </div>
                <div style={{ width: 36, textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--mkt-text)" }}>{count}</div>
                <div style={{ width: 40, textAlign: "right", fontSize: 10, color: "var(--mkt-text-muted)" }}>
                  {Math.round((count / data.totalContacts) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </SectionBox>
      )}

      {/* Lifecycle funnel bars */}
      <SectionBox title="Lifecycle (Suscriptor → Evangelista)">
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
      </SectionBox>

      {/* Deal stage funnel */}
      <SectionBox title="Pipeline de Sales (por etapa)">
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
      </SectionBox>
    </div>
  );
}
