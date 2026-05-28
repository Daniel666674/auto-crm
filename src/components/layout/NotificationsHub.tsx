"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, AlertCircle, Clock, RefreshCw, TrendingUp, Zap, CheckCheck, Trophy, MailOpen, Calendar, ArrowRightLeft, Send } from "lucide-react";
import Link from "next/link";
import type { HubItem } from "@/app/api/notifications-hub/route";

const TYPE_ICON: Record<string, React.ReactNode> = {
  overdue_followup:   <Clock size={13} />,
  stalled_deal:       <AlertCircle size={13} />,
  renewal_soon:       <RefreshCw size={13} />,
  proposal_waiting:   <TrendingUp size={13} />,
  hot_lead:           <Zap size={13} />,
  lead_hot:           <Zap size={13} />,
  deal_won:           <Trophy size={13} />,
  deal_lost:          <AlertCircle size={13} />,
  deal_stage_changed: <ArrowRightLeft size={13} />,
  email_reply:        <MailOpen size={13} />,
  meeting_booked:     <Calendar size={13} />,
  lifecycle_mql:      <TrendingUp size={13} />,
  lifecycle_sql:      <TrendingUp size={13} />,
  mkt_handoff:        <ArrowRightLeft size={13} />,
  campaign_sent:      <Send size={13} />,
  campaign_completed: <Send size={13} />,
  automation:         <Zap size={13} />,
  system:             <AlertCircle size={13} />,
};

const PRIORITY_COLOR: Record<string, string> = {
  high:   "#ef4444",
  medium: "#f59e0b",
  low:    "#3b82f6",
};

export function NotificationsHub() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HubItem[]>([]);
  const [count, setCount] = useState(0);
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

  // Fetch count on mount (silent)
  useEffect(() => {
    fetchHub(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchHub(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/notifications-hub");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setCount(data.count || 0);
        setLastFetch(Date.now());
      }
    } catch { /* ignore */ }
    if (!silent) setLoading(false);
  }

  const handleOpen = () => {
    const wasOpen = open;
    setOpen(!open);
    if (!wasOpen && Date.now() - lastFetch > 30000) {
      fetchHub();
    }
  };

  const persistentIds = items.filter(i => i.persistent).map(i => i.id);

  async function markAllRead() {
    if (persistentIds.length === 0) return;
    try {
      await fetch("/api/notifications-hub/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: persistentIds }),
      });
      await fetchHub();
    } catch { /* ignore */ }
  }

  async function markOneRead(id: string) {
    try {
      await fetch("/api/notifications-hub/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch { /* ignore */ }
  }

  const highCount = items.filter(i => i.priority === "high").length;
  const badgeCount = count > 0 ? count : 0;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        style={{
          position: "relative", padding: "6px 8px", borderRadius: 8,
          border: "none", background: "transparent", cursor: "pointer",
          color: "var(--foreground)", display: "flex", alignItems: "center",
        }}
        title="Notificaciones"
      >
        <Bell size={18} />
        {badgeCount > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: 8,
            background: highCount > 0 ? "#ef4444" : "#f59e0b",
            color: "#fff", fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1, padding: "0 3px",
          }}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          width: 360, background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
          zIndex: 100, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Alertas del sistema</div>
            <div style={{ display: "flex", gap: 4 }}>
              {persistentIds.length > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                  title="Marcar todas como leídas"
                >
                  <CheckCheck size={13} /> Marcar leídas
                </button>
              )}
              <button
                onClick={() => fetchHub()}
                disabled={loading}
                style={{ padding: 4, borderRadius: 6, border: "none", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", opacity: loading ? 0.5 : 1 }}
                title="Actualizar"
              >
                <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              </button>
            </div>
          </div>

          {/* Items */}
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {loading && items.length === 0 && (
              <div style={{ padding: "24px", textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>
                Cargando…
              </div>
            )}
            {!loading && items.length === 0 && (
              <div style={{ padding: "32px 24px", textAlign: "center" }}>
                <Bell size={24} style={{ color: "var(--muted-foreground)", margin: "0 auto 8px" }} />
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Sin alertas activas</div>
              </div>
            )}
            {items.map(item => (
              <Link
                key={item.id}
                href={item.link}
                onClick={() => {
                  setOpen(false);
                  if (item.persistent) markOneRead(item.id);
                }}
                style={{ textDecoration: "none", display: "block" }}
              >
                <div style={{
                  padding: "12px 16px", borderBottom: "1px solid var(--border)",
                  display: "flex", gap: 10, alignItems: "flex-start",
                  transition: "background 0.12s",
                  cursor: "pointer",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: `${PRIORITY_COLOR[item.priority]}15`,
                    color: PRIORITY_COLOR[item.priority],
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {TYPE_ICON[item.type] || <AlertCircle size={13} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 2 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.body}
                    </div>
                  </div>
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 4,
                    background: PRIORITY_COLOR[item.priority],
                  }} />
                </div>
              </Link>
            ))}
          </div>

          {items.length > 0 && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
              {highCount > 0 && <span style={{ color: "#ef4444", fontWeight: 600 }}>{highCount} alta{highCount !== 1 ? "s" : ""} prioridad · </span>}
              {items.length} alerta{items.length !== 1 ? "s" : ""} en total
            </div>
          )}
        </div>
      )}
    </div>
  );
}
