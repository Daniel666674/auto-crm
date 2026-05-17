"use client";

import React from "react";

const GOLD = "#C39A4C";

export function formatCOP(cents: number): string {
  return (cents / 100).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

// ---------------------------------------------------------------------------
// MonthlyBars: bars for won/lost + line for revenue
// ---------------------------------------------------------------------------
interface MonthData {
  label: string;
  won: number;
  lost: number;
  revenue: number;
}

export function MonthlyBars({ data }: { data: MonthData[] }) {
  if (data.length === 0) return <div className="text-sm text-zinc-500 py-8 text-center">Sin datos</div>;

  const maxCount = Math.max(1, ...data.map((d) => d.won + d.lost));
  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
  const W = 720, H = 220, padding = 30;
  const barWidth = (W - 2 * padding) / data.length;

  const points = data.map((d, i) => {
    const x = padding + i * barWidth + barWidth / 2;
    const y = H - padding - (d.revenue / maxRevenue) * (H - 2 * padding);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 40}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={padding} y1={H - padding - p * (H - 2 * padding)}
            x2={W - padding} y2={H - padding - p * (H - 2 * padding)}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1}
          />
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const x = padding + i * barWidth + 6;
          const w = barWidth - 12;
          const wonH = (d.won / maxCount) * (H - 2 * padding);
          const lostH = (d.lost / maxCount) * (H - 2 * padding);
          return (
            <g key={i}>
              <rect
                x={x} y={H - padding - wonH} width={w / 2 - 2} height={wonH}
                fill="#22c55e" opacity={0.7}
              />
              <rect
                x={x + w / 2 + 2} y={H - padding - lostH} width={w / 2 - 2} height={lostH}
                fill="#ef4444" opacity={0.6}
              />
              <text
                x={x + w / 2} y={H - padding + 14}
                fill="rgba(255,255,255,0.5)" fontSize="9" textAnchor="middle"
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Revenue line */}
        <polyline
          points={points} fill="none" stroke={GOLD} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round"
        />
        {data.map((d, i) => {
          const x = padding + i * barWidth + barWidth / 2;
          const y = H - padding - (d.revenue / maxRevenue) * (H - 2 * padding);
          return <circle key={i} cx={x} cy={y} r={3} fill={GOLD} />;
        })}

        {/* Legend */}
        <g transform={`translate(${padding}, ${H + 20})`}>
          <rect width={10} height={10} fill="#22c55e" opacity={0.7} />
          <text x={14} y={9} fill="rgba(255,255,255,0.7)" fontSize="11">Ganados</text>
          <rect x={70} width={10} height={10} fill="#ef4444" opacity={0.6} />
          <text x={84} y={9} fill="rgba(255,255,255,0.7)" fontSize="11">Perdidos</text>
          <line x1={150} y1={5} x2={170} y2={5} stroke={GOLD} strokeWidth={2} />
          <text x={174} y={9} fill="rgba(255,255,255,0.7)" fontSize="11">Revenue ganado</text>
        </g>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FunnelChart: horizontal bars with shrinking width
// ---------------------------------------------------------------------------
export function FunnelChart({ data }: { data: { stageName: string; count: number; value: number }[] }) {
  if (data.length === 0) return <div className="text-sm text-zinc-500 py-8 text-center">Sin datos</div>;
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const conversionFromTop = data[0].count > 0 ? (d.count / data[0].count) * 100 : 0;
        const isWon = d.stageName === "Ganados";
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium">{d.stageName}</span>
              <span className="text-zinc-500">
                {d.count} deal{d.count !== 1 ? "s" : ""} · {conversionFromTop.toFixed(0)}% · {formatCOP(d.value)}
              </span>
            </div>
            <div className="relative h-7 rounded bg-zinc-800/40 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 transition-all"
                style={{
                  width: `${pct}%`,
                  background: isWon ? "linear-gradient(90deg, #22c55e, #16a34a)" : `linear-gradient(90deg, ${GOLD}, #a07a35)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SourceBreakdownTable
// ---------------------------------------------------------------------------
interface SourceRow {
  source: string;
  won: number;
  lost: number;
  revenue: number;
  winRate: number;
}

const SOURCE_LABELS: Record<string, string> = {
  referral: "Referido",
  inbound: "Inbound",
  outbound: "Outbound",
  linkedin: "LinkedIn",
  evento: "Evento",
  otro: "Otro",
};

export function SourceBreakdownTable({ data }: { data: SourceRow[] }) {
  if (data.length === 0) return <div className="text-sm text-zinc-500 py-6 text-center">Sin deals cerrados</div>;
  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));

  return (
    <div className="space-y-2">
      {data.map((row) => (
        <div key={row.source} className="rounded-lg bg-zinc-800/30 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-white">{SOURCE_LABELS[row.source] ?? row.source}</span>
            <span className="text-[#C39A4C] font-semibold">{formatCOP(row.revenue)}</span>
          </div>
          <div className="relative h-1.5 rounded bg-zinc-900 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#C39A4C]"
              style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span>{row.won} ganados · {row.lost} perdidos</span>
            <span className={row.winRate >= 50 ? "text-green-400" : "text-zinc-400"}>
              Win rate {row.winRate.toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
