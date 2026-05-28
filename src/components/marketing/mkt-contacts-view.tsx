"use client";

import React, { useState, useCallback, useEffect } from "react";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import type { Contact } from "@/types";

type ViewMode = "active" | "returned" | "all";

const LIFECYCLE_STAGES = [
  { id: "subscriber", label: "Suscriptor", color: "#94a3b8" },
  { id: "lead",       label: "Lead",        color: "#60a5fa" },
  { id: "MQL",        label: "MQL",         color: "#a78bfa" },
  { id: "SQL",        label: "SQL",         color: "#f59e0b" },
  { id: "opportunity",label: "Oportunidad", color: "#f97316" },
  { id: "customer",   label: "Cliente",     color: "#22c55e" },
  { id: "evangelist", label: "Evangelista", color: "#ec4899" },
];

// CSS variable aliases: ContactsTable uses --primary/--card/--border/--foreground/--muted-foreground
// We override them here so ContactsTable adopts the marketing theme automatically.
const MKT_VAR_OVERRIDES: React.CSSProperties = {
  "--primary": "var(--mkt-accent)",
  "--primary-foreground": "#0a0a0a",
  "--card": "var(--mkt-surface)",
  "--border": "var(--mkt-border)",
  "--foreground": "var(--mkt-text)",
  "--muted-foreground": "var(--mkt-text-muted)",
  "--background": "var(--mkt-bg)",
} as React.CSSProperties;

export function MktContactsView() {
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [lifecycleStats, setLifecycleStats] = useState<Record<string, number>>({});
  const [activeLifecycle, setActiveLifecycle] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts?includeReturned=true`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await res.json().then((d) => (Array.isArray(d) ? d : []));
      const hasReturned = (c: { returnedToMarketingAt?: unknown }) => !!c.returnedToMarketingAt;
      let list: Contact[];
      if (viewMode === "active") {
        list = data.filter(c => !hasReturned(c)) as Contact[];
      } else if (viewMode === "returned") {
        list = data.filter(c => hasReturned(c)) as Contact[];
      } else {
        list = data as Contact[];
      }
      setContacts(list);
      // Lifecycle stats from active contacts only
      const active = data.filter(c => !hasReturned(c));
      const stats: Record<string, number> = {};
      for (const s of LIFECYCLE_STAGES) stats[s.id] = 0;
      for (const c of active) {
        const stage = (c.lifecycleStage as string) ?? "lead";
        if (stats[stage] !== undefined) stats[stage]++;
        else stats[stage] = 1;
      }
      setLifecycleStats(stats);
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => { load(); }, [load]);

  async function bulkHandoff(ids: string[], clearSelection: () => void) {
    if (!ids.length || bulkLoading) return;
    setBulkLoading(true);
    const contactMap = new Map(contacts.map(c => [c.id, c]));
    await Promise.all(ids.map(id => {
      const c = contactMap.get(id);
      if (!c) return Promise.resolve();
      return fetch("/api/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: c.name, email: c.email, company: c.company, score: c.score }),
      });
    }));
    setBulkLoading(false);
    clearSelection();
    load();
  }

  async function bulkReturn(ids: string[], clearSelection: () => void) {
    if (!ids.length || bulkLoading) return;
    setBulkLoading(true);
    await Promise.all(ids.map(id =>
      fetch("/api/return-to-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: id, reason: "Devuelto manualmente desde módulo de Marketing" }),
      })
    ));
    setBulkLoading(false);
    clearSelection();
    load();
  }

  const btn = (active: boolean): React.CSSProperties => ({
    padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
    border: "1px solid var(--mkt-border)",
    background: active ? "var(--mkt-accent)" : "transparent",
    color: active ? "#0a0a0a" : "var(--mkt-text-muted)",
    transition: "all 0.12s",
  });

  const totalActive = Object.values(lifecycleStats).reduce((s, v) => s + v, 0);
  const displayContacts = activeLifecycle
    ? contacts.filter(c => (c.lifecycleStage ?? "lead") === activeLifecycle)
    : contacts;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Lifecycle funnel strip — each tab is a clickable filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {LIFECYCLE_STAGES.map(s => {
          const active = activeLifecycle === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveLifecycle(prev => prev === s.id ? "" : s.id)}
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", outline: "none",
                background: active ? `${s.color}22` : "var(--mkt-surface)",
                border: `1px solid ${active ? s.color : s.color + "30"}`,
                transition: "all 0.12s",
              }}
            >
              <span style={{ color: s.color, fontWeight: 700 }}>{s.label} </span>
              <span style={{ color: "var(--mkt-text-muted)" }}>{lifecycleStats[s.id] ?? 0}</span>
            </button>
          );
        })}
        <button
          onClick={() => setActiveLifecycle("")}
          style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", outline: "none",
            background: !activeLifecycle ? "rgba(255,255,255,0.08)" : "var(--mkt-surface)",
            border: `1px solid ${!activeLifecycle ? "var(--mkt-text-muted)" : "var(--mkt-border)"}`,
            transition: "all 0.12s",
          }}
        >
          <span style={{ color: "var(--mkt-text-muted)" }}>Total activos </span>
          <span style={{ fontWeight: 700, color: "var(--mkt-text)" }}>{totalActive}</span>
        </button>
      </div>

      {/* View mode toggle */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>Vista:</span>
        {([["active", "Activos"], ["returned", "Devueltos a Marketing"], ["all", "Todos"]] as const).map(([m, l]) => (
          <button key={m} style={btn(viewMode === m)} onClick={() => setViewMode(m)}>{l}</button>
        ))}
        <div style={{ flex: 1 }} />
        {loading && <span style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>Cargando…</span>}
      </div>

      {/* ContactsTable with marketing CSS vars injected */}
      <div style={MKT_VAR_OVERRIDES}>
        {loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--mkt-text-muted)" }}>
            Cargando contactos…
          </div>
        ) : (
          <ContactsTable
            contacts={displayContacts}
            onRefresh={load}
            renderBulkActions={(ids, clearSelection) => (
              <>
                <div style={{ width: 1, height: 18, background: "var(--mkt-border)" }} />
                <button
                  disabled={bulkLoading}
                  onClick={() => bulkHandoff(ids, clearSelection)}
                  style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid #22c55e", background: "transparent", color: "#22c55e", cursor: bulkLoading ? "not-allowed" : "pointer", opacity: bulkLoading ? 0.5 : 1, whiteSpace: "nowrap" }}
                >
                  {bulkLoading ? "…" : "↗ Enviar a Sales"}
                </button>
                {viewMode !== "returned" && (
                  <button
                    disabled={bulkLoading}
                    onClick={() => bulkReturn(ids, clearSelection)}
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid #a78bfa", background: "transparent", color: "#a78bfa", cursor: bulkLoading ? "not-allowed" : "pointer", opacity: bulkLoading ? 0.5 : 1, whiteSpace: "nowrap" }}
                  >
                    {bulkLoading ? "…" : "↩ Devolver a Mkt"}
                  </button>
                )}
              </>
            )}
          />
        )}
      </div>
    </div>
  );
}
