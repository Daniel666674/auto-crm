"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, AlertTriangle, Clock, Flame, Target, ArrowRight } from "lucide-react";

const GOLD = "#D19C15";

function cop(cents: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.round(cents / 100));
}
function copShort(cents: number) {
  const v = cents / 100;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${Math.round(v)}`;
}

interface FunnelData {
  period: string;
  kpis: { openPipelineCents: number; weightedPipelineCents: number; avgDealCents: number; velocityMonthlyCents: number; winRate: number; avgCycleDays: number; wonPeriodCents: number; wonPeriodCount: number; openCount: number };
  quota: { quotaCents: number; wonValue: number; attainmentPct: number | null; remainingQuota: number; coverageRatio: number | null; daysLeftInQuarter: number; hasTarget: boolean };
  forecast: { wonSoFarCents: number; commitCents: number; bestCaseCents: number; pipelineCents: number; projectedQuarterCents: number };
  stages: { id: string; name: string; color: string; isWon: boolean; count: number; valueCents: number; weightedCents: number; avgDaysInStage: number; convFromPrev: number | null }[];
  health: {
    stuck: { id: string; title: string; contactName: string | null; valueCents: number; stageName: string; days: number }[];
    slipping: { id: string; title: string; contactName: string | null; valueCents: number; stageName: string; overdueDays: number }[];
    recentWon: { id: string; title: string; contactName: string | null; valueCents: number }[];
    recentLost: { id: string; title: string; contactName: string | null; valueCents: number }[];
  };
  hotList: { id: string; title: string; contactName: string | null; company: string | null; valueCents: number; probability: number; stageName: string; daysStale: number; reason: string }[];
  bySource: { source: string; deals: number; won: number; winRate: number; wonValueCents: number }[];
}

const PERIODS = [{ id: "quarter", label: "Trimestre" }, { id: "month", label: "Mes" }, { id: "all", label: "Todo" }];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>{children}</div>;
}
function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight" style={accent ? { color: GOLD } : undefined}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function SalesFunnelPage() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("quarter");

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/funnel?period=${p}`);
      const d = await res.json();
      if (!d.error) setData(d);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(period); }, [load, period]);

  if (loading && !data) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando funnel de ventas…</div>;
  if (!data) return <div className="text-sm text-muted-foreground">Sin datos.</div>;

  const { kpis, quota, forecast, stages, health, hotList, bySource } = data;
  const maxStageVal = Math.max(...stages.map(s => s.valueCents), 1);
  const coverageColor = quota.coverageRatio == null ? "text-muted-foreground" : quota.coverageRatio >= 3 ? "text-green-500" : quota.coverageRatio >= 2 ? "text-amber-500" : "text-red-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><TrendingUp className="h-5 w-5" style={{ color: GOLD }} /> Funnel de Ventas</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Pipeline en vivo — qué cerrar hoy, qué se está enfriando, y si vas a cumplir la cuota.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${period === p.id ? "text-black" : "text-muted-foreground hover:text-foreground"}`}
              style={period === p.id ? { background: GOLD } : undefined}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Pipeline abierto" value={copShort(kpis.openPipelineCents)} sub={`${kpis.openCount} deals`} />
        <Kpi label="Pipeline ponderado" value={copShort(kpis.weightedPipelineCents)} sub="ajustado por prob." />
        <Kpi label="Velocidad / mes" value={copShort(kpis.velocityMonthlyCents)} sub="ritmo de cierre" accent />
        <Kpi label="Win rate" value={`${kpis.winRate}%`} sub="ganados / cerrados" />
        <Kpi label="Ciclo promedio" value={`${kpis.avgCycleDays}d`} sub="creación → cierre" />
        <Kpi label="Ganado" value={copShort(kpis.wonPeriodCents)} sub={`${kpis.wonPeriodCount} deals`} accent />
      </div>

      {/* Quota coverage + Forecast */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4" style={{ color: GOLD }} /> Cobertura de cuota — trimestre</h2>
            <span className="text-[11px] text-muted-foreground">{quota.daysLeftInQuarter} días restantes</span>
          </div>
          {quota.hasTarget ? (
            <>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">Ganado {cop(quota.wonValue)} de {cop(quota.quotaCents)}</span>
                <span className="font-semibold" style={{ color: GOLD }}>{quota.attainmentPct}% de la meta</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${Math.min(quota.attainmentPct ?? 0, 100)}%`, background: GOLD }} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="text-muted-foreground">Cobertura de pipeline (abierto ÷ cuota restante)</span>
                <span className={`font-bold ${coverageColor}`}>{quota.coverageRatio != null ? `${quota.coverageRatio}×` : "—"} {quota.coverageRatio != null && quota.coverageRatio < 3 && <span className="font-normal text-muted-foreground">(sano ≥ 3×)</span>}</span>
              </div>
            </>
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">No hay cuota trimestral configurada. Defínela en <Link href="/settings" className="underline" style={{ color: GOLD }}>Ajustes → Metas de venta</Link> para activar la cobertura y la proyección.</div>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Proyección del trimestre</h2>
          <div className="space-y-2 text-xs">
            <Band label="Ganado" value={cop(forecast.wonSoFarCents)} pct={100} color="#22c55e" max={forecast.bestCaseCents + forecast.wonSoFarCents} cents={forecast.wonSoFarCents} />
            <Band label="Commit (≥80%)" value={cop(forecast.commitCents)} color={GOLD} max={forecast.bestCaseCents + forecast.wonSoFarCents} cents={forecast.commitCents} />
            <Band label="Best case (≥50%)" value={cop(forecast.bestCaseCents)} color="#60a5fa" max={forecast.bestCaseCents + forecast.wonSoFarCents} cents={forecast.bestCaseCents} />
            <Band label="Pipeline total" value={cop(forecast.pipelineCents)} color="#94a3b8" max={forecast.bestCaseCents + forecast.wonSoFarCents} cents={forecast.pipelineCents} />
          </div>
          <div className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">Proyección (ganado + commit): <strong className="text-foreground">{cop(forecast.projectedQuarterCents)}</strong></div>
        </Card>
      </div>

      {/* Stage funnel */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold">Embudo por etapa</h2>
        <div className="space-y-3">
          {stages.map(s => {
            const w = Math.max((s.valueCents / maxStageVal) * 100, s.count > 0 ? 6 : 1.5);
            const stale = !s.isWon && s.avgDaysInStage >= 21;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-36 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-medium"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</div>
                  {s.convFromPrev != null && <div className="text-[10px] text-muted-foreground">{s.convFromPrev}% desde etapa previa</div>}
                </div>
                <div className="relative flex-1">
                  <div className="flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-black" style={{ width: `${w}%`, minWidth: 90, background: s.color, opacity: 0.9 }}>
                    {copShort(s.valueCents)} · {s.count}
                  </div>
                </div>
                <div className={`w-24 shrink-0 text-right text-[11px] ${stale ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                  {stale && <AlertTriangle className="mr-1 inline h-3 w-3" />}{s.avgDaysInStage}d prom.
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Hot list — Next Best Action */}
      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4 text-orange-500" /> A quién llamar hoy — Next Best Action</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 pr-3">#</th><th className="pb-2 pr-3">Deal</th><th className="pb-2 pr-3">Etapa</th><th className="pb-2 pr-3 text-right">Valor</th><th className="pb-2 pr-3 text-right">Prob.</th><th className="pb-2">Por qué</th><th></th>
            </tr></thead>
            <tbody>
              {hotList.map((d, i) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 pr-3"><div className="font-medium">{d.title}</div><div className="text-[10px] text-muted-foreground">{d.contactName ?? d.company ?? ""}</div></td>
                  <td className="py-2 pr-3 text-muted-foreground">{d.stageName}</td>
                  <td className="py-2 pr-3 text-right font-semibold">{copShort(d.valueCents)}</td>
                  <td className="py-2 pr-3 text-right">{d.probability}%</td>
                  <td className="py-2 text-muted-foreground">{d.reason}</td>
                  <td className="py-2 text-right"><Link href={`/deals/${d.id}`} className="inline-flex items-center gap-1 font-medium" style={{ color: GOLD }}>Abrir <ArrowRight className="h-3 w-3" /></Link></td>
                </tr>
              ))}
              {hotList.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No hay deals abiertos.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Health: stuck + slipping */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-amber-500" /> Deals estancados (&gt;{14}d sin movimiento)</h2>
          <HealthList rows={health.stuck.map(r => ({ id: r.id, title: r.title, sub: `${r.stageName} · ${r.contactName ?? ""}`, right: `${r.days}d`, value: r.valueCents }))} empty="Nada estancado. 👌" />
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-red-500" /> Cierres vencidos (slipping)</h2>
          <HealthList rows={health.slipping.map(r => ({ id: r.id, title: r.title, sub: `${r.stageName} · ${r.contactName ?? ""}`, right: `+${r.overdueDays}d`, value: r.valueCents, danger: true }))} empty="Ninguna fecha de cierre vencida." />
        </Card>
      </div>

      {/* Win rate by source — the marketing feedback loop */}
      <Card>
        <h2 className="mb-1 text-sm font-semibold">Win rate por fuente</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">Qué fuentes de marketing realmente cierran — esta señal alimenta dónde invertir la pauta.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 pr-3">Fuente</th><th className="pb-2 pr-3 text-right">Deals</th><th className="pb-2 pr-3 text-right">Ganados</th><th className="pb-2 pr-3 text-right">Win rate</th><th className="pb-2 text-right">Revenue</th>
            </tr></thead>
            <tbody>
              {bySource.map(s => (
                <tr key={s.source} className="border-t border-border">
                  <td className="py-2 pr-3 font-medium capitalize">{s.source}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground">{s.deals}</td>
                  <td className="py-2 pr-3 text-right text-green-500">{s.won}</td>
                  <td className="py-2 pr-3 text-right font-semibold" style={{ color: s.winRate >= 20 ? "#22c55e" : undefined }}>{s.winRate}%</td>
                  <td className="py-2 text-right">{s.wonValueCents > 0 ? copShort(s.wonValueCents) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Band({ label, value, color, max, cents }: { label: string; value: string; color: string; max: number; cents: number; pct?: number }) {
  const w = max > 0 ? Math.min((cents / max) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span><span className="font-medium">{value}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} /></div>
    </div>
  );
}

function HealthList({ rows, empty }: { rows: { id: string; title: string; sub: string; right: string; value: number; danger?: boolean }[]; empty: string }) {
  if (rows.length === 0) return <div className="py-4 text-center text-xs text-muted-foreground">{empty}</div>;
  return (
    <div className="space-y-1.5">
      {rows.map(r => (
        <Link key={r.id} href={`/deals/${r.id}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs transition-colors hover:bg-muted">
          <div className="min-w-0"><div className="truncate font-medium">{r.title}</div><div className="truncate text-[10px] text-muted-foreground">{r.sub}</div></div>
          <div className="flex shrink-0 items-center gap-3"><span className="text-muted-foreground">{new Intl.NumberFormat("es-CO", { notation: "compact", style: "currency", currency: "COP", maximumFractionDigits: 1 }).format(r.value / 100)}</span><span className={`font-semibold ${r.danger ? "text-red-500" : "text-amber-500"}`}>{r.right}</span></div>
        </Link>
      ))}
    </div>
  );
}
