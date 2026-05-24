"use client";

import React, { useEffect, useRef, useState } from "react";
import { Activity, Phone, Mail, Calendar, FileText, Clock, CheckCircle2 } from "lucide-react";

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  contactId: string | null;
  contactName: string | null;
  scheduledAt: number | null;
  completedAt: number | null;
  createdAt: number;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  call: <Phone size={13} />,
  llamada: <Phone size={13} />,
  email: <Mail size={13} />,
  meeting: <Calendar size={13} />,
  reunion: <Calendar size={13} />,
  note: <FileText size={13} />,
  nota: <FileText size={13} />,
  followup: <Clock size={13} />,
};

const TYPE_COLOR: Record<string, string> = {
  call: "#3b82f6", llamada: "#3b82f6",
  email: "#8b5cf6",
  meeting: "#22c55e", reunion: "#22c55e",
  note: "#f59e0b", nota: "#f59e0b",
  followup: "#ef4444",
};

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d}d`;
  return new Date(ts).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function MktActivityFeed() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activities");
      if (res.ok) {
        const data = await res.json();
        const rows: ActivityRow[] = (Array.isArray(data) ? data : []).slice(0, 40);
        const now = Date.now();
        setItems(rows);
        setTodayCount(rows.filter(a => now - a.createdAt < 86400000).length);
        setLastFetch(now);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchFeed(); }, []);

  const handleOpen = () => {
    const wasOpen = open;
    setOpen(!open);
    if (!wasOpen && Date.now() - lastFetch > 30000) fetchFeed();
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        title="Actividad reciente"
        style={{
          position: "relative", padding: "6px 8px", borderRadius: 8, border: "none",
          background: "transparent", cursor: "pointer", color: "var(--mkt-text-muted)",
          display: "flex", alignItems: "center",
        }}
      >
        <Activity size={18} />
        {todayCount > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8,
            background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: "0 3px",
          }}>{todayCount > 99 ? "99+" : todayCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)", width: 380,
          background: "var(--mkt-card)", border: "1px solid var(--mkt-border)", borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)", zIndex: 10002, overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--mkt-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text)" }}>Actividad reciente</div>
            <span style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{todayCount} hoy</span>
          </div>
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {loading && items.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--mkt-text-muted)" }}>Cargando…</div>
            )}
            {!loading && items.length === 0 && (
              <div style={{ padding: "32px 24px", textAlign: "center" }}>
                <Activity size={24} style={{ color: "var(--mkt-text-muted)", margin: "0 auto 8px" }} />
                <div style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>Sin actividad registrada</div>
              </div>
            )}
            {items.map(a => {
              const color = TYPE_COLOR[a.type] ?? "var(--mkt-accent)";
              const done = !!a.completedAt;
              return (
                <div key={a.id} style={{ padding: "11px 16px", borderBottom: "1px solid var(--mkt-border)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: `${color}1f`, color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {TYPE_ICON[a.type] ?? <Activity size={13} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--mkt-text)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {a.description}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                      {a.contactName && <span>{a.contactName}</span>}
                      {a.contactName && <span>·</span>}
                      <span>{relTime(a.createdAt)}</span>
                      {done && <CheckCircle2 size={11} style={{ color: "#22c55e" }} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
