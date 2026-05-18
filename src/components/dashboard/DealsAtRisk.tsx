import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/constants";

export interface RiskDeal {
  id: string;
  title: string;
  value: number;
  contactName: string | null;
  stageName: string;
  daysSinceActivity: number;
}

function riskColor(days: number) {
  if (days >= 14) return "#ef4444";
  if (days >= 7) return "#f97316";
  return "#eab308";
}

export function DealsAtRisk({ deals }: { deals: RiskDeal[] }) {
  return (
    <div className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
        <AlertTriangle style={{ width: 14, height: 14, color: "#f97316" }} />
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>Deals en Riesgo</h3>
        {deals.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(249,115,22,0.12)", color: "#f97316", fontWeight: 600 }}>
            {deals.length}
          </span>
        )}
      </div>

      {deals.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: "24px 0" }}>
          Todos los deals tienen actividad reciente
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {deals.map((d, i) => {
            const color = riskColor(d.daysSinceActivity);
            return (
              <Link key={d.id} href={`/contacts`} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 0",
                  borderBottom: i < deals.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{
                    width: 6, height: 32, borderRadius: 3,
                    background: color, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {d.contactName} · {d.stageName}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                      {formatCurrency(d.value)}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color }}>
                      {d.daysSinceActivity}d sin actividad
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
