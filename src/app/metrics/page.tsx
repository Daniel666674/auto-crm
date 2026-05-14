"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, Mail, Users, FileText, Star, TrendingUp } from "lucide-react";

const GOLD = "#C39A4C";

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid rgba(195,154,76,0.3)",
  borderRadius: 12,
  padding: "20px 22px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

function OvKPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: GOLD }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 1, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

interface RevenueOverview { summary: { totalRevenue: number; totalWonPipeline: number; currentTarget: number; closedCount: number; wonCount: number } }
interface PipelineOverview { stages: { name: string; deals: any[] }[]; deals: any[] }

interface MetricsSummary {
  totalActivities: number;
  calls: number; emails: number; meetings: number; followUps: number; notes: number;
  contactsCreated: number; dealsCreated: number; dealsClosed: number;
  revenueGenerated: number; avgVelocityDays: number | null; activityToDeal: number | null;
}

interface WeekBucket { label: string; calls: number; emails: number; meetings: number; followUps: number }

type Preset = "7d" | "28d" | "90d" | "custom";

const PRESETS: { id: Preset; label: string; days?: number }[] = [
  { id: "7d", label: "7 días", days: 7 },
  { id: "28d", label: "28 días", days: 28 },
  { id: "90d", label: "90 días", days: 90 },
  { id: "custom", label: "Personalizado" },
];

const METRIC_DEFS = [
  { key: "calls" as const, label: "Llamadas", color: "#3b82f6", Icon: Phone },
  { key: "emails" as const, label: "Emails", color: GOLD, Icon: Mail },
  { key: "meetings" as const, label: "Reuniones", color: "#22c55e", Icon: Users },
  { key: "followUps" as const, label: "Follow-ups", color: "#a855f7", Icon: FileText },
];

function fmtCOP(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

function toISO(date: Date) { return date.toISOString().split("T")[0]; }

function Sparkline({ values, color, width = 80, height = 36 }: { values: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * width : width / 2;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
      {values.map((v, i) => {
        const x = values.length > 1 ? (i / (values.length - 1)) * width : width / 2;
        const y = height - (v / max) * (height - 4) - 2;
        return <circle key={i} cx={x} cy={y} r={i === values.length - 1 ? 3 : 2} fill={color} opacity={i === values.length - 1 ? 1 : 0.5} />;
      })}
    </svg>
  );
}

export default function MetricsPage() {
  const [preset, setPreset] = useState<Preset>("28d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [weeks, setWeeks] = useState<WeekBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueOverview | null>(null);
  const [pipeline, setPipeline] = useState<PipelineOverview | null>(null);

  useEffect(() => {
    fetch("/api/revenue?range=6m").then(r => r.json()).then(setRevenue).catch(() => {});
    fetch("/api/pipeline").then(r => r.json()).then(setPipeline).catch(() => {});
  }, []);

  const now = new Date();

  function getRange(): { from: string; to: string } {
    if (preset === "custom" && customFrom && customTo) return { from: customFrom, to: customTo };
    const days = PRESETS.find(p => p.id === preset)?.days ?? 28;
    const from = new Date(now.getTime() - days * 86400000);
    return { from: toISO(from), to: toISO(now) };
  }

  useEffect(() => {
    const { from, to } = getRange();
    if (preset === "custom" && (!customFrom || !customTo)) return;
    setLoading(true);
    fetch(`/api/metrics?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(data => {
        setSummary(data.summary ?? null);
        setWeeks(data.weeks ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [preset, customFrom, customTo]);

  const inputStyle: React.CSSProperties = {
    padding: "6px 10px", borderRadius: 7, border: "1px solid var(--border)",
    background: "var(--background)", color: "var(--foreground)", fontSize: 12,
  };

  const totalDeals = pipeline?.deals?.length ?? 0;
  const openDeals = pipeline?.deals?.filter((d: any) => !d.closedAt)?.length ?? 0;
  const pipelineValue = pipeline?.deals?.filter((d: any) => !d.closedAt)?.reduce((s: number, d: any) => s + (d.value || 0), 0) ?? 0;

  function fmtShort(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  }

  return (
    <div className="space-y-5">

      {/* ── Sales Overview Cards (marketing-style) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 8 }}>

        {/* Pipeline Overview */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Pipeline Overview</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(72,187,120,0.15)", color: "#48bb78" }}>Activo</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <OvKPI label="Deals totales" value={totalDeals} />
            <OvKPI label="Deals abiertos" value={openDeals} />
            <OvKPI label="Valor en pipeline" value={fmtShort(pipelineValue)} sub="COP" />
            <OvKPI label="Deals ganados (pagados)" value={revenue?.summary?.closedCount ?? 0} />
          </div>
          <button
            onClick={() => window.open("/pipeline", "_self")}
            style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(195,154,76,0.3)", background: "transparent", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Ver Pipeline →
          </button>
        </div>

        {/* Revenue Overview */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Revenue Overview</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(72,187,120,0.15)", color: "#48bb78" }}>Conectado</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <OvKPI label="Ingresos totales" value={fmtShort(revenue?.summary?.totalRevenue ?? 0)} sub="COP" />
            <OvKPI label="Target este mes" value={fmtShort(revenue?.summary?.currentTarget ?? 0)} sub="COP" />
            <OvKPI label="Pipeline ganado" value={fmtShort(revenue?.summary?.totalWonPipeline ?? 0)} sub="por facturar" />
            <OvKPI label="Deals won" value={revenue?.summary?.wonCount ?? 0} sub="en pipeline" />
          </div>
          <button
            onClick={() => window.open("/revenue", "_self")}
            style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(195,154,76,0.3)", background: "transparent", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Ver Revenue →
          </button>
        </div>

        {/* Activity Overview */}
        <div style={{ ...cardStyle, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Actividad Comercial</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(195,154,76,0.15)", color: GOLD }}>28 días</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <OvKPI label="Total actividades" value={summary?.totalActivities ?? "—"} />
            <OvKPI label="Llamadas" value={summary?.calls ?? "—"} />
            <OvKPI label="Reuniones" value={summary?.meetings ?? "—"} />
            <OvKPI label="Follow-ups" value={summary?.followUps ?? "—"} />
          </div>
          <button
            onClick={() => window.open("/analytics", "_blank")}
            style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(195,154,76,0.3)", background: "transparent", color: GOLD, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Ver Analytics →
          </button>
        </div>

      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Métricas de Actividad</h1>
          <p className="text-muted-foreground text-sm mt-1">Seguimiento de actividades del equipo comercial</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => setPreset(p.id)}
                style={{
                  padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 600,
                  background: preset === p.id ? GOLD : "transparent",
                  color: preset === p.id ? "#0a0a0a" : "var(--muted-foreground)",
                }}>
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={inputStyle} />
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={inputStyle} />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin" size={24} style={{ color: GOLD }} />
        </div>
      ) : (
        <>
          {/* Top KPI row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total actividades", value: summary?.totalActivities ?? 0, accent: GOLD },
              { label: "Contactos creados", value: summary?.contactsCreated ?? 0, accent: "#22c55e" },
              { label: "Deals creados", value: summary?.dealsCreated ?? 0, accent: "#3b82f6" },
              { label: "Deals cerrados (pagados)", value: summary?.dealsClosed ?? 0, accent: "#a855f7" },
            ].map(({ label, value, accent }) => (
              <div key={label} className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>{label}</div>
                <div className="text-2xl font-bold" style={{ color: accent }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Secondary KPIs */}
          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>Ingresos generados</div>
                <div className="text-xl font-bold" style={{ color: GOLD }}>{fmtCOP(summary.revenueGenerated)}</div>
              </div>
              <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>Velocidad promedio del pipeline</div>
                <div className="text-xl font-bold">
                  {summary.avgVelocityDays !== null ? `${summary.avgVelocityDays} días` : "—"}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>creación → cierre</div>
              </div>
              <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>Actividades por deal creado</div>
                <div className="text-xl font-bold">
                  {summary.activityToDeal !== null ? summary.activityToDeal : "—"}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>ratio actividad/deal</div>
              </div>
            </div>
          )}

          {/* Activity type cards with sparklines */}
          <div className="grid grid-cols-2 gap-3">
            {METRIC_DEFS.map(m => {
              const current = summary ? summary[m.key] : 0;
              const sparkValues = weeks.map(w => w[m.key as keyof typeof w] as number);
              const { Icon } = m;
              return (
                <div key={m.key} className="rounded-xl border p-4 flex items-center gap-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  <div className="p-2 rounded-lg" style={{ background: `${m.color}18` }}>
                    <Icon size={20} style={{ color: m.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{m.label} en el período</div>
                    <div className="text-3xl font-bold" style={{ color: m.color }}>{current}</div>
                  </div>
                  {sparkValues.length > 1 && <Sparkline values={sparkValues} color={m.color} width={80} height={36} />}
                </div>
              );
            })}
          </div>

          {/* Weekly detail table */}
          {weeks.length > 0 && (
            <div className="rounded-xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="text-sm font-bold mb-4">Detalle semanal</div>
              <div style={{ overflowX: "auto" }}>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Actividad</th>
                      {weeks.map((w, i) => (
                        <th key={i} className="py-2 px-3 text-right text-xs font-medium"
                          style={{ color: i === weeks.length - 1 ? GOLD : "var(--muted-foreground)", fontWeight: i === weeks.length - 1 ? 700 : 500, whiteSpace: "nowrap" }}>
                          {w.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRIC_DEFS.map(m => {
                      const { Icon } = m;
                      return (
                        <tr key={m.key} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <Icon size={13} style={{ color: m.color }} />
                              {m.label}
                            </div>
                          </td>
                          {weeks.map((w, i) => {
                            const v = w[m.key as keyof typeof w] as number;
                            return (
                              <td key={i} className="py-2.5 px-3 text-right"
                                style={{ fontWeight: i === weeks.length - 1 ? 700 : 400, color: i === weeks.length - 1 ? m.color : "var(--foreground)" }}>
                                {v}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: "2px solid var(--border)" }}>
                      <td className="py-2.5 px-3 text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>TOTAL</td>
                      {weeks.map((w, i) => {
                        const total = w.calls + w.emails + w.meetings + w.followUps;
                        return (
                          <td key={i} className="py-2.5 px-3 text-right font-bold" style={{ color: i === weeks.length - 1 ? GOLD : "var(--foreground)" }}>
                            {total}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
