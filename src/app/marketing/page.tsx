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
import { MktPipelineView } from "@/components/marketing/mkt-pipeline-view";
import { MKT_THEME_VARS } from "@/components/marketing/mkt-utils";
import type { MktSection } from "@/components/marketing/mkt-types";

const SECTION_LABELS: Record<MktSection, string> = {
  engagement: "Engagement Board",
  icp: "ICP Scorer",
  "icp-insights": "ICP Insights",
  campaigns: "Campañas",
  contacts: "Contactos",
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
function MktBrevoLists() {
  const [lists, setLists] = useState<Array<{ id: number; name: string; uniqueSubscribers: number; totalBlacklisted: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/brevo/lists")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setLists(d.lists || []);
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>Cargando listas…</div>;
  if (error) return <div style={{ fontSize: 13, color: "#ef4444" }}>{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: 13, color: "var(--mkt-text-muted)", marginBottom: 4 }}>{lists.length} listas en Brevo</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {lists.map(list => (
          <div key={list.id} style={{
            padding: "14px 16px", borderRadius: 10, background: "var(--mkt-surface)",
            border: "1px solid var(--mkt-border)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 6 }}>{list.name}</div>
            <div style={{ fontSize: 12, color: "var(--mkt-text-muted)" }}>
              {list.uniqueSubscribers?.toLocaleString("es-CO")} suscriptores activos
            </div>
            {list.totalBlacklisted > 0 && (
              <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>
                {list.totalBlacklisted} bloqueados
              </div>
            )}
          </div>
        ))}
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
    fetch("/api/brevo/campaigns")
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
    const raw = c.statistics as any;
    const gs = raw?.globalStats ?? raw ?? {};
    return {
      sent:   acc.sent   + safeN(gs.sent   ?? gs.delivered),
      opens:  acc.opens  + safeN(gs.uniqueViews ?? gs.opened ?? gs.viewed),
      clicks: acc.clicks + safeN(gs.uniqueClicks ?? gs.clickers ?? gs.clicks),
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
                  const raw = c.statistics as any;
                  const gs = raw?.globalStats ?? raw ?? {};
                  const sent = safeN(gs.sent ?? gs.delivered);
                  const opens = safeN(gs.uniqueViews ?? gs.opened ?? gs.viewed);
                  const clicks = safeN(gs.uniqueClicks ?? gs.clickers ?? gs.clicks);
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

// ── Contacts tab ─────────────────────────────────────────────────────────────
function MktContacts() {
  const { contacts, syncing } = useMkt();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "brevo" | "apollo">("all");
  const [tierFilter, setTierFilter] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [sortBy, setSortBy] = useState<"score" | "tier" | "name" | "company" | "activity">("score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const filtered = contacts
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !search || c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q);
      const isBrevo = !!c.brevoId;
      const matchSource = sourceFilter === "all" || (sourceFilter === "brevo" ? isBrevo : !isBrevo);
      const matchTier = tierFilter === 0 || c.tier === tierFilter;
      return matchSearch && matchSource && matchTier;
    })
    .sort((a, b) => {
      let diff = 0;
      if (sortBy === "score") diff = a.score - b.score;
      else if (sortBy === "tier") diff = a.tier - b.tier;
      else if (sortBy === "name") diff = a.name.localeCompare(b.name);
      else if (sortBy === "company") diff = (a.company || "").localeCompare(b.company || "");
      else if (sortBy === "activity") diff = (a.lastActivity || 0) - (b.lastActivity || 0);
      return sortDir === "desc" ? -diff : diff;
    });

  const brevoCount = contacts.filter(c => !!c.brevoId).length;
  const apolloCount = contacts.length - brevoCount;
  const tierCounts = [1, 2, 3, 4].map(t => contacts.filter(c => c.tier === t).length);

  const cell: React.CSSProperties = { padding: "10px 12px", fontSize: 12, borderBottom: "1px solid var(--mkt-border)", verticalAlign: "middle" };
  const hcell: React.CSSProperties = { ...cell, fontSize: 11, color: "var(--mkt-text-muted)", fontWeight: 600, background: "var(--mkt-surface)" };
  const btn = (active: boolean): React.CSSProperties => ({
    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "1px solid var(--mkt-border)",
    background: active ? "var(--mkt-accent)" : "transparent", color: active ? "#0a0a0a" : "var(--mkt-text-muted)",
  });

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, height: "100%", overflow: "auto" }}>
      {/* Summary */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "Total", value: contacts.length },
          { label: "Brevo", value: brevoCount },
          { label: "Solo Apollo", value: apolloCount },
          ...tierCounts.map((n, i) => ({ label: `T${i + 1}`, value: n })),
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: "8px 14px", borderRadius: 8, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", fontSize: 12 }}>
            <span style={{ color: "var(--mkt-text-muted)" }}>{label} </span>
            <span style={{ fontWeight: 700 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--mkt-text-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre, email, empresa…" style={{ width: "100%", paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, borderRadius: 7, border: "1px solid var(--mkt-border)", background: "var(--mkt-surface)", color: "var(--mkt-text)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
        </div>
        {(["all", "brevo", "apollo"] as const).map(s => (
          <button key={s} style={btn(sourceFilter === s)} onClick={() => setSourceFilter(s)}>
            {s === "all" ? "Todos" : s === "brevo" ? "Brevo" : "Solo Apollo"}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: "var(--mkt-border)" }} />
        {([0, 1, 2, 3, 4] as const).map(t => (
          <button key={t} style={btn(tierFilter === t)} onClick={() => setTierFilter(t)}>
            {t === 0 ? "Todos Tiers" : `T${t}`}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: "var(--mkt-border)" }} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ padding: "4px 8px", borderRadius: 7, border: "1px solid var(--mkt-border)", background: "var(--mkt-surface)", color: "var(--mkt-text)", fontSize: 11, cursor: "pointer" }}>
          <option value="score">Score ICP</option>
          <option value="tier">Tier</option>
          <option value="name">Nombre</option>
          <option value="company">Empresa</option>
          <option value="activity">Última actividad</option>
        </select>
        <button style={btn(false)} onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>{sortDir === "desc" ? "↓" : "↑"}</button>
        <button disabled title="Próximamente: sincronizar contactos desde Apollo CSV" style={{ ...btn(false), display: "inline-flex", alignItems: "center", gap: 5, opacity: 0.35, cursor: "not-allowed" }}>
          <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Sincronizar Apollo CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto", borderRadius: 10, border: "1px solid var(--mkt-border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["#", "Nombre", "Empresa", "Industria", "Cargo", "Ubicación", "Score", "Fuente", "Tier"].map(h => (
                <th key={h} style={hcell}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ ...cell, textAlign: "center", color: "var(--mkt-text-muted)", padding: "32px 0" }}>Sin resultados</td></tr>
            ) : filtered.map((c, i) => {
              const isBrevo = !!c.brevoId;
              return (
                <tr key={c.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--mkt-surface)" }}>
                  <td style={{ ...cell, color: "var(--mkt-text-muted)", width: 32 }}>{i + 1}</td>
                  <td style={cell}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{c.email || "—"}</div>
                  </td>
                  <td style={cell}>{c.company || "—"}</td>
                  <td style={cell}>{c.industry || "—"}</td>
                  <td style={cell}>{c.jobTitle || "—"}</td>
                  <td style={cell}>{c.location || "—"}</td>
                  <td style={cell}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 52, height: 5, borderRadius: 3, background: "var(--mkt-border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: "var(--mkt-accent)", width: `${Math.min(c.score, 100)}%` }} />
                      </div>
                      <span style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{c.score}</span>
                    </div>
                  </td>
                  <td style={cell}>
                    <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: isBrevo ? "#3b82f620" : "#8b5cf620", color: isBrevo ? "#3b82f6" : "#8b5cf6" }}>
                      {isBrevo ? "Brevo" : "Apollo"}
                    </span>
                  </td>
                  <td style={cell}>
                    {c.tier ? (
                      <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "var(--mkt-accent)20", color: "var(--mkt-accent)" }}>T{c.tier}</span>
                    ) : <span style={{ color: "var(--mkt-text-muted)", fontSize: 11 }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{filtered.length} de {contacts.length} contactos</div>
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
      case "contacts": return <MktContacts />;
      case "segments":
      case "segment-health": return <MktSegmentHealth />;
      case "attribution": return <MktAttributionDashboard />;
      case "handoff": return <MktHandoffCenter />;
      case "lists": return <MktBrevoLists />;
      case "mkt-analytics": return <MktBrevoAnalytics />;
      case "pipeline-view": return <MktPipelineView />;
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
