"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/constants";

interface RevenueMonth { label: string; revenue: number; target: number; }
interface Summary { totalRevenue: number; currentTarget: number; closedCount: number; }
interface RevenueData { months: RevenueMonth[]; summary: Summary; }

export function RevenueGoal() {
  const [data, setData] = useState<RevenueData | null>(null);

  useEffect(() => {
    fetch("/api/revenue")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="rounded-xl p-5 border h-full" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
          Cargando meta...
        </div>
      </div>
    );
  }

  const months = data.months ?? [];
  const current = months[months.length - 1];
  const pct = current && current.target > 0
    ? Math.min(100, Math.round((current.revenue / current.target) * 100))
    : 0;
  const maxBar = Math.max(...months.map(m => Math.max(m.revenue, m.target)), 1);

  const barColor = pct >= 100 ? "#22c55e" : pct >= 60 ? "var(--primary)" : "#f97316";

  return (
    <div className="rounded-xl p-5 border h-full" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>Meta Mensual</h3>
        <span style={{
          fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
          background: pct >= 100 ? "rgba(34,197,94,0.12)" : "rgba(209,156,21,0.12)",
          color: pct >= 100 ? "#22c55e" : "var(--primary)",
        }}>
          {pct}% completado
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 10, background: "var(--background)", borderRadius: 5, overflow: "hidden", marginBottom: 6 }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: 5,
            background: barColor, transition: "width 0.8s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
            {current ? formatCurrency(current.revenue) : "—"}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            meta {current ? formatCurrency(current.target) : "—"}
          </span>
        </div>
      </div>

      {/* Monthly bar chart */}
      {months.length > 1 && (
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>Histórico de ingresos</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 64 }}>
            {months.map((m, i) => {
              const isLast = i === months.length - 1;
              const h = Math.round((m.revenue / maxBar) * 100);
              const th = Math.round((m.target / maxBar) * 100);
              return (
                <div key={i} title={`${m.label}: ${formatCurrency(m.revenue)} / ${formatCurrency(m.target)}`}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: "100%", flex: 1, background: "var(--background)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                    {/* Target line */}
                    <div style={{
                      position: "absolute", bottom: `${th}%`, left: 0, right: 0,
                      height: 1, background: "var(--border)", opacity: 0.6,
                    }} />
                    {/* Revenue bar */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      height: `${Math.max(h, 2)}%`,
                      background: isLast ? barColor : `${barColor}55`,
                      borderRadius: 3,
                    }} />
                  </div>
                  <span style={{ fontSize: 9, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Deals cerrados</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{data.summary.closedCount}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Revenue total</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: "var(--primary)" }}>{formatCurrency(data.summary.totalRevenue)}</div>
        </div>
      </div>
    </div>
  );
}
