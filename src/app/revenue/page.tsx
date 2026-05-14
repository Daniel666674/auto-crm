"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

const GOLD = "#D19C15";
const COLORS = [GOLD, "#7c2d3e", "#3b82f6", "#22c55e", "#a855f7"];

interface RevenueMonth { label: string; revenue: number; target: number }
interface Concentration { label: string; value: number }
interface RevenueSummary {
  totalRevenue: number; totalWonPipeline: number;
  currentTarget: number; closedCount: number; wonCount: number;
}

function fmtCOP(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>{label}</div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: accent ?? "var(--foreground)" }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{sub}</div>}
    </div>
  );
}

function SVGDonut({ data, size = 110, thick = 22 }: { data: { value: number; color: string }[]; size?: number; thick?: number }) {
  const cx = size / 2, cy = size / 2, r = (size - thick) / 2;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -Math.PI / 2;
  const paths: React.ReactElement[] = [];
  data.forEach((seg, i) => {
    const sweep = (seg.value / total) * 2 * Math.PI;
    const end = angle + sweep;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    paths.push(
      <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none" stroke={seg.color} strokeWidth={thick} strokeLinecap="butt" opacity={0.85} />
    );
    angle = end;
  });
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thick} />
      {paths}
    </svg>
  );
}

export default function RevenuePage() {
  const [months, setMonths] = useState<RevenueMonth[]>([]);
  const [concentration, setConcentration] = useState<Concentration[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [range, setRange] = useState<"6m" | "12m">("6m");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/revenue?range=${range}`)
      .then(r => r.json())
      .then(data => {
        setMonths(data.months ?? []);
        setConcentration((data.concentration ?? []).map((c: Concentration, i: number) => ({ ...c, color: COLORS[i % COLORS.length] })));
        setSummary(data.summary ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  const totalConc = concentration.reduce((s, c) => s + c.value, 0) || 1;
  const topPct = concentration.length ? Math.round((concentration[0].value / totalConc) * 100) : 0;
  const concentrated = topPct > 40 && concentration.length > 0;

  const W = 500, H = 160, PAD = 20;
  const maxVal = Math.max(...months.map(m => Math.max(m.revenue, m.target)), 1);
  const segW = months.length > 0 ? W / months.length : W;
  const bw = segW * 0.5;

  const thisMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];
  const mom = thisMonth && prevMonth && prevMonth.revenue > 0
    ? Math.round(((thisMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={24} style={{ color: GOLD }} />
      </div>
    );
  }

  const hasNoData = !summary || summary.closedCount === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Ingresos cerrados vs targets · en COP</p>
        </div>
        <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          {(["6m", "12m"] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{
                padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: range === r ? GOLD : "transparent",
                color: range === r ? "#0a0a0a" : "var(--muted-foreground)",
              }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {hasNoData && (
        <div className="rounded-xl border p-4 text-sm" style={{ background: "rgba(209,156,21,0.08)", borderColor: "rgba(209,156,21,0.3)", color: GOLD }}>
          No hay deals marcados como pagados todavía. Usa "Marcar como pagado" en un deal para registrar ingresos reales.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Ingresos este mes"
          value={thisMonth ? fmtCOP(thisMonth.revenue) : "$0"}
          sub={mom !== null ? `${mom > 0 ? "+" : ""}${mom}% vs mes anterior` : undefined}
          accent={GOLD}
        />
        <StatCard
          label="Target este mes"
          value={summary ? fmtCOP(summary.currentTarget) : "—"}
          sub={thisMonth && summary ? `${Math.round((thisMonth.revenue / summary.currentTarget) * 100)}% alcanzado` : undefined}
        />
        <StatCard
          label="Total ingresos acumulados"
          value={summary ? fmtCOP(summary.totalRevenue) : "$0"}
          sub={`${summary?.closedCount ?? 0} deal${summary?.closedCount !== 1 ? "s" : ""} pagado${summary?.closedCount !== 1 ? "s" : ""}`}
          accent={summary && summary.totalRevenue > 0 ? "#22c55e" : undefined}
        />
        <StatCard
          label="Pipeline ganado (no cobrado)"
          value={summary ? fmtCOP(summary.totalWonPipeline) : "$0"}
          sub={`${summary?.wonCount ?? 0} deal${summary?.wonCount !== 1 ? "s" : ""} en etapa ganada`}
          accent="#3b82f6"
        />
      </div>

      {/* Bar + target line chart */}
      <div className="rounded-xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="text-sm font-bold mb-1">Ingresos vs Target mensual</div>
        <div className="flex gap-4 text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
          <span><span style={{ color: GOLD }}>■</span> Ingresos reales</span>
          <span><span style={{ color: "#22c55e" }}>■</span> Por encima del target</span>
          <span><span style={{ color: "#7c2d3e" }}>– –</span> Target mensual</span>
        </div>
        {months.length > 0 ? (
          <svg width="100%" height={H + PAD} viewBox={`0 0 ${W} ${H + PAD}`} preserveAspectRatio="none">
            {months.map((m, i) => {
              const bh = Math.max(3, (m.revenue / maxVal) * H);
              const x = i * segW + (segW - bw) / 2;
              const y = H - bh;
              const col = m.revenue >= m.target && m.revenue > 0 ? "#22c55e" : GOLD;
              return (
                <g key={i}>
                  <rect x={x} y={y} width={bw} height={bh} rx={3} fill={col} opacity={m.revenue > 0 ? 0.85 : 0.2} />
                  <text x={x + bw / 2} y={H + 14} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)" fontFamily="inherit">
                    {m.label}
                  </text>
                </g>
              );
            })}
            {months.map((m, i) => {
              if (i === 0) return null;
              const prev = months[i - 1];
              const x1 = (i - 1) * segW + segW / 2, y1 = H - (prev.target / maxVal) * H;
              const x2 = i * segW + segW / 2, y2 = H - (m.target / maxVal) * H;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7c2d3e" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.9} />;
            })}
          </svg>
        ) : (
          <div className="text-sm text-center py-8" style={{ color: "var(--muted-foreground)" }}>Sin datos en el rango seleccionado</div>
        )}
      </div>

      {/* Client concentration */}
      <div className="rounded-xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-bold">Concentración de clientes</div>
          {concentrated && (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              <AlertTriangle size={12} />
              {concentration[0].label} representa {topPct}% del revenue
            </div>
          )}
        </div>
        {concentration.length > 0 ? (
          <div className="flex items-center gap-6">
            <SVGDonut data={concentration.map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] }))} size={110} thick={22} />
            <div className="flex-1 flex flex-col gap-2.5">
              {concentration.map((c, i) => {
                const pct = Math.round((c.value / totalConc) * 100);
                const color = COLORS[i % COLORS.length];
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
                        <span>{c.label}</span>
                      </div>
                      <span className="font-semibold" style={{ color: i === 0 && concentrated ? "#ef4444" : "var(--foreground)" }}>
                        {pct}% · {fmtCOP(c.value)}
                      </span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-sm py-4" style={{ color: "var(--muted-foreground)" }}>
            La concentración de clientes aparecerá cuando haya deals marcados como pagados.
          </div>
        )}
      </div>
    </div>
  );
}
