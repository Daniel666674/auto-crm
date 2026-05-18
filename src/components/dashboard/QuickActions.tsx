"use client";

import Link from "next/link";
import { UserPlus, Briefcase, Phone, Calendar } from "lucide-react";

const ACTIONS = [
  { label: "Nuevo Lead", icon: UserPlus, href: "/contacts/new", color: "#3b82f6" },
  { label: "Nuevo Deal", icon: Briefcase, href: "/deals", color: "#22c55e" },
  { label: "Log Actividad", icon: Phone, href: "/contacts", color: "#f97316" },
  { label: "Follow-up", icon: Calendar, href: "/contacts?filter=hot", color: "#a855f7" },
] as const;

export function QuickActions({ date }: { date: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>Dashboard</h2>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{date}</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ACTIONS.map(({ label, icon: Icon, href, color }) => (
          <Link key={label} href={href} style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 14px", borderRadius: "var(--radius)",
              border: `1px solid ${color}35`, background: `${color}10`,
              color, fontSize: 12, fontWeight: 500, cursor: "pointer",
              whiteSpace: "nowrap", transition: "opacity 0.15s",
            }}>
              <Icon style={{ width: 14, height: 14 }} />
              {label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
