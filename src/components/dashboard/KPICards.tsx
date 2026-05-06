"use client";

import { Users, Briefcase, DollarSign, Flame } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import type { DashboardStats } from "@/types";

interface KPICardsProps {
  stats: DashboardStats;
}

const CARDS = [
  { title: "Total Contactos",  key: "totalContacts",      Icon: Users,     accent: "#3b82f6" },
  { title: "Deals Activos",    key: "activeDeals",        Icon: Briefcase, accent: "#22c55e" },
  { title: "Valor en Pipeline",key: "totalPipelineValue", Icon: DollarSign,accent: "#f97316" },
  { title: "Leads Calientes",  key: "hotLeads",           Icon: Flame,     accent: "#ef4444" },
] as const;

export function KPICards({ stats }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map(({ title, key, Icon, accent }) => {
        const raw = stats[key as keyof DashboardStats];
        const value = key === "totalPipelineValue" ? formatCurrency(raw as number) : String(raw);
        return (
          <div key={title} className="rounded-xl p-5 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                {title}
              </span>
              <div className="rounded-lg p-2 flex items-center justify-center" style={{ background: `${accent}18` }}>
                <Icon style={{ width: 16, height: 16, color: accent }} />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight">{value}</div>
          </div>
        );
      })}
    </div>
  );
}
