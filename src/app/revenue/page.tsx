"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

const GOLD = "#D19C15";

// ── Static chart data ─────────────────────────────────────────────────────────

const MONTHLY_REVENUE = [
  { label: "Oct", value: 38000000, target: 60000000 },
  { label: "Nov", value: 55000000, target: 65000000 },
  { label: "Dic", value: 47000000, target: 70000000 },
  { label: "Ene", value: 72000000, target: 75000000 },
  { label: "Feb", value: 68000000, target: 80000000 },
  { label: "Mar", value: 91000000, target: 85000000 },
  { label: "Abr", value: 74000000, target: 90000000 },
];

const CONCENTRATION = [
  { label: "Agencia Creativa", value: 22000000, color: GOLD },
  { label: "Martínez Cons.", value: 18000000, color: "#7c2d3e" },
  { label: "TechStartup", value: 16000000, color: "#3b82f6" },
  { label: "Otros", value: 18000000, color: "#7a756e" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface DealRow {
  id: string;
  value: number;
  probability: number;
  stageIsWon: boolean | null;
  stageIsLost: boolean | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCOP(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

// ── SVG Donut ─────────────────────────────────────────────────────────────────

function SVGDonut({ data, size = 110, thick = 22 }: { data: { value: number; color: string }[]; size?: number; thick?: number }) {
  const cx = size / 2, cy = size / 2, r = (size - thick) / 2;
  const total = data.reduce((s, d) => s + d.value, 0);
  let startAngle = -Math.PI / 2;
  const paths: JSX.Element[] = [];

  data.forEach((seg, i) => {
    const sweep = (seg.value / total) * 2 * Math.PI;
    const end = startAngle + sweep;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    paths.push(
      <path
        key={i}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none"
        stroke={seg.color}
        strokeWidth={thick}
        strokeLinecap="butt"
        opacity={0.85}
      />
    );
    startAngle = end;
  });

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thick} />
      {paths}
    </svg>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>{label}</div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: accent ?? "var(--foreground)" }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{sub}</div>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/deals")
      .then(r => r.json())
      .then(setDeals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const wonDeals = deals.filter(d => d.stageIsWon);
  const activeDeals = deals.filter(d => !d.stageIsWon && !d.stageIsLost);
  const winRate = deals.length > 0 ? wonDeals.length / deals.length : 0.3;
  const weightedPipeline = activeDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const lastMonth = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 1];
  const projected90d = Math.round(weightedPipeline + lastMonth.value * 3 * 0.9);

  const totalConc = CONCENTRATION.reduce((s, c) => s + c.value, 0);
  const topPct = Math.round((CONCENTRATION[0].value / totalConc) * 100);
  const concentrated = topPct > 40;

  // Chart geometry
  const W = 500, H = 160, PAD = 20;
  const maxVal = Math.max(...MONTHLY_REVENUE.map(m => Math.max(m.value, m.target)));
  const segW = W / MONTHLY_REVENUE.length;
  const bw = segW * 0.5;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={24} style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">MRR, targets y concentración de clientes · en COP</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="MRR este mes" value={fmtCOP(lastMonth.value)} accent={GOLD} />
        <StatCard label="Target este mes" value={fmtCOP(lastMonth.target)} />
        <StatCard
          label="Win rate"
          value={`${Math.round(winRate * 100)}%`}
          sub={`${wonDeals.length} deal${wonDeals.length !== 1 ? "s" : ""} cerrado${wonDeals.length !== 1 ? "s" : ""}`}
          accent={winRate >= 0.4 ? "#22c55e" : "#f59e0b"}
        />
        <StatCard label="Proyección 90d" value={fmtCOP(projected90d)} sub="pipeline ponderado + tendencia" accent="#3b82f6" />
      </div>

      {/* Bar + target line chart */}
      <div className="rounded-xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="text-sm font-bold mb-1">Revenue vs Target</div>
        <div className="flex gap-4 text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
          <span><span style={{ color: GOLD }}>■</span> Revenue real</span>
          <span><span style={{ color: "#7c2d3e" }}>– –</span> Target mensual</span>
          <span><span style={{ color: "#22c55e" }}>■</span> Por encima del target</span>
        </div>
        <svg width="100%" height={H + PAD} viewBox={`0 0 ${W} ${H + PAD}`} preserveAspectRatio="none">
          {MONTHLY_REVENUE.map((m, i) => {
            const bh = Math.max(3, (m.value / maxVal) * H);
            const x = i * segW + (segW - bw) / 2;
            const y = H - bh;
            const col = m.value >= m.target ? "#22c55e" : GOLD;
            return (
              <g key={i}>
                <rect x={x} y={y} width={bw} height={bh} rx={3} fill={col} opacity={0.85} />
                <text x={x + bw / 2} y={H + 14} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)" fontFamily="inherit">
                  {m.label}
                </text>
              </g>
            );
          })}
          {MONTHLY_REVENUE.map((m, i) => {
            if (i === 0) return null;
            const prev = MONTHLY_REVENUE[i - 1];
            const x1 = (i - 1) * segW + segW / 2, y1 = H - (prev.target / maxVal) * H;
            const x2 = i * segW + segW / 2, y2 = H - (m.target / maxVal) * H;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7c2d3e" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.9} />;
          })}
        </svg>
      </div>

      {/* Client concentration */}
      <div className="rounded-xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-bold">Concentración de clientes</div>
          {concentrated && (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              <AlertTriangle size={12} />
              {CONCENTRATION[0].label} representa {topPct}% del revenue
            </div>
          )}
        </div>
        <div className="flex items-center gap-6">
          <SVGDonut data={CONCENTRATION} size={110} thick={22} />
          <div className="flex-1 flex flex-col gap-2.5">
            {CONCENTRATION.map((c, i) => {
              const pct = Math.round((c.value / totalConc) * 100);
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm" style={{ background: c.color }} />
                      <span>{c.label}</span>
                    </div>
                    <span className="font-semibold" style={{ color: i === 0 && concentrated ? "#ef4444" : "var(--foreground)" }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: c.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
