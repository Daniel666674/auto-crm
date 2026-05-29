"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { MktSection } from "./mkt-types";
import { useMkt } from "./mkt-provider";

interface NavItem {
  id: MktSection;
  label: string;
  path: string;
  badge?: number;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

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

interface MktSidebarProps {
  current: MktSection;
  onNavigate: (s: MktSection) => void;
}

export function MktSidebar({ current, onNavigate }: MktSidebarProps) {
  const { contacts, syncing, syncFromBrevo } = useMkt();
  const { data: session } = useSession();
  const readyCount = contacts.filter(c => c.readyForSales && !c.passedToSalesAt).length;
  const [syncMsg, setSyncMsg] = useState("");

  const NAV_GROUPS: NavGroup[] = [
    {
      label: null,
      items: [
        { id: "engagement", label: "Engagement Board", path: "M13 10V3L4 14h7v7l9-11h-7z" },
        { id: "campaigns", label: "Campañas", path: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
        { id: "attribution", label: "Atribución", path: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
        { id: "handoff", label: "Handoff Center", path: "M17 8l4 4m0 0l-4 4m4-4H3", badge: readyCount },
      ],
    },
    {
      label: "Audience Intelligence",
      items: [
        { id: "segment-health", label: "Segment Health", path: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" },
        { id: "icp-insights", label: "ICP Insights", path: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
        { id: "lists", label: "Listas Brevo", path: "M4 6h16M4 10h16M4 14h16M4 18h16" },
      ],
    },
    {
      label: "Pipeline Visibility",
      items: [
        { id: "pipeline-view", label: "Vista Pipeline", path: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" },
        { id: "lead-velocity", label: "Lead Velocity", path: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
      ],
    },
    {
      label: "Performance 360",
      items: [
        { id: "mkt-analytics", label: "Analytics", path: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
      ],
    },
    {
      label: "Content & Planning",
      items: [
        { id: "calendar", label: "Calendario", path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        { id: "abm", label: "ABM Board", path: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
      ],
    },
    {
      label: "Reportes",
      items: [
        { id: "digest", label: "Digest Semanal", path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
        { id: "roi", label: "ROI", path: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
        { id: "export", label: "Exportar", path: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
      ],
    },
    {
      label: null,
      items: [
        { id: "integrations", label: "Integraciones", path: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
        { id: "appearance", label: "Apariencia", path: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" },
      ],
    },
  ];

  const handleSync = async () => {
    setSyncMsg("Sincronizando…");
    try {
      const result = await syncFromBrevo();
      setSyncMsg(`✓ ${result.synced} contactos sincronizados`);
    } catch {
      setSyncMsg("Error al sincronizar");
    }
    setTimeout(() => setSyncMsg(""), 4000);
  };

  const userName = session?.user?.name || "Usuario";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const userRole = (session?.user as { role?: string })?.role === "superadmin" ? "Admin" : "Marketing";

  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: "var(--mkt-sidebar)",
      borderRight: "1px solid var(--mkt-border)", display: "flex",
      flexDirection: "column", flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        height: 64, display: "flex", alignItems: "center", gap: 10, padding: "0 20px",
        borderBottom: "1px solid var(--mkt-border)",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "var(--mkt-accent)", display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "#0a0a0a", fontWeight: 800, fontSize: 13,
        }}>M</div>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.02em", color: "var(--mkt-text)" }}>
          BlackScale Nexus
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: group.label ? 4 : 0 }}>
            {group.label && (
              <div style={{
                fontSize: 9, fontWeight: 700, color: "var(--mkt-text-muted)", textTransform: "uppercase",
                letterSpacing: "0.1em", padding: "10px 12px 5px", marginTop: gi > 0 ? 6 : 0,
              }}>
                {group.label}
              </div>
            )}
            {group.items.map(item => {
              const isActive = current === item.id;
              return (
                <button key={item.id} onClick={() => onNavigate(item.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "8px 12px",
                    borderRadius: 7, border: "none", cursor: "pointer", width: "100%",
                    textAlign: "left", fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                    transition: "all 0.12s",
                    background: isActive ? "var(--mkt-nav-active-bg)" : "transparent",
                    color: isActive ? "var(--mkt-nav-active-text)" : "var(--mkt-text-muted)",
                    position: "relative", marginBottom: 1,
                  }}>
                  <SvgIcon path={item.path} size={15} />
                  {item.label}
                  {item.badge != null && item.badge > 0 && (
                    <span style={{
                      position: "absolute", right: 10, minWidth: 16, height: 16, borderRadius: 8,
                      background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 9,
                      fontWeight: 700, display: "flex", alignItems: "center",
                      justifyContent: "center", padding: "0 3px",
                    }}>{item.badge}</span>
                  )}
                </button>
              );
            })}
            {group.label && gi < NAV_GROUPS.length - 2 && (
              <div style={{ height: 1, background: "var(--mkt-border)", margin: "6px 12px 0" }} />
            )}
          </div>
        ))}
      </nav>

      {/* Brevo Sync */}
      <div style={{ padding: "8px 8px 0", borderTop: "1px solid var(--mkt-border)" }}>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
            width: "100%", borderRadius: 8, border: "1px solid var(--mkt-border)",
            background: "transparent", cursor: syncing ? "wait" : "pointer",
            color: syncing ? "var(--mkt-accent)" : "var(--mkt-text-muted)",
            fontSize: 12, textAlign: "left", transition: "color 0.15s",
          }}
        >
          <SvgIcon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" size={14} />
          {syncing ? "Sincronizando…" : "Sincronizar Brevo"}
        </button>
        {syncMsg && (
          <p style={{ fontSize: 10, color: "var(--mkt-accent)", padding: "4px 12px", margin: 0 }}>
            {syncMsg}
          </p>
        )}
      </div>

      {/* Switch to CRM */}
      <div style={{ padding: "8px" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <button style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
            width: "100%", borderRadius: 8, border: "1px solid var(--mkt-border)",
            background: "transparent", color: "var(--mkt-text-muted)",
            fontSize: 12, cursor: "pointer", textAlign: "left",
          }}>
            <SvgIcon path="M10 19l-7-7m0 0l7-7m-7 7h18" size={14} />
            Ver Pipeline de Ventas
          </button>
        </Link>
      </div>

      {/* Profile */}
      <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--mkt-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={userName}
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--mkt-accent)", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#0a0a0a", fontWeight: 600, fontSize: 12,
            }}>{userInitials}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--mkt-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {userName}
            </div>
            <div style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{userRole}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
