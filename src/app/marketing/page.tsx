"use client";

import React, { useState, useEffect } from "react";
import { MktProvider, useMkt } from "@/components/marketing/mkt-provider";
import { MktSidebar } from "@/components/marketing/mkt-sidebar";
import { MktEngagementBoard } from "@/components/marketing/mkt-engagement-board";
import { MktIcpScorer } from "@/components/marketing/mkt-icp-scorer";
import { MktCampaignWall } from "@/components/marketing/mkt-campaign-wall";
import { MktSegmentHealth } from "@/components/marketing/mkt-segment-health";
import { MktAttributionDashboard } from "@/components/marketing/mkt-attribution";
import { MktHandoffCenter } from "@/components/marketing/mkt-handoff-center";
import { MKT_THEME_VARS } from "@/components/marketing/mkt-utils";
import type { MktSection } from "@/components/marketing/mkt-types";

const SECTION_LABELS: Record<MktSection, string> = {
  engagement: "Engagement Board",
  icp: "ICP Scorer",
  "icp-insights": "ICP Insights",
  campaigns: "Campañas",
  segments: "Segment Health",
  "segment-health": "Segment Health",
  attribution: "Atribución",
  handoff: "Handoff Center",
  lists: "Listas Brevo",
  "pipeline-view": "Vista Pipeline",
  "lead-velocity": "Lead Velocity",
  "mkt-analytics": "Analytics",
  calendar: "Calendario",
  abm: "ABM Board",
  digest: "Digest Semanal",
  roi: "ROI",
  export: "Exportar",
  integrations: "Integraciones",
} as Record<MktSection, string>;

// ── Listas Brevo ─────────────────────────────────────────────────────────────
interface BrevoListRow {
  id: number | string;
  name: string;
  contactCount: number;
  lastSync: string;
  healthRate: number;
  cadenceName: string;
}

function MktBrevoLists() {
  const [lists, setLists] = useState<BrevoListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", contactCount: "", lastSync: "", healthRate: "", cadenceName: "" });

  const today = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

  useEffect(() => {
    fetch("/app/api/brevo/lists")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        const raw: Array<{ id: number; name: string; uniqueSubscribers: number; totalBlacklisted: number }> = d.lists || [];
        setLists(raw.map(l => ({
          id: l.id,
          name: l.name,
          contactCount: l.uniqueSubscribers ?? 0,
          lastSync: today,
          healthRate: Math.round((l.uniqueSubscribers ?? 0) / Math.max((l.uniqueSubscribers ?? 0) + (l.totalBlacklisted ?? 0), 1) * 100),
          cadenceName: "—",
        })));
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (id: number | string, field: keyof BrevoListRow, val: string | number) =>
    setLists(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));

  const addList = () => {
    setLists(prev => [{
      id: `local-${Date.now()}`,
      name: form.name,
      contactCount: Number(form.contactCount) || 0,
      lastSync: form.lastSync || today,
      healthRate: Number(form.healthRate) || 100,
      cadenceName: form.cadenceName || "—",
    }, ...prev]);
    setForm({ name: "", contactCount: "", lastSync: "", healthRate: "", cadenceName: "" });
    setShowAdd(false);
  };

  const healthColor = (r: number) => r >= 80 ? "#22c55e" : r >= 60 ? "#f59e0b" : "#ef4444";

  if (loading) return <div style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>Cargando listas…</div>;
  if (error) return <div style={{ fontSize: 13, color: "#ef4444" }}>{error}</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--mkt-text)" }}>Listas Brevo</h2>
          <p style={{ fontSize: 13, color: "var(--mkt-text-muted)", marginTop: 4 }}>Estado de listas · sincronización y salud de emails</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          padding: "9px 18px", borderRadius: 8, border: "none",
          background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ Nueva lista</button>
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 440, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "var(--mkt-text)" }}>Nueva Lista Brevo</div>
            {([["name","Nombre"],["contactCount","Nº contactos"],["healthRate","Health rate (%)"],["cadenceName","Cadencia activa"]] as [string,string][]).map(([k, l]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "var(--mkt-text-muted)", display: "block", marginBottom: 5 }}>{l}</label>
                <input value={(form as Record<string, string>)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 13 }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={addList} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--mkt-border)" }}>
              {["Lista", "Contactos", "Último sync", "Health %", "Cadencia activa"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: "var(--mkt-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lists.map(l => (
              <tr key={l.id} style={{ borderBottom: "1px solid var(--mkt-border)" }}>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--mkt-text)" }}>{l.name}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--mkt-text)" }}>{l.contactCount.toLocaleString("es-CO")}</td>
                <td style={{ padding: "12px 16px" }}>
                  {editing === `sync-${l.id}`
                    ? <input defaultValue={l.lastSync} onBlur={e => { updateField(l.id, "lastSync", e.target.value); setEditing(null); }} autoFocus
                        style={{ width: 110, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 12 }} />
                    : <span onClick={() => setEditing(`sync-${l.id}`)} style={{ fontSize: 12, color: "var(--mkt-text-muted)", cursor: "pointer" }}>{l.lastSync} ✎</span>
                  }
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {editing === `hr-${l.id}`
                    ? <input type="number" defaultValue={l.healthRate} onBlur={e => { updateField(l.id, "healthRate", Number(e.target.value)); setEditing(null); }} autoFocus
                        style={{ width: 60, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)", color: "var(--mkt-text)", fontSize: 12 }} />
                    : <span onClick={() => setEditing(`hr-${l.id}`)} style={{ fontSize: 13, fontWeight: 700, color: healthColor(l.healthRate), cursor: "pointer" }}>{l.healthRate}% ✎</span>
                  }
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--mkt-text-muted)" }}>{l.cadenceName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Marketing Analytics (Brevo only) ────────────────────────────────────────
function MktBrevoAnalytics() {
  const [campaigns, setCampaigns] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/app/api/brevo/campaigns")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setCampaigns(d.campaigns || []);
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, []);

  const safeN = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

  const totals = campaigns.reduce((acc, c) => {
    const gs = (c.statistics as Record<string, unknown>)?.globalStats as Record<string, unknown> | undefined;
    return {
      sent: acc.sent + safeN(gs?.sent ?? c.statistics),
      opens: acc.opens + safeN(gs?.uniqueOpens),
      clicks: acc.clicks + safeN(gs?.uniqueClicks),
    };
  }, { sent: 0, opens: 0, clicks: 0 });

  const avgOpenRate = totals.sent > 0 ? ((totals.opens / totals.sent) * 100).toFixed(1) : "—";
  const avgClickRate = totals.sent > 0 ? ((totals.clicks / totals.sent) * 100).toFixed(1) : "—";

  const kpis = [
    { label: "Campañas", value: campaigns.length, suffix: "" },
    { label: "Total enviados", value: totals.sent.toLocaleString("es-CO"), suffix: "" },
    { label: "Open Rate promedio", value: avgOpenRate, suffix: "%" },
    { label: "Click Rate promedio", value: avgClickRate, suffix: "%" },
  ];

  const disabledChannels = [
    { label: "Google Analytics", reason: "API no conectada" },
    { label: "Meta Ads", reason: "API no conectada" },
    { label: "LinkedIn Ads", reason: "API no conectada" },
  ];

  if (loading) return <div style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>Cargando estadísticas…</div>;
  if (error) return <div style={{ fontSize: 13, color: "#ef4444" }}>{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ padding: "14px 16px", borderRadius: 10, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--mkt-text)" }}>{k.value}{k.suffix}</div>
            <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Per-campaign table */}
      {campaigns.length > 0 && (
        <div style={{ background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--mkt-border)", fontSize: 12, fontWeight: 600, color: "var(--mkt-text)" }}>
            Detalle por campaña — Brevo
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "var(--mkt-text-muted)" }}>
                  {["Nombre", "Estado", "Enviados", "Abiertos", "Clicks", "Open%", "Click%"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--mkt-border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => {
                  const gs = (c.statistics as Record<string, unknown>)?.globalStats as Record<string, unknown> | undefined;
                  const sent = safeN(gs?.sent);
                  const opens = safeN(gs?.uniqueOpens);
                  const clicks = safeN(gs?.uniqueClicks);
                  const openPct = sent > 0 ? ((opens / sent) * 100).toFixed(1) : "—";
                  const clickPct = sent > 0 ? ((clicks / sent) * 100).toFixed(1) : "—";
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--mkt-border)" }}>
                      <td style={{ padding: "8px 12px", color: "var(--mkt-text)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(c.name)}</td>
                      <td style={{ padding: "8px 12px", color: "var(--mkt-text-muted)" }}>{String(c.status)}</td>
                      <td style={{ padding: "8px 12px", color: "var(--mkt-text)" }}>{sent.toLocaleString("es-CO")}</td>
                      <td style={{ padding: "8px 12px", color: "var(--mkt-text)" }}>{opens.toLocaleString("es-CO")}</td>
                      <td style={{ padding: "8px 12px", color: "var(--mkt-text)" }}>{clicks.toLocaleString("es-CO")}</td>
                      <td style={{ padding: "8px 12px", color: Number(openPct) >= 20 ? "#22c55e" : Number(openPct) >= 10 ? "#f59e0b" : "var(--mkt-text-muted)" }}>{openPct}{openPct !== "—" ? "%" : ""}</td>
                      <td style={{ padding: "8px 12px", color: Number(clickPct) >= 5 ? "#22c55e" : Number(clickPct) >= 2 ? "#f59e0b" : "var(--mkt-text-muted)" }}>{clickPct}{clickPct !== "—" ? "%" : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disabled channel slots */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
        {disabledChannels.map(ch => (
          <div key={ch.label} style={{
            padding: "14px 16px", borderRadius: 10, opacity: 0.4,
            background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 4 }}>{ch.label}</div>
            <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{ch.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Generic placeholder ──────────────────────────────────────────────────────
function MktPlaceholder({ label }: { label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "40vh", flexDirection: "column", gap: 8,
      color: "var(--mkt-text-muted)", fontSize: 14,
    }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12 }}>En desarrollo — próximamente.</div>
    </div>
  );
}

// ── Main content ─────────────────────────────────────────────────────────────
function MarketingContent() {
  const [section, setSection] = useState<MktSection>("engagement");
  const { notifications, loading, contacts } = useMkt();
  const lastNotification = notifications[notifications.length - 1];

  const renderSection = () => {
    if (loading) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh" }}>
          <div style={{ fontSize: 14, color: "var(--mkt-text-muted)" }}>Cargando datos de marketing…</div>
        </div>
      );
    }
    switch (section) {
      case "engagement": return <MktEngagementBoard />;
      case "icp":
      case "icp-insights": return <MktIcpScorer />;
      case "campaigns": return <MktCampaignWall />;
      case "segments":
      case "segment-health": return <MktSegmentHealth />;
      case "attribution": return <MktAttributionDashboard />;
      case "handoff": return <MktHandoffCenter />;
      case "lists": return <MktBrevoLists />;
      case "mkt-analytics": return <MktBrevoAnalytics />;
      case "pipeline-view": return <MktPlaceholder label="Vista Pipeline" />;
      case "lead-velocity": return <MktPlaceholder label="Lead Velocity" />;
      case "calendar": return <MktPlaceholder label="Calendario" />;
      case "abm": return <MktPlaceholder label="ABM Board" />;
      case "digest": return <MktPlaceholder label="Digest Semanal" />;
      case "roi": return <MktPlaceholder label="ROI" />;
      case "export": return <MktPlaceholder label="Exportar" />;
      case "integrations": return <MktPlaceholder label="Integraciones" />;
    }
  };

  return (
    <div
      style={{
        ...MKT_THEME_VARS,
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", background: "var(--mkt-bg)",
        fontFamily: "'Inter', -apple-system, sans-serif",
        overflow: "hidden",
      } as React.CSSProperties}
    >
      <MktSidebar current={section} onNavigate={setSection} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <header style={{
          height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", borderBottom: "1px solid var(--mkt-border)",
          background: "var(--mkt-surface)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--mkt-text)", margin: 0 }}>
              {SECTION_LABELS[section] ?? section}
            </h1>
            {!loading && contacts.length > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                background: "rgba(255,255,255,0.05)", color: "var(--mkt-text-muted)",
              }}>
                {contacts.length} contactos
              </span>
            )}
          </div>
          {lastNotification && (
            <div style={{ fontSize: 12, color: "var(--mkt-accent)", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--mkt-accent)" }} />
              {lastNotification.text}
            </div>
          )}
        </header>

        {/* Empty state */}
        {!loading && contacts.length === 0 && (
          <div style={{
            padding: "16px 24px", background: "rgba(209,156,21,0.05)",
            borderBottom: "1px solid rgba(209,156,21,0.15)",
            fontSize: 12, color: "var(--mkt-text-muted)",
          }}>
            No hay contactos. Usa el botón <strong style={{ color: "var(--mkt-accent)" }}>Sincronizar Brevo</strong> en el panel izquierdo para importar los contactos reales.
          </div>
        )}

        {/* Main */}
        <main style={{ flex: 1, padding: 24, overflowY: "auto", color: "var(--mkt-text)" }}>
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <MktProvider>
      <MarketingContent />
    </MktProvider>
  );
}
