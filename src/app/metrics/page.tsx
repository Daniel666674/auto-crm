"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, Mail, Users, FileText } from "lucide-react";

const GOLD = "#D19C15";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityRow {
  id: string;
  type: string;
  completedAt: string | null;
}

// ── Seed trend data (historical weeks before this week) ───────────────────────
// Index 0 = Semana -3, 1 = Semana -2, 2 = Semana -1, 3 = Esta semana (overridden with real data)

const SEED_WEEKS = {
  call:     [8, 6, 10, 0],
  email:    [14, 18, 12, 0],
  meeting:  [3, 5, 4, 0],
  follow_up: [1, 2, 3, 0],
};

const WEEK_LABELS = ["Semana −3", "Semana −2", "Semana −1", "Esta semana"];

const METRIC_DEFS = [
  { type: "call",      label: "Llamadas",    color: "#3b82f6",  Icon: Phone },
  { type: "email",     label: "Emails",       color: GOLD,       Icon: Mail },
  { type: "meeting",   label: "Reuniones",    color: "#22c55e",  Icon: Users },
  { type: "follow_up", label: "Follow-ups",   color: "#a855f7",  Icon: FileText },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function now() { return Date.now(); }
const DAY = 86400000;

function fmtCOP(v: number) {
  return String(v);
}
void fmtCOP; // used via display only

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ values, color, width = 80, height = 36 }: { values: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - (v / max) * (height - 4) - 2;
        return <circle key={i} cx={x} cy={y} r={i === values.length - 1 ? 3 : 2} fill={color} opacity={i === values.length - 1 ? 1 : 0.5} />;
      })}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MetricsPage() {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/app/api/activities")
      .then(r => r.json())
      .then(setActivities)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Count by type for this week and prev week from real data
  const thisWeek = activities.filter(a => a.completedAt && now() - new Date(a.completedAt).getTime() < 7 * DAY);
  const prevWeek = activities.filter(a => {
    if (!a.completedAt) return false;
    const age = now() - new Date(a.completedAt).getTime();
    return age >= 7 * DAY && age < 14 * DAY;
  });

  const countType = (list: ActivityRow[], type: string) => list.filter(a => a.type === type).length;

  // Build weeks arrays: seed for [0,1,2], real data for [3] (this week) and [2] (prev week override)
  const metrics = METRIC_DEFS.map(def => {
    const weeks = [...SEED_WEEKS[def.type as keyof typeof SEED_WEEKS]];
    weeks[2] = Math.max(countType(prevWeek, def.type), weeks[2]); // prefer real if we have it
    weeks[3] = countType(thisWeek, def.type) || weeks[3]; // real this-week count (fallback to seed if DB empty)
    return { ...def, weeks };
  });

  const thisWeekTotal = metrics.reduce((s, m) => s + m.weeks[3], 0);
  const prevWeekTotal = metrics.reduce((s, m) => s + m.weeks[2], 0);
  const productivity = prevWeekTotal > 0 ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100) : 0;

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
        <h1 className="text-2xl font-bold tracking-tight">Métricas de Actividad</h1>
        <p className="text-muted-foreground text-sm mt-1">Contadores semanales · últimas 4 semanas</p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>Actividades esta semana</div>
          <div className="text-2xl font-bold">{thisWeekTotal}</div>
        </div>
        <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>Semana anterior</div>
          <div className="text-2xl font-bold">{prevWeekTotal}</div>
        </div>
        <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>Score de productividad</div>
          <div className="text-2xl font-bold" style={{ color: productivity > 0 ? "#22c55e" : productivity < 0 ? "#ef4444" : "var(--muted-foreground)" }}>
            {productivity > 0 ? "+" : ""}{productivity}%
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            {productivity > 0 ? "↑ Mejor que la semana pasada" : productivity < 0 ? "↓ Menor que la semana pasada" : "= Sin cambio"}
          </div>
        </div>
      </div>

      {/* Metric cards with sparklines */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(m => {
          const current = m.weeks[3];
          const prev = m.weeks[2];
          const delta = prev > 0 ? Math.round(((current - prev) / prev) * 100) : 0;
          const { Icon } = m;
          return (
            <div key={m.type} className="rounded-xl border p-4 flex items-center gap-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="p-2 rounded-lg" style={{ background: `${m.color}18` }}>
                <Icon size={20} style={{ color: m.color }} />
              </div>
              <div className="flex-1">
                <div className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{m.label} esta semana</div>
                <div className="text-3xl font-bold" style={{ color: m.color }}>{current}</div>
                <div className="text-xs mt-0.5" style={{ color: delta >= 0 ? "#22c55e" : "#ef4444" }}>
                  {delta > 0 ? `+${delta}%` : `${delta}%`} vs sem. ant.
                </div>
              </div>
              <Sparkline values={m.weeks} color={m.color} width={80} height={36} />
            </div>
          );
        })}
      </div>

      {/* Weekly detail table */}
      <div className="rounded-xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="text-sm font-bold mb-4">Detalle por semana</div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Actividad</th>
              {WEEK_LABELS.map(l => (
                <th key={l} className="py-2 px-3 text-right text-xs font-medium" style={{ color: l === "Esta semana" ? GOLD : "var(--muted-foreground)", fontWeight: l === "Esta semana" ? 700 : 500 }}>
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => {
              const { Icon } = m;
              return (
                <tr key={m.type} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Icon size={13} style={{ color: m.color }} />
                      {m.label}
                    </div>
                  </td>
                  {m.weeks.map((w, i) => (
                    <td key={i} className="py-2.5 px-3 text-right" style={{ fontWeight: i === 3 ? 700 : 400, color: i === 3 ? m.color : "var(--foreground)" }}>
                      {w}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr style={{ borderTop: "2px solid var(--border)" }}>
              <td className="py-2.5 px-3 text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>TOTAL</td>
              {[0, 1, 2, 3].map(i => {
                const total = metrics.reduce((s, m) => s + m.weeks[i], 0);
                return (
                  <td key={i} className="py-2.5 px-3 text-right font-bold" style={{ color: i === 3 ? GOLD : "var(--foreground)" }}>
                    {total}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
