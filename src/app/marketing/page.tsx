"use client";

import React, { useState } from "react";
import { MktProvider, useMkt } from "@/components/marketing/mkt-provider";
import { MktSidebar } from "@/components/marketing/mkt-sidebar";
import { MktEngagementBoard } from "@/components/marketing/mkt-engagement-board";
import { MktIcpScorer } from "@/components/marketing/mkt-icp-scorer";
import { MktCampaignWall } from "@/components/marketing/mkt-campaign-wall";
import { MktSegmentHealth } from "@/components/marketing/mkt-segment-health";
import { MktAttributionDashboard } from "@/components/marketing/mkt-attribution";
import { MktHandoffCenter } from "@/components/marketing/mkt-handoff-center";
import { MktPipelineView } from "@/components/marketing/mkt-pipeline-view";
import { MktLists } from "@/components/marketing/mkt-lists";
import { MktLeadVelocity } from "@/components/marketing/mkt-lead-velocity";
import { MktAnalytics } from "@/components/marketing/mkt-analytics";
import { MktCalendar } from "@/components/marketing/mkt-calendar";
import { MktDigest } from "@/components/marketing/mkt-digest";
import { MktROI } from "@/components/marketing/mkt-roi";
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
  settings: "Configuración",
} as Record<MktSection, string>;

// ── Contacts tab ─────────────────────────────────────────────────────────────
function MktContacts() {
  const { contacts } = useMkt();
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
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, height: "100%", overflow: "auto" }} className="mkt-contacts-root">
      <style>{`
        .mkt-contacts-root::-webkit-scrollbar,.mkt-contacts-root *::-webkit-scrollbar{width:6px;height:6px}
        .mkt-contacts-root::-webkit-scrollbar-track,.mkt-contacts-root *::-webkit-scrollbar-track{background:transparent}
        .mkt-contacts-root::-webkit-scrollbar-thumb,.mkt-contacts-root *::-webkit-scrollbar-thumb{background:var(--mkt-border);border-radius:3px}
        .mkt-contacts-root::-webkit-scrollbar-thumb:hover,.mkt-contacts-root *::-webkit-scrollbar-thumb:hover{background:var(--mkt-text-muted)}
      `}</style>
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
// ── Inline settings for marketing module ─────────────────────────────────────
function MktSettings() {
  const { syncFromBrevo } = useMkt();
  const [activeTab, setActiveTab] = useState<"perfil" | "integraciones" | "notificaciones">("perfil");

  // Brevo sync
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState("");

  // Apollo sync
  const [apolloSyncing, setApolloSyncing] = useState(false);
  const [apolloMsg, setApolloMsg] = useState("");

  const handleSyncBrevo = async () => {
    setSyncing(true); setSyncMsg("Sincronizando…");
    try {
      const result = await syncFromBrevo();
      setSyncMsg(`✓ ${result.synced} contactos sincronizados`);
    } catch { setSyncMsg("Error al sincronizar"); }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(""), 5000); }
  };

  const handleRecalculate = async () => {
    setRecalculating(true); setRecalcResult("Calculando…");
    try {
      const res = await fetch("/api/brevo/recalculate-scores", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushToBrevo: true }),
      });
      const d = await res.json();
      setRecalcResult(d.error ? `Error: ${d.error}` : `✓ ${d.processed} contactos procesados`);
    } catch { setRecalcResult("Error al recalcular"); }
    finally { setRecalculating(false); setTimeout(() => setRecalcResult(""), 6000); }
  };

  const handleSyncApollo = async () => {
    setApolloSyncing(true); setApolloMsg("Importando…");
    try {
      const res = await fetch("/api/import-apollo", { method: "POST" });
      const d = await res.json();
      setApolloMsg(d.error ? `Error` : `✓ ${d.inserted} importados`);
    } catch { setApolloMsg("Error"); }
    finally { setApolloSyncing(false); setTimeout(() => setApolloMsg(""), 5000); }
  };

  const tabStyle = (id: string): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 500,
    cursor: "pointer", border: "1px solid transparent", background: "transparent",
    color: activeTab === id ? "var(--mkt-text)" : "var(--mkt-text-muted)",
    borderColor: activeTab === id ? "var(--mkt-border)" : "transparent",
    borderBottomColor: activeTab === id ? "var(--mkt-bg)" : "transparent",
    marginBottom: activeTab === id ? -1 : 0, transition: "all 0.12s",
  });

  const card: React.CSSProperties = {
    background: "var(--mkt-card)", border: "1px solid var(--mkt-border)",
    borderRadius: 12, padding: 24,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", background: "var(--mkt-bg)",
    border: "1px solid var(--mkt-border)", borderRadius: 8, fontSize: 13,
    color: "var(--mkt-text)", outline: "none", boxSizing: "border-box",
  };

  const btnStyle = (variant: "primary" | "outline" = "outline"): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: "pointer", border: `1px solid var(--mkt-border)`,
    display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.12s",
    background: variant === "primary" ? "var(--mkt-accent)" : "transparent",
    color: variant === "primary" ? "#0a0a0a" : "var(--mkt-text-muted)",
  });

  const syncBtn = (loading: boolean): React.CSSProperties => ({
    ...btnStyle("outline"), width: "100%", justifyContent: "center",
    opacity: loading ? 0.6 : 1, cursor: loading ? "wait" : "pointer",
  });

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "var(--mkt-text)" }}>Configuración</h2>
        <p style={{ fontSize: 13, color: "var(--mkt-text-muted)", margin: 0 }}>Perfil, integraciones y notificaciones</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--mkt-border)", marginBottom: 20 }}>
        {(["perfil", "integraciones", "notificaciones"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(t)}>
            {t === "perfil" ? "Perfil" : t === "integraciones" ? "Integraciones" : "Notificaciones"}
          </button>
        ))}
      </div>

      {/* Perfil */}
      {activeTab === "perfil" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card}>
            <p style={{ fontSize: 13, color: "var(--mkt-text-muted)", margin: "0 0 16px" }}>
              Tu perfil y preferencias personales se gestionan en la{" "}
              <a href="/settings" style={{ color: "var(--mkt-accent)", textDecoration: "underline" }}>
                página de Ajustes del CRM
              </a>
              . Los cambios aplican a toda la plataforma.
            </p>
            <a href="/settings" style={{ textDecoration: "none" }}>
              <button style={btnStyle("primary")}>Ir a Ajustes completos</button>
            </a>
          </div>
        </div>
      )}

      {/* Integraciones */}
      {activeTab === "integraciones" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Brevo */}
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--mkt-text)" }}>Brevo — Sincronización</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--mkt-text)" }}>Sincronizar contactos</div>
                <p style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
                  Importa contactos de Brevo con atributos SCORE, TIER e INDUSTRY.
                </p>
                <button style={syncBtn(syncing)} onClick={handleSyncBrevo} disabled={syncing}>
                  {syncing ? "Sincronizando…" : "Sincronizar desde Brevo"}
                </button>
                {syncMsg && <p style={{ fontSize: 11, color: "var(--mkt-accent)", marginTop: 6 }}>{syncMsg}</p>}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--mkt-text)" }}>Recalcular ICP Scores</div>
                <p style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
                  Aplica algoritmo completo y actualiza TIER en Brevo.
                </p>
                <button style={syncBtn(recalculating)} onClick={handleRecalculate} disabled={recalculating}>
                  {recalculating ? "Calculando…" : "Recalcular Scores ICP"}
                </button>
                {recalcResult && <p style={{ fontSize: 11, color: "var(--mkt-accent)", marginTop: 6 }}>{recalcResult}</p>}
              </div>
            </div>
          </div>

          {/* Apollo */}
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--mkt-text)" }}>Apollo — CSV Sync</div>
            <p style={{ fontSize: 13, color: "var(--mkt-text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
              Importa contactos del archivo Apollo CSV. Cada contacto recibe un score ICP automático.
            </p>
            <button style={syncBtn(apolloSyncing)} onClick={handleSyncApollo} disabled={apolloSyncing}>
              {apolloSyncing ? "Importando…" : "Sincronizar Apollo CSV"}
            </button>
            {apolloMsg && <p style={{ fontSize: 11, color: "var(--mkt-accent)", marginTop: 8 }}>{apolloMsg}</p>}
          </div>
        </div>
      )}

      {/* Notificaciones */}
      {activeTab === "notificaciones" && (
        <div style={card}>
          <p style={{ fontSize: 13, color: "var(--mkt-text-muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
            Configura tus preferencias de notificación en{" "}
            <a href="/settings" style={{ color: "var(--mkt-accent)", textDecoration: "underline" }}>
              Ajustes → Notificaciones
            </a>.
          </p>
          <a href="/settings" style={{ textDecoration: "none" }}>
            <button style={btnStyle("primary")}>Ir a Notificaciones</button>
          </a>
        </div>
      )}
    </div>
  );
}

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
      case "lists": return <MktLists />;
      case "mkt-analytics": return <MktAnalytics />;
      case "pipeline-view": return <MktPipelineView />;
      case "lead-velocity": return <MktLeadVelocity />;
      case "calendar": return <MktCalendar />;
      case "abm": return <MktPlaceholder label="ABM Board" />;
      case "digest": return <MktDigest />;
      case "roi": return <MktROI />;
      case "export": return <MktPlaceholder label="Exportar" />;
      case "integrations": return <MktPlaceholder label="Integraciones" />;
      case "settings": return <MktSettings />;
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
