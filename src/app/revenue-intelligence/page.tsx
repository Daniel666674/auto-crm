"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Target, Clock, DollarSign, Award, AlertCircle, RefreshCw } from "lucide-react";
import { MonthlyBars, FunnelChart, SourceBreakdownTable, formatCOP } from "@/components/revenue-intelligence/charts";

const GOLD = "#C39A4C";

interface ApiData {
  period: { months: number; fromTs: number; toTs: number };
  summary: {
    winRate: number;
    wonCount: number;
    lostCount: number;
    totalRevenue: number;
    avgDealSize: number;
    avgVelocityDays: number | null;
  };
  sourceBreakdown: Array<{ source: string; won: number; lost: number; revenue: number; winRate: number }>;
  repBreakdown: Array<{ repId: string; repName: string; won: number; lost: number; revenue: number; winRate: number }>;
  stageCounts: Array<{ stageId: string; stageName: string; count: number; value: number }>;
  monthlyTrend: Array<{ label: string; year: number; month: number; won: number; lost: number; revenue: number; avgVelocity: number | null }>;
  forecastAccuracy: { total: number; onTime: number; late: number; stillOpen: number; missedClosed: number; accuracy: number };
  lossReasons: Array<{ label: string; count: number }>;
}

function KPI({ label, value, sub, accent, icon: Icon }: { label: string; value: string; sub?: string; accent?: string; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: accent ?? "white" }}>{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
        </div>
        <Icon size={18} />
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const PRESETS = [
  { months: 3, label: "3M" },
  { months: 6, label: "6M" },
  { months: 12, label: "12M" },
  { months: 24, label: "24M" },
];

export default function RevenueIntelligencePage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/revenue-intelligence?months=${months}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        <RefreshCw size={16} className="animate-spin mr-2" /> Cargando…
      </div>
    );
  }

  const s = data.summary;
  const f = data.forecastAccuracy;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revenue Intelligence</h2>
          <p className="text-sm text-zinc-400">Análisis de cohortes, conversión y velocidad — últimos {months} meses</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {PRESETS.map((p) => (
            <button
              key={p.months}
              onClick={() => setMonths(p.months)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                months === p.months ? "bg-[#C39A4C] text-black font-medium" : "text-zinc-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI label="Win Rate" value={`${s.winRate.toFixed(1)}%`} sub={`${s.wonCount} ganados / ${s.lostCount} perdidos`} accent={s.winRate >= 50 ? "#22c55e" : GOLD} icon={Award} />
        <KPI label="Revenue total" value={formatCOP(s.totalRevenue)} sub={`${s.wonCount} deals cerrados`} accent={GOLD} icon={DollarSign} />
        <KPI label="Deal size promedio" value={formatCOP(s.avgDealSize)} icon={TrendingUp} />
        <KPI label="Velocidad" value={s.avgVelocityDays !== null ? `${s.avgVelocityDays}d` : "—"} sub="Días promedio created→won" icon={Clock} />
        <KPI label="Forecast accuracy" value={f.total > 0 ? `${f.accuracy.toFixed(0)}%` : "—"} sub={f.total > 0 ? `${f.onTime}/${f.total} a tiempo` : "Sin deals con fecha esperada"} accent={f.accuracy >= 70 ? "#22c55e" : f.accuracy >= 40 ? GOLD : "#ef4444"} icon={Target} />
      </div>

      {/* Monthly Trend (full width) */}
      <Card title="Tendencia mensual" subtitle="Deals cerrados (barras) y revenue ganado (línea dorada)">
        <MonthlyBars data={data.monthlyTrend} />
      </Card>

      {/* Two-col: Funnel & Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Embudo de conversión" subtitle="Conteo actual de deals por etapa">
          <FunnelChart data={data.stageCounts} />
        </Card>
        <Card title="Revenue por fuente" subtitle="Win rate y revenue agrupado por origen del lead">
          <SourceBreakdownTable data={data.sourceBreakdown} />
        </Card>
      </div>

      {/* Forecast Accuracy Detail */}
      <Card title="Precisión del forecast" subtitle="Deals con fecha esperada de cierre vs realidad">
        {f.total === 0 ? (
          <div className="text-center py-6 text-sm text-zinc-500">
            <AlertCircle size={20} className="mx-auto mb-2 text-zinc-600" />
            <p>Aún no hay deals con fecha esperada de cierre en este periodo</p>
            <p className="text-xs mt-1">Asigna fechas esperadas en deals para medir tu precisión de forecast</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-green-900/20 border border-green-800/30 p-3">
              <p className="text-xs text-green-400">A tiempo (±7 días)</p>
              <p className="text-xl font-bold text-green-400 mt-1">{f.onTime}</p>
            </div>
            <div className="rounded-lg bg-amber-900/20 border border-amber-800/30 p-3">
              <p className="text-xs text-amber-400">Cerrado tarde</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{f.late}</p>
            </div>
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-3">
              <p className="text-xs text-zinc-400">Aún abierto</p>
              <p className="text-xl font-bold text-zinc-300 mt-1">{f.stillOpen}</p>
            </div>
            <div className="rounded-lg bg-red-900/20 border border-red-800/30 p-3">
              <p className="text-xs text-red-400">Perdido</p>
              <p className="text-xl font-bold text-red-400 mt-1">{f.missedClosed}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Two-col: Rep performance & Loss Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Rendimiento por vendedor" subtitle="Ordenado por revenue cerrado">
          {data.repBreakdown.length === 0 ? (
            <div className="text-sm text-zinc-500 py-6 text-center">Sin deals con vendedor asignado</div>
          ) : (
            <div className="space-y-2">
              {data.repBreakdown.map((r) => (
                <div key={r.repId} className="flex items-center justify-between rounded-lg bg-zinc-800/30 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{r.repName}</p>
                    <p className="text-xs text-zinc-500">{r.won} ganados · {r.lost} perdidos · WR {r.winRate.toFixed(0)}%</p>
                  </div>
                  <p className="text-sm font-semibold text-[#C39A4C]">{formatCOP(r.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Razones de pérdida" subtitle="Por qué se pierden los deals">
          {data.lossReasons.length === 0 ? (
            <div className="text-sm text-zinc-500 py-6 text-center">Sin deals perdidos en este periodo</div>
          ) : (
            <div className="space-y-2">
              {data.lossReasons.map((r) => {
                const totalLoss = data.lossReasons.reduce((s, x) => s + x.count, 0);
                const pct = totalLoss > 0 ? (r.count / totalLoss) * 100 : 0;
                return (
                  <div key={r.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">{r.label}</span>
                      <span className="text-zinc-500">{r.count} · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="relative h-1.5 rounded bg-zinc-800 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-red-500/60" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
