"use client";

import { formatCurrency } from "@/lib/constants";

interface Props {
  lastActivityDays: number | null;
  activeDealValue: number;
  temperature: string;
  icpScore: number;
}

function computeHealth(p: Props): number {
  const recency = p.lastActivityDays === null ? 0
    : p.lastActivityDays <= 7 ? 30
    : p.lastActivityDays <= 14 ? 20
    : p.lastActivityDays <= 30 ? 10 : 0;
  const dealPts = p.activeDealValue > 0 ? (p.activeDealValue > 10_000_00 ? 30 : 20) : 0;
  const tempPts = p.temperature === "hot" ? 20 : p.temperature === "warm" ? 12 : 5;
  const icpPts = Math.round((p.icpScore / 100) * 20);
  return Math.min(100, recency + dealPts + tempPts + icpPts);
}

export function ContactEngagementCard(props: Props) {
  const health = computeHealth(props);
  const color = health >= 70 ? "#22c55e" : health >= 40 ? "#f59e0b" : "#ef4444";
  const label = health >= 70 ? "Saludable" : health >= 40 ? "Riesgo medio" : "En riesgo";
  const r = 28;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${color}33`, background: `${color}08`, marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
        Salud del Contacto
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
          <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - health / 100)}
              strokeLinecap="round"
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color }}>{health}</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color, marginBottom: 6 }}>{label}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {props.lastActivityDays === null
                ? "Sin actividades registradas"
                : props.lastActivityDays === 0
                ? "Actividad hoy"
                : `Última actividad hace ${props.lastActivityDays}d`}
            </div>
            {props.activeDealValue > 0 && (
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                Deal activo: <strong style={{ color: "var(--foreground)" }}>{formatCurrency(props.activeDealValue)}</strong>
              </div>
            )}
          </div>
          {/* Mini breakdown bars */}
          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {[
              { label: "Recencia", val: props.lastActivityDays === null ? 0 : props.lastActivityDays <= 7 ? 100 : props.lastActivityDays <= 14 ? 66 : props.lastActivityDays <= 30 ? 33 : 0 },
              { label: "Deal", val: props.activeDealValue > 0 ? 100 : 0 },
              { label: "Temp", val: props.temperature === "hot" ? 100 : props.temperature === "warm" ? 60 : 25 },
              { label: "ICP", val: props.icpScore },
            ].map(({ label: lbl, val }) => (
              <div key={lbl} style={{ flex: 1 }}>
                <div style={{ height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${val}%`, background: color, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 9, color: "var(--muted-foreground)", textAlign: "center", marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
