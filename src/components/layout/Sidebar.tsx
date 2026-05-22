"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: string[];
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4", roles: ["sales", "marketing", "superadmin"] },
      { href: "/ms-command", label: "Command Center", icon: "M3 3v18h18M7 12l4-4 4 4 4-4", roles: ["sales", "marketing", "superadmin"] },
      { href: "/pipeline", label: "Pipeline", icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2", roles: ["sales", "superadmin"] },
      { href: "/contacts", label: "Contactos", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", roles: ["sales", "marketing", "superadmin"] },
      { href: "/deals", label: "Deals", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", roles: ["sales", "superadmin"] },
      { href: "/activities", label: "Actividades", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", roles: ["sales", "marketing", "superadmin"] },
      { href: "/calendar", label: "Calendario", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", roles: ["sales", "marketing", "superadmin"] },
    ],
  },
  {
    label: "Revenue Intelligence",
    items: [
      { href: "/forecast", label: "Forecast", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", roles: ["sales", "superadmin"] },
      { href: "/revenue-intelligence", label: "Revenue Intel", icon: "M3 3v18h18M7 14l4-4 4 4 6-6", roles: ["sales", "superadmin", "marketing"] },
      { href: "/deal-intelligence", label: "Deal Intelligence", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", roles: ["sales", "superadmin"] },
      { href: "/win-loss", label: "Win / Loss", icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z", roles: ["sales", "superadmin"] },
    ],
  },
  {
    label: "Prospecting Engine",
    items: [
      { href: "/icp-scorer", label: "ICP Scorer", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", roles: ["sales", "superadmin"] },
      { href: "/sequences", label: "Secuencias", icon: "M4 6h16M4 10h16M4 14h16M4 18h16", roles: ["sales", "superadmin"] },
      { href: "/campaigns", label: "Campañas Email", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", roles: ["sales", "superadmin"] },
      { href: "/radar", label: "Radar", icon: "M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0", roles: ["sales", "superadmin"] },
    ],
  },
  {
    label: "Account Management",
    items: [
      { href: "/clients", label: "Clientes", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", roles: ["sales", "superadmin"] },
      { href: "/renewals", label: "Renovaciones", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", roles: ["sales", "superadmin"] },
      { href: "/deliverables", label: "Entregables", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", roles: ["sales", "superadmin"] },
    ],
  },
  {
    label: "Propuestas & Precios",
    items: [
      { href: "/proposals", label: "Propuestas", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", roles: ["sales", "superadmin"] },
      { href: "/calculator", label: "Calculadora", icon: "M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M16 5a2 2 0 114 0v1a1 1 0 01-1 1h-2a1 1 0 01-1-1V5zM12 12h4m-4 4h2", roles: ["sales", "superadmin"] },
    ],
  },
  {
    label: "Reportes Internos",
    items: [
      { href: "/revenue", label: "Revenue", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", roles: ["sales", "superadmin"] },
      { href: "/metrics", label: "Métricas", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", roles: ["sales", "superadmin"] },
      { href: "/pipeline-health", label: "Pipeline Health", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", roles: ["sales", "superadmin"] },
    ],
  },
  {
    label: null,
    items: [
      { href: "/marketing", label: "Marketing", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", roles: ["marketing", "superadmin"] },
      { href: "/analytics", label: "Analytics", icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", roles: ["sales", "marketing", "superadmin"] },
      { href: "/settings", label: "Ajustes", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", roles: ["sales", "marketing", "superadmin"] },
    ],
  },
];

function SvgIcon({ path, size = 16 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {path.split(" M").map((seg, i) => (
        <path key={i} d={i === 0 ? seg : "M" + seg} />
      ))}
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const [apolloSyncing, setApolloSyncing] = useState(false);
  const [apolloMsg, setApolloMsg] = useState("");

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-[var(--sidebar-border)] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[var(--sidebar-primary)] flex items-center justify-center text-[var(--sidebar-primary-foreground)] font-bold text-sm">B</div>
        <span className="text-sm font-bold tracking-tight">BlackScale Nexus</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2.5">
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi} className={gi > 0 ? "mt-1" : ""}>
              {group.label && (
                <div className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-[var(--sidebar-foreground)]/40">
                  {group.label}
                </div>
              )}
              {visibleItems.map(item => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-[12.5px] font-medium transition-colors mb-px",
                      isActive
                        ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
                        : "text-[var(--sidebar-foreground)]/60 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                    )}
                  >
                    <SvgIcon path={item.icon} size={15} />
                    {item.label}
                  </Link>
                );
              })}
              {group.label && gi < NAV_GROUPS.length - 2 && (
                <div className="h-px bg-[var(--sidebar-border)] mx-3 mt-1.5" />
              )}
            </div>
          );
        })}
      </nav>

      {/* Apollo CSV Sync */}
      <div className="px-2 pt-1 border-t border-[var(--sidebar-border)]">
        <button
          disabled={apolloSyncing}
          onClick={async () => {
            setApolloSyncing(true);
            setApolloMsg("");
            try {
              const res = await fetch("/api/import-apollo", { method: "POST" });
              const data = await res.json();
              if (data.error) { setApolloMsg(`Error: ${data.error}`); return; }
              setApolloMsg(`✓ ${data.inserted} importados`);
              setTimeout(() => setApolloMsg(""), 4000);
            } catch {
              setApolloMsg("Error al importar");
            } finally {
              setApolloSyncing(false);
            }
          }}
          className="flex items-center gap-2 w-full rounded-md px-3 py-2.5 text-[11px] border border-[var(--sidebar-border)] bg-transparent hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] text-[var(--sidebar-foreground)]/50 transition-colors cursor-pointer disabled:cursor-wait"
        >
          <SvgIcon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" size={13} />
          {apolloSyncing ? "Importando…" : apolloMsg || "Sincronizar Apollo CSV"}
        </button>
      </div>

      {/* Profile + logout */}
      <div className="px-4 py-3 border-t border-[var(--sidebar-border)] space-y-2 mt-1">
        {session?.user && (
          <div className="px-1">
            <p className="text-xs font-medium text-[var(--sidebar-foreground)]/80 truncate">{session.user.email}</p>
            <p className="text-[10px] text-[var(--sidebar-foreground)]/40 capitalize">{role}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-[12px] text-[var(--sidebar-foreground)]/50 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors"
        >
          <SvgIcon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
