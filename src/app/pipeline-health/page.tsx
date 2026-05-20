"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const GOLD = "#D19C15";
const DEFAULT_MONTHLY_TARGET = 90000000; // COP — fallback when no quota configured

// ── Types ─────────────────────────────────────────────────────────────────────

interface DealRow {
  id: string;
  title: string;
  value: number;
  probability: number;
  contactId: string;
  createdAt: string;
  stageIsWon: boolean | null;
  stageIsLost: boolean | null;
}

interface ActivityRow {
  id: string;
  dealId: string | null;
  completedAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCOP(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

const DAY = 86400000;

// ── Gauge SVG ─────────────────────────────────────────────────────────────────

function Gauge({ score, color }: { score: number; color: string }) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  // Semicircle: 0° = leftmost (20,100), 180° = rightmost (180,100)
  const angle = Math.min(179.5, (score / 100) * 180);
  const gx = (a: number) => 100 + 80 * Math.cos(rad(180 - a));
  const gy = (a: number) => 100 - 80 * Math.sin(rad(180 - a));
  const largeArc = angle > 90 ? 1 : 0;

  return (
    <svg width={200} height={115} viewBox="0 0 200 115">
      {/* Track */}
      <path d="M 20,100 A 80,80 0 0,1 180,100" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={16} strokeLinecap="round" />
      {/* Filled arc */}
      {score > 0 && (
        <path
          d={`M 20,100 A 80,80 0 ${largeArc},1 ${gx(angle)},${gy(angle)}`}
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeLinecap="round"
          opacity={0.9}
        />
      )}
      {/* Needle dot */}
      <circle cx={gx(angle)} cy={gy(angle)} r={6} fill={color} />
      {/* Score text */}
      <text x={100} y={90} textAnchor="middle" fontSize={36} fontWeight={800} fill={color} fontFamily="inherit">
        {score}
      </text>
      <text x={100} y={108} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)" fontFamily="inherit">
        de 100
      </text>
    </svg>
  );
}

// ── Factor bar ────────────────────────────────────────────────────────────────

function FactorRow({ label, detail, tip, score, max }: { label: string; detail: string; tip: string; score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex items-start justify-between mb-1.5 gap-3">
        <div className="flex-1">
          <div className="text-sm font-semibold leading-snug">{label}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{detail}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-lg font-bold" style={{ color }}>{score}</span>
          <span className="text-xs font-normal" style={{ color: "var(--muted-foreground)" }}>/{max}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{tip}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PipelineHealthPage() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [monthlyTarget, setMonthlyTarget] = useState(DEFAULT_MONTHLY_TARGET);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/deals").then(r => r.json()),
      fetch("/api/activities").then(r => r.json()),
    ])
      .then(([d, a]) => { setDeals(d); setActivities(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/targets/current")
      .then(r => r.ok ? r.json() : null)
      .then(t => { if (t?.monthlyTarget) setMonthlyTarget(t.monthlyTarget); })
      .catch(() => {});
  }, []);

  const activeDeals = deals.filter(d => !d.stageIsWon && !d.stageIsLost);
  const totalPipeline = activeDeals.reduce((s, d) => s + d.value, 0);

  // ── Factor 1: Coverage ratio (weighted pipeline vs monthly target, max 30 pts)
  const weightedPipeline = activeDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const coverageRatio = monthlyTarget > 0 ? Math.min(2, weightedPipeline / monthlyTarget) : 0;
  const coverageScore = Math.round(coverageRatio * 30);

  // ── Factor 2: Average deal age — lower is better (max 25 pts)
  const avgDays = activeDeals.length
    ? activeDeals.reduce((s, d) => s + Math.floor((Date.now() - new Date(d.createdAt).getTime()) / DAY), 0) / activeDeals.length
    : 0;
  const stageScore = avgDays < 10 ? 25 : avgDays < 20 ? 18 : avgDays < 30 ? 10 : 5;

  // ── Factor 3: Stalled deals (no activity linked in > 14 days, max 25 pts)
  const stalledCount = activeDeals.filter(deal => {
    const dealActs = activities.filter(a => a.dealId === deal.id && a.completedAt);
    if (dealActs.length === 0) return true;
    const lastMs = Math.max(...dealActs.map(a => new Date(a.completedAt!).getTime()));
    return Date.now() - lastMs > 14 * DAY;
  }).length;
  const stalledScore = stalledCount === 0 ? 25 : stalledCount <= 1 ? 20 : stalledCount <= 2 ? 12 : 5;

  // ── Factor 4: Multi-contact coverage — contacts with >1 deal reduce risk (max 20 pts)
  const contactDealCount: Record<string, number> = {};
  activeDeals.forEach(d => { contactDealCount[d.contactId] = (contactDealCount[d.contactId] ?? 0) + 1; });
  const singleContactDeals = activeDeals.filter(d => contactDealCount[d.contactId] <= 1).length;
  const singleScore = activeDeals.length === 0 ? 20 : Math.max(0, Math.round(20 * (1 - singleContactDeals / activeDeals.length)));

  const totalScore = Math.min(100, coverageScore + stageScore + stalledScore + singleScore);
  const scoreColor = totalScore >= 70 ? "#22c55e" : totalScore >= 40 ? "#f59e0b" : "#ef4444";
  const scoreLabel = totalScore >= 70 ? "Pipeline Saludable" : totalScore >= 40 ? "Atención Requerida" : "Pipeline en Riesgo";

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
        <h1 className="text-2xl font-bold tracking-tight">Pipeline Health Score</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Salud del pipeline 0–100 · actualizado en tiempo real
        </p>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "300px 1fr" }}>
        {/* Gauge card */}
        <div className="rounded-xl border p-6 flex flex-col items-center" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <Gauge score={totalScore} color={scoreColor} />
          <div className="text-base font-bold mt-3 text-center" style={{ color: scoreColor }}>
            {scoreLabel}
          </div>
          <div className="text-xs mt-2 text-center" style={{ color: "var(--muted-foreground)" }}>
            {activeDeals.length} deal{activeDeals.length !== 1 ? "s" : ""} activo{activeDeals.length !== 1 ? "s" : ""}
            {" · "}
            {fmtCOP(totalPipeline)} en pipeline
          </div>

          {/* Score breakdown chips */}
          <div className="w-full mt-5 flex flex-col gap-2">
            {[
              { label: "Cobertura", score: coverageScore, max: 30 },
              { label: "Velocidad", score: stageScore, max: 25 },
              { label: "Sin estancar", score: stalledScore, max: 25 },
              { label: "Multi-contacto", score: singleScore, max: 20 },
            ].map(f => {
              const pct = (f.score / f.max) * 100;
              const c = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
              return (
                <div key={f.label} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>{f.label}</span>
                  <span className="font-bold" style={{ color: c }}>{f.score}<span className="font-normal opacity-60">/{f.max}</span></span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="rounded-xl border p-5 flex flex-col gap-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="text-sm font-bold">Desglose por factor</div>

          <FactorRow
            label="Coverage ratio (pipeline ponderado vs meta)"
            score={coverageScore}
            max={30}
            detail={`${fmtCOP(weightedPipeline)} ponderado vs ${fmtCOP(monthlyTarget)} meta mensual`}
            tip={coverageRatio < 1 ? "Pipeline insuficiente para alcanzar la meta del mes — agrega más deals." : "Cobertura buena, el pipeline supera la meta."}
          />

          <FactorRow
            label="Velocidad promedio por etapa"
            score={stageScore}
            max={25}
            detail={`${avgDays.toFixed(1)} días promedio de vida por deal`}
            tip={avgDays > 20 ? "Deals moviéndose lento — revisa bloqueos y califica oportunidades." : "Buen ritmo de avance en el pipeline."}
          />

          <FactorRow
            label="Deals estancados (>14d sin actividad)"
            score={stalledScore}
            max={25}
            detail={`${stalledCount} deal${stalledCount !== 1 ? "s" : ""} sin actividad registrada en los últimos 14 días`}
            tip={stalledCount > 0 ? `Registra una actividad en ${stalledCount} deal${stalledCount !== 1 ? "s" : ""} para mantener el momentum.` : "Todos los deals tienen actividad reciente."}
          />

          <FactorRow
            label="Concentración de contactos"
            score={singleScore}
            max={20}
            detail={`${singleContactDeals} deal${singleContactDeals !== 1 ? "s" : ""} con contacto único en la empresa`}
            tip="Busca múltiples contactos por empresa para reducir el riesgo de perder el deal por rotación."
          />

          {/* Recommendations */}
          {totalScore < 70 && (
            <div className="rounded-lg p-4 mt-1" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div className="text-xs font-bold mb-2" style={{ color: "#f59e0b" }}>Acciones recomendadas</div>
              <ul className="text-xs flex flex-col gap-1.5" style={{ color: "var(--muted-foreground)" }}>
                {coverageRatio < 1 && <li>→ Añade al menos {fmtCOP(monthlyTarget - weightedPipeline)} en deals ponderados para cubrir la meta.</li>}
                {stalledCount > 0 && <li>→ Registra actividad en los {stalledCount} deal{stalledCount !== 1 ? "s" : ""} estancado{stalledCount !== 1 ? "s" : ""}.</li>}
                {avgDays > 20 && <li>→ Revisa los deals más antiguos y decide: avanzar, nurture, o cerrar como perdido.</li>}
                {singleScore < 15 && <li>→ Identifica otros contactos en las empresas con un solo punto de contacto.</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
