"use client";

import { Users, Briefcase, TrendingUp, Flame, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/constants";

export interface EnhancedStats {
  totalContacts: number;
  activeDeals: number;
  totalPipelineValue: number;
  hotLeads: number;
  overdueCount: number;
  mtdRevenue: number;
  conversionRate: number;
  wonDealsValue: number;
}

const CARDS = [
  {
    title: "Pipeline Activo",
    key: "totalPipelineValue",
    Icon: TrendingUp,
    accent: "#f97316",
    format: "currency",
  },
  {
    title: "Ganado este Mes",
    key: "mtdRevenue",
    Icon: CheckCircle2,
    accent: "#22c55e",
    format: "currency",
  },
  {
    title: "Deals Activos",
    key: "activeDeals",
    Icon: Briefcase,
    accent: "#3b82f6",
    format: "number",
  },
  {
    title: "Leads Calientes",
    key: "hotLeads",
    Icon: Flame,
    accent: "#ef4444",
    format: "number",
  },
  {
    title: "Total Contactos",
    key: "totalContacts",
    Icon: Users,
    accent: "#8b5cf6",
    format: "number",
  },
  {
    title: "Tareas Vencidas",
    key: "overdueCount",
    Icon: AlertCircle,
    accent: "#f59e0b",
    format: "number",
    urgent: true,
  },
];

export function KPICards({ stats }: { stats: EnhancedStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {CARDS.map(({ title, key, Icon, accent, format, urgent }) => {
        const raw = stats[key as keyof EnhancedStats] as number;
        const value = format === "currency" ? formatCurrency(raw) : String(raw);
        const isAlert = !!urgent && raw > 0;
        return (
          <div
            key={title}
            className="rounded-xl p-4 border"
            style={{
              background: isAlert ? `${accent}10` : "var(--card)",
              borderColor: isAlert ? `${accent}50` : "var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <span
                style={{
                  fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: "0.06em", color: "var(--muted-foreground)",
                  lineHeight: 1.3,
                }}
              >
                {title}
              </span>
              <div
                style={{
                  borderRadius: 6, padding: 5,
                  background: `${accent}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon style={{ width: 13, height: 13, color: accent }} />
              </div>
            </div>
            <div
              style={{
                fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em",
                color: isAlert ? accent : "var(--foreground)",
              }}
            >
              {value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
