"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { MktProvider, useMkt } from "@/components/marketing/mkt-provider";
import { MktSidebar } from "@/components/marketing/mkt-sidebar";
import { MktEngagementBoard } from "@/components/marketing/mkt-engagement-board";
import { MktIcpScorer } from "@/components/marketing/mkt-icp-scorer";
import { MktCampaignWall } from "@/components/marketing/mkt-campaign-wall";
import { MktSegmentHealth } from "@/components/marketing/mkt-segment-health";
import { MktAttributionDashboard } from "@/components/marketing/mkt-attribution";
import { MktHandoffCenter } from "@/components/marketing/mkt-handoff-center";
import { MktPipelineView } from "@/components/marketing/mkt-pipeline-view";
import { MktLeadVelocity } from "@/components/marketing/mkt-lead-velocity";
import { MktAnalytics } from "@/components/marketing/mkt-analytics";
import { MktCalendar } from "@/components/marketing/mkt-calendar";
import { MktDigest } from "@/components/marketing/mkt-digest";
import { MktCampaignRevenue } from "@/components/marketing/mkt-campaign-revenue";
import { MktIntelligence } from "@/components/marketing/mkt-intelligence";
import { MktContactsView } from "@/components/marketing/mkt-contacts-view";
import { MktReengagement } from "@/components/marketing/mkt-reengagement";
import { MktFunnel } from "@/components/marketing/mkt-funnel";
import { MktSegmentsBuilder } from "@/components/marketing/mkt-segments-builder";
import { MKT_THEME_VARS, MKT_PRESETS, getMktThemeVars } from "@/components/marketing/mkt-utils";
import { MktForecast } from "@/components/marketing/mkt-forecast";
import { MktAttributionModel } from "@/components/marketing/mkt-attribution-model";
import { MktIntegrations } from "@/components/marketing/mkt-integrations";
import { MktExport } from "@/components/marketing/mkt-export";
import { MktAbm } from "@/components/marketing/mkt-abm";
import { CalculatorTool } from "@/components/calculator/CalculatorTool";
import { NotificationsHub } from "@/components/layout/NotificationsHub";
import { MktActivityFeed } from "@/components/marketing/mkt-activity-feed";
import { MktBusinessSettings, MktUsersSettings, MktPipelineSettings, MktPortalsSettings } from "@/components/marketing/mkt-admin-settings";
import { CurrencySettings } from "@/components/settings/CurrencySettings";
import { CloseReasonsSettings } from "@/components/settings/CloseReasonsSettings";
import { DealAgingSettings } from "@/components/settings/DealAgingSettings";
import { SalesTargetsSettings } from "@/components/settings/SalesTargetsSettings";
import { CustomFieldsSettings } from "@/components/settings/CustomFieldsSettings";
import type { MktSection } from "@/components/marketing/mkt-types";

const SECTION_LABELS: Record<MktSection, string> = {
  engagement: "Engagement Board",
  icp: "ICP Scorer",
  "icp-insights": "ICP Insights",
  campaigns: "Campañas",
  contacts: "Contactos",
  reengagement: "Re-engagement Queue",
  funnel: "Funnel Dashboard",
  "segments-builder": "Smart Segments",
  segments: "Segment Health",
  "segment-health": "Segment Health",
  attribution: "Atribución",
  handoff: "Handoff Center",
  "pipeline-view": "Vista Pipeline",
  "lead-velocity": "Lead Velocity",
  "mkt-analytics": "Analytics",
  intelligence: "Intelligence",
  calendar: "Calendario",
  abm: "ABM Board",
  digest: "Digest Semanal",
  roi: "ROI",
  calculator: "Calculadora de Precios",
  export: "Exportar",
  integrations: "Integraciones",
  settings: "Configuración",
} as Record<MktSection, string>;

// ── Contacts tab ─────────────────────────────────────────────────────────────
function MktContactDetailModal({ contact, onClose }: { contact: import("@/components/marketing/mkt-types").MktContact; onClose: () => void }) {
  const lastAct = contact.lastActivity ? new Date(contact.lastActivity).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--mkt-border)", fontSize: 12 }}>
      <span style={{ color: "var(--mkt-text-muted)" }}>{label}</span>
      <span style={{ color: "var(--mkt-text)" }}>{value}</span>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 10001, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(560px, 100%)", height: "100%", background: "var(--mkt-card)", borderLeft: "1px solid var(--mkt-border)", overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mkt-text)" }}>{contact.name}</div>
            <div style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginTop: 2 }}>{contact.jobTitle || "—"}{contact.company ? ` · ${contact.company}` : ""}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--mkt-text-muted)", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }} aria-label="Cerrar">×</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: "#8b5cf620", color: "#8b5cf6" }}>{contact.source || "web"}</span>
          {contact.tier ? <span style={{ padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "var(--mkt-accent)20", color: "var(--mkt-accent)" }}>T{contact.tier}</span> : null}
          {contact.engagementStatus ? <span style={{ padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "var(--mkt-text-muted)", textTransform: "uppercase" }}>{contact.engagementStatus}</span> : null}
          {contact.readyForSales ? <span style={{ padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Ready for sales</span> : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {contact.email ? <a href={`mailto:${contact.email}`} style={{ padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, textAlign: "center", background: "#3b82f61a", color: "#3b82f6", border: "1px solid #3b82f633", textDecoration: "none" }}>✉️ Email</a> : <span style={{ padding: "7px 0", borderRadius: 8, fontSize: 12, textAlign: "center", color: "var(--mkt-text-muted)", border: "1px dashed var(--mkt-border)" }}>Sin email</span>}
          {contact.phone ? <a href={`tel:${contact.phone}`} style={{ padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, textAlign: "center", background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", textDecoration: "none" }}>📞 Llamar</a> : <span style={{ padding: "7px 0", borderRadius: 8, fontSize: 12, textAlign: "center", color: "var(--mkt-text-muted)", border: "1px dashed var(--mkt-border)" }}>Sin teléfono</span>}
          {contact.phone ? <a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, textAlign: "center", background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)", textDecoration: "none" }}>💬 WhatsApp</a> : <span style={{ padding: "7px 0", borderRadius: 8, fontSize: 12, textAlign: "center", color: "var(--mkt-text-muted)", border: "1px dashed var(--mkt-border)" }}>Sin WhatsApp</span>}
          <a href={contact.linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(contact.name + (contact.company ? " " + contact.company : ""))}`} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, textAlign: "center", background: "rgba(10,102,194,0.1)", color: "#0a66c2", border: "1px solid rgba(10,102,194,0.25)", textDecoration: "none" }}>in LinkedIn</a>
        </div>
        <div>
          {row("Email", contact.email || "—")}
          {row("Teléfono", contact.phone || "—")}
          {row("Empresa", contact.company || "—")}
          {row("Cargo", contact.jobTitle || "—")}
          {row("Industria", contact.industry || "—")}
          {row("Tamaño empresa", contact.companySize || "—")}
          {row("Ubicación", contact.location || "—")}
          {row("Score ICP", `${contact.score} / 100`)}
          {row("Aperturas", contact.emailOpens)}
          {row("Clics", contact.emailClicks)}
          {row("Última actividad", lastAct)}
          {row("Fuente detalle", contact.leadSourceDetail || "—")}
        </div>
        {contact.marketingNotes && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Notas de marketing</div>
            <div style={{ padding: 10, borderRadius: 8, background: "var(--mkt-bg)", fontSize: 12, color: "var(--mkt-text)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{contact.marketingNotes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function MktContacts() {
  const { contacts } = useMkt();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [sortBy, setSortBy] = useState<"score" | "tier" | "name" | "company" | "activity">("score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = contacts.find(c => c.id === selectedId) || null;

  const filtered = contacts
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !search || c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q);
      const matchTier = tierFilter === 0 || c.tier === tierFilter;
      return matchSearch && matchTier;
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
              {["#", "Nombre", "Empresa", "Industria", "Cargo", "Teléfono", "Score", "LinkedIn", "Fuente", "Tier"].map(h => (
                <th key={h} style={hcell}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ ...cell, textAlign: "center", color: "var(--mkt-text-muted)", padding: "32px 0" }}>Sin resultados</td></tr>
            ) : filtered.map((c, i) => {
              const liUrl = c.linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.name + (c.company ? " " + c.company : ""))}`;
              return (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
                  onMouseLeave={e => (e.currentTarget.style.filter = "")}
                  style={{ background: i % 2 === 0 ? "transparent" : "var(--mkt-surface)", cursor: "pointer", transition: "filter 0.1s" }}
                >
                  <td style={{ ...cell, color: "var(--mkt-text-muted)", width: 32 }}>{i + 1}</td>
                  <td style={cell}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{c.email || "—"}</div>
                  </td>
                  <td style={cell}>{c.company || "—"}</td>
                  <td style={cell}>{c.industry || "—"}</td>
                  <td style={cell}>{c.jobTitle || "—"}</td>
                  <td style={cell}>
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} style={{ color: "var(--mkt-text)", textDecoration: "none", fontVariantNumeric: "tabular-nums", fontSize: 11 }}>{c.phone}</a>
                    ) : "—"}
                  </td>
                  <td style={cell}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 52, height: 5, borderRadius: 3, background: "var(--mkt-border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: "var(--mkt-accent)", width: `${Math.min(c.score, 100)}%` }} />
                      </div>
                      <span style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{c.score}</span>
                    </div>
                  </td>
                  <td style={cell}>
                    <a href={liUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 5, background: c.linkedinUrl ? "#0a66c220" : "transparent", color: c.linkedinUrl ? "#0a66c2" : "var(--mkt-text-muted)", border: `1px solid ${c.linkedinUrl ? "#0a66c230" : "var(--mkt-border)"}`, fontSize: 10, fontWeight: 700, textDecoration: "none" }}
                      title={c.linkedinUrl ? "Ver LinkedIn" : "Buscar en LinkedIn"}
                    >in</a>
                  </td>
                  <td style={cell}>
                    <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "#8b5cf620", color: "#8b5cf6" }}>
                      {c.source || "web"}
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
      {selected && <MktContactDetailModal contact={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

// ── Generic placeholder ──────────────────────────────────────────────────────
// ── Inline settings for marketing module ─────────────────────────────────────
type SettingsTab = "perfil" | "apariencia" | "negocio" | "usuarios" | "pipeline" | "objetivos" | "portales" | "campos" | "notificaciones";

function MktSettings({ initialTab }: { initialTab?: SettingsTab } = {}) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab ?? "perfil");
  const actorRole = (session?.user as { role?: string })?.role ?? "marketing";
  const currentUserId = (session?.user as { id?: string })?.id ?? "";

  // ── shared styles ──
  const card: React.CSSProperties = { background: "var(--mkt-card)", border: "1px solid var(--mkt-border)", borderRadius: 12, padding: 24 };
  const input: React.CSSProperties = { width: "100%", padding: "8px 12px", background: "var(--mkt-bg)", border: "1px solid var(--mkt-border)", borderRadius: 8, fontSize: 13, color: "var(--mkt-text)", outline: "none", boxSizing: "border-box" as const };
  const btn = (v: "primary" | "outline" | "danger" = "outline"): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
    border: "1px solid var(--mkt-border)", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.12s",
    background: v === "primary" ? "var(--mkt-accent)" : v === "danger" ? "rgba(239,68,68,0.12)" : "transparent",
    color: v === "primary" ? "#0a0a0a" : v === "danger" ? "#ef4444" : "var(--mkt-text-muted)",
    ...(v === "danger" ? { borderColor: "rgba(239,68,68,0.3)" } : {}),
  });
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block" };
  const navItem = (id: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 8, fontSize: 13,
    fontWeight: activeTab === id ? 600 : 400, cursor: "pointer", border: "1px solid transparent",
    width: "100%", textAlign: "left", transition: "all 0.12s",
    background: activeTab === id ? "var(--mkt-nav-active-bg, rgba(255,255,255,0.06))" : "transparent",
    color: activeTab === id ? "var(--mkt-text)" : "var(--mkt-text-muted)",
  });

  // ── perfil state ──
  const userName = session?.user?.name || "Usuario";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;
  const userRole = (session?.user as { role?: string })?.role || "marketing";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const [name, setName] = useState(userName);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await fetch("/api/settings/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), ...(avatarPreview ? { image: avatarPreview } : {}) }) });
    } finally { setSavingProfile(false); }
  };
  const roleCfg: Record<string, { bg: string; color: string; label: string }> = {
    superadmin: { bg: "rgba(195,154,76,0.15)", color: "#C39A4C", label: "Superadmin" },
    marketing:  { bg: "rgba(99,102,241,0.15)", color: "#6366f1", label: "Marketing" },
    sales:      { bg: "rgba(34,197,94,0.15)",  color: "#22c55e", label: "Sales" },
  };
  const rc = roleCfg[userRole] ?? roleCfg.sales;

  // ── apariencia state ── (marketing-only, independent from CRM)
  const DFLT = { theme: "dark-luxury", accentPrimary: "#D19C15", accentSecondary: "#551C25", textColor: "#D7D2CB", fontFamily: "inter", sidebarBg: "#0c0c0b", sidebarBgType: "solid", uiDensity: "comfortable", borderRadius: "rounded" };
  const [prefs, setPrefs] = useState(DFLT);
  const [savingPrefs, setSavingPrefs] = useState(false);
  useEffect(() => {
    fetch("/api/settings/mkt-preferences").then(r => r.json()).then(d => { if (d && !d.error) setPrefs(p => ({ ...p, ...d })); }).catch(() => {});
  }, []);
  const setP = (k: string, v: string) => setPrefs(p => ({ ...p, [k]: v }));
  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      await fetch("/api/settings/mkt-preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prefs) });
      const vars = getMktThemeVars(prefs.theme, prefs.accentPrimary);
      const fontMap: Record<string, string> = {
        inter: "'Inter', -apple-system, sans-serif",
        merriweather: "'Merriweather', Georgia, serif",
        playfair: "'Playfair Display', Georgia, serif",
        mono: "'JetBrains Mono', 'Fira Code', monospace",
      };
      window.dispatchEvent(new CustomEvent("mkt-theme-change", {
        detail: { themeVars: vars, font: fontMap[prefs.fontFamily] ?? fontMap.inter },
      }));
    } finally { setSavingPrefs(false); }
  };
  const Toggle3 = ({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", border: `1px solid ${value === o.id ? "var(--mkt-accent)" : "var(--mkt-border)"}`, background: value === o.id ? "rgba(195,154,76,0.12)" : "transparent", color: value === o.id ? "var(--mkt-accent)" : "var(--mkt-text-muted)", transition: "all 0.12s" }}>{o.label}</button>
      ))}
    </div>
  );

  // ── notificaciones state ──
  const NDFLT = { browserEnabled: true, emailEnabled: true, emailDigestFrequency: "daily", digestHour: 6, digestEmail: "", alertLeadHot: true, alertHotThreshold: 70, alertFollowupOverdue: true, alertHandoffPending: true, alertDealMoved: true, alertCampaignPerf: true, campaignPerfThreshold: 50 };
  const [notifPrefs, setNotifPrefs] = useState(NDFLT);
  const [savingNotif, setSavingNotif] = useState(false);
  useEffect(() => {
    fetch("/api/settings/notifications").then(r => r.json()).then(d => { if (d && !d.error) setNotifPrefs(p => ({ ...p, ...d })); }).catch(() => {});
  }, []);
  const setN = (k: string, v: unknown) => setNotifPrefs(p => ({ ...p, [k]: v }));
  const handleSaveNotif = async () => {
    setSavingNotif(true);
    try { await fetch("/api/settings/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notifPrefs) }); }
    finally { setSavingNotif(false); }
  };
  const SwToggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!value)} style={{ width: 38, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: value ? "var(--mkt-accent)" : "rgba(255,255,255,0.12)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
      <span style={{ position: "absolute", top: 2, left: value ? 19 : 2, width: 16, height: 16, borderRadius: "50%", background: value ? "#0a0a0a" : "white", transition: "left 0.2s" }} />
    </button>
  );
  const NotifRow = ({ label: lbl, value, onChange, children }: { label: string; value: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--mkt-border)" }}>
      <div style={{ fontSize: 13, color: "var(--mkt-text)" }}>{lbl}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{children}<SwToggle value={value} onChange={onChange} /></div>
    </div>
  );

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "perfil", label: "Perfil" },
    { id: "apariencia", label: "Apariencia" },
    { id: "negocio", label: "Negocio" },
    { id: "usuarios", label: "Usuarios" },
    { id: "pipeline", label: "Pipeline" },
    { id: "objetivos", label: "Objetivos" },
    { id: "portales", label: "Portales" },
    { id: "campos", label: "Campos" },
    { id: "notificaciones", label: "Notificaciones" },
  ];

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      {/* Left vertical nav — keeps every option visible without being cut off */}
      <nav style={{ width: 190, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2, position: "sticky", top: 0 }}>
        <div style={{ marginBottom: 12, padding: "0 4px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 2px", color: "var(--mkt-text)" }}>Configuración</h2>
          <p style={{ fontSize: 11, color: "var(--mkt-text-muted)", margin: 0 }}>Ajustes de tu cuenta</p>
        </div>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={navItem(t.id)}>{t.label}</button>
        ))}
      </nav>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 860 }}>
      {/* ── PERFIL ── */}
      {activeTab === "perfil" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card}>
            {/* Avatar + name */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
              <div style={{ position: "relative" }}>
                {(avatarPreview || userImage) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview || userImage!} alt={name} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--mkt-border)" }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(195,154,76,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#C39A4C", border: "2px solid var(--mkt-border)" }}>{initials}</div>
                )}
                <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: "var(--mkt-accent)", border: "2px solid var(--mkt-card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImage} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--mkt-text)" }}>{name}</div>
                <div style={{ fontSize: 12, color: "var(--mkt-text-muted)", marginTop: 2 }}>{userEmail}</div>
                <span style={{ display: "inline-block", marginTop: 6, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: rc.bg, color: rc.color }}>{rc.label}</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div><span style={label}>Nombre completo</span><input style={input} value={name} onChange={e => setName(e.target.value)} /></div>
              <div><span style={label}>Email</span><input style={{ ...input, color: "var(--mkt-text-muted)", cursor: "not-allowed" }} value={userEmail} readOnly /></div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={btn("primary")} onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile ? "Guardando…" : "Guardar perfil"}</button>
              <button style={btn("danger")} onClick={() => signOut({ callbackUrl: "/login" })}>Cerrar sesión</button>
            </div>
          </div>
          <div style={{ ...card, background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.15)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--mkt-text)" }}>Seguridad</div>
            <p style={{ fontSize: 13, color: "var(--mkt-text-muted)", margin: 0, lineHeight: 1.6 }}>
              Autenticación gestionada por <strong style={{ color: "var(--mkt-text)" }}>Google OAuth</strong>.{" "}
              <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" style={{ color: "var(--mkt-accent)" }}>Gestionar seguridad de Google →</a>
            </p>
          </div>
        </div>
      )}

      {/* ── APARIENCIA ── */}
      {activeTab === "apariencia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Theme presets */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--mkt-text)" }}>Tema de interfaz</div>
            <p style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 16, lineHeight: 1.5 }}>Selecciona un preset o personaliza el color de acento. Los cambios se aplican al guardar.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
              {([
                { id: "dark-luxury", label: "Dark Luxury", bg: "#0a0a09", accent: "#D19C15", text: "#D7D2CB" },
                { id: "midnight",    label: "Midnight",    bg: "#0d1117", accent: "#58a6ff", text: "#c9d1d9" },
                { id: "forest",      label: "Forest",      bg: "#0a0f0b", accent: "#4ade80", text: "#d4e8d4" },
                { id: "light",       label: "Light",       bg: "#f8fafc", accent: "#D19C15", text: "#0f172a" },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setP("theme", t.id)} style={{
                  padding: "12px 8px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${prefs.theme === t.id ? t.accent : "rgba(255,255,255,0.06)"}`,
                  background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.15s",
                }}>
                  {/* Mini sidebar+content preview */}
                  <div style={{ display: "flex", gap: 2, width: 48, height: 28 }}>
                    <div style={{ width: 12, borderRadius: "3px 0 0 3px", background: t.id === "light" ? "#e2e8f0" : "rgba(0,0,0,0.4)" }} />
                    <div style={{ flex: 1, borderRadius: "0 3px 3px 0", background: t.id === "light" ? "#ffffff" : "rgba(255,255,255,0.04)" }}>
                      <div style={{ height: 3, borderRadius: 2, background: t.accent, margin: "4px 3px", opacity: 0.9 }} />
                      <div style={{ height: 2, borderRadius: 2, background: t.text, margin: "2px 3px", opacity: 0.3 }} />
                      <div style={{ height: 2, borderRadius: 2, background: t.text, margin: "2px 3px", opacity: 0.2 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: t.text, fontWeight: prefs.theme === t.id ? 700 : 400, opacity: prefs.theme === t.id ? 1 : 0.7 }}>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Custom accent override */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, paddingTop: 16, borderTop: "1px solid var(--mkt-border)" }}>
              <div>
                <span style={label}>Color de acento (override)</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={prefs.accentPrimary} onChange={e => setP("accentPrimary", e.target.value)}
                    style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer", borderRadius: 6 }} />
                  <input style={input} value={prefs.accentPrimary} onChange={e => setP("accentPrimary", e.target.value)} />
                </div>
                <p style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 4 }}>Deja el valor del preset para usar el acento nativo.</p>
              </div>
              <div>
                <span style={label}>Tipografía</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {([["inter","Inter"],["merriweather","Merriweather"],["playfair","Playfair"],["mono","Mono"]] as const).map(([id, lbl]) => (
                    <button key={id} onClick={() => setP("fontFamily", id)} style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                      border: `1px solid ${prefs.fontFamily === id ? "var(--mkt-accent)" : "var(--mkt-border)"}`,
                      background: prefs.fontFamily === id ? "rgba(195,154,76,0.1)" : "transparent",
                      color: prefs.fontFamily === id ? "var(--mkt-accent)" : "var(--mkt-text-muted)",
                    }}>{lbl}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Density + radius */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--mkt-border)" }}>
              <div>
                <span style={label}>Densidad UI</span>
                <Toggle3 options={[{id:"compact",label:"Compacta"},{id:"comfortable",label:"Normal"},{id:"spacious",label:"Espaciada"}]} value={prefs.uiDensity} onChange={v => setP("uiDensity", v)} />
              </div>
              <div>
                <span style={label}>Border radius</span>
                <Toggle3 options={[{id:"sharp",label:"Sharp"},{id:"rounded",label:"Redondeado"},{id:"pill",label:"Pill"}]} value={prefs.borderRadius} onChange={v => setP("borderRadius", v)} />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mkt-text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Vista previa</div>
            {(() => {
              const previewVars = getMktThemeVars(prefs.theme, prefs.accentPrimary);
              const pBg = previewVars["--mkt-bg"];
              const pSurface = previewVars["--mkt-surface"];
              const pSidebar = previewVars["--mkt-sidebar"];
              const pAccent = previewVars["--mkt-accent"];
              const pText = previewVars["--mkt-text"];
              const pMuted = previewVars["--mkt-text-muted"];
              const pBorder = previewVars["--mkt-border"];
              return (
                <div style={{ display: "flex", height: 120, borderRadius: 10, overflow: "hidden", border: `1px solid ${pBorder}` }}>
                  <div style={{ width: 80, background: pSidebar, borderRight: `1px solid ${pBorder}`, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ width: "100%", height: 8, borderRadius: 4, background: pAccent, opacity: 0.9 }} />
                    {[0.5, 0.3, 0.3].map((op, i) => <div key={i} style={{ width: "100%", height: 5, borderRadius: 3, background: pText, opacity: op }} />)}
                  </div>
                  <div style={{ flex: 1, background: pBg, padding: 12 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      {[pAccent, "rgba(255,255,255,0.15)", "rgba(255,255,255,0.08)"].map((c, i) => (
                        <div key={i} style={{ flex: 1, height: 36, borderRadius: 6, background: pSurface, border: `1px solid ${pBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: "60%", height: 5, borderRadius: 3, background: i === 0 ? pAccent : pText, opacity: i === 0 ? 0.9 : 0.3 }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 42, borderRadius: 6, background: pSurface, border: `1px solid ${pBorder}`, padding: "8px 10px" }}>
                      <div style={{ width: "40%", height: 5, borderRadius: 3, background: pText, opacity: 0.7, marginBottom: 5 }} />
                      <div style={{ width: "70%", height: 4, borderRadius: 3, background: pMuted, opacity: 0.4 }} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={btn("primary")} onClick={handleSavePrefs} disabled={savingPrefs}>{savingPrefs ? "Guardando…" : "Aplicar y guardar"}</button>
            <button style={btn()} onClick={() => {
              setPrefs(DFLT);
              const defaultVars = getMktThemeVars("dark-luxury");
              window.dispatchEvent(new CustomEvent("mkt-theme-change", { detail: defaultVars }));
              fetch("/api/settings/mkt-preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(DFLT) });
            }}>Restaurar defaults</button>
          </div>
        </div>
      )}

      {/* ── NEGOCIO ── */}
      {activeTab === "negocio" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MktBusinessSettings />
          <CurrencySettings canEdit />
        </div>
      )}

      {/* ── USUARIOS ── */}
      {activeTab === "usuarios" && (
        <MktUsersSettings actorRole={actorRole} currentUserId={currentUserId} />
      )}

      {/* ── PIPELINE ── */}
      {activeTab === "pipeline" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MktPipelineSettings />
          <CloseReasonsSettings role={actorRole} />
          <DealAgingSettings />
        </div>
      )}

      {/* ── OBJETIVOS ── */}
      {activeTab === "objetivos" && (
        <SalesTargetsSettings currentUserId={currentUserId} />
      )}

      {/* ── PORTALES ── */}
      {activeTab === "portales" && (
        <MktPortalsSettings />
      )}

      {/* ── CAMPOS ── */}
      {activeTab === "campos" && (
        <CustomFieldsSettings />
      )}

      {/* ── NOTIFICACIONES ── */}
      {activeTab === "notificaciones" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--mkt-text)" }}>Canales</div>
            <NotifRow label="Notificaciones del navegador" value={notifPrefs.browserEnabled} onChange={v => setN("browserEnabled", v)} />
            <NotifRow label="Resumen por email" value={notifPrefs.emailEnabled} onChange={v => setN("emailEnabled", v)}>
              {notifPrefs.emailEnabled && (
                <select style={{ ...input, width: "auto", padding: "3px 8px", fontSize: 12 }} value={notifPrefs.emailDigestFrequency} onChange={e => setN("emailDigestFrequency", e.target.value)}>
                  <option value="daily">Diario</option><option value="weekly">Semanal</option><option value="never">Nunca</option>
                </select>
              )}
            </NotifRow>
          </div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--mkt-text)" }}>Alertas</div>
            <NotifRow label={`Lead caliente (score ≥ ${notifPrefs.alertHotThreshold})`} value={notifPrefs.alertLeadHot} onChange={v => setN("alertLeadHot", v)}>
              {notifPrefs.alertLeadHot && <input type="number" style={{ ...input, width: 64, padding: "3px 8px", fontSize: 12 }} min={1} max={100} value={notifPrefs.alertHotThreshold} onChange={e => setN("alertHotThreshold", parseInt(e.target.value))} />}
            </NotifRow>
            <NotifRow label="Seguimiento vencido" value={notifPrefs.alertFollowupOverdue} onChange={v => setN("alertFollowupOverdue", v)} />
            <NotifRow label="Handoff pendiente +48h" value={notifPrefs.alertHandoffPending} onChange={v => setN("alertHandoffPending", v)} />
            <NotifRow label="Deal movido de etapa" value={notifPrefs.alertDealMoved} onChange={v => setN("alertDealMoved", v)} />
            <NotifRow label={`Campaña supera ${notifPrefs.campaignPerfThreshold}% open rate`} value={notifPrefs.alertCampaignPerf} onChange={v => setN("alertCampaignPerf", v)}>
              {notifPrefs.alertCampaignPerf && <input type="number" style={{ ...input, width: 64, padding: "3px 8px", fontSize: 12 }} min={1} max={100} value={notifPrefs.campaignPerfThreshold} onChange={e => setN("campaignPerfThreshold", parseInt(e.target.value))} />}
            </NotifRow>
          </div>
          <button style={btn("primary")} onClick={handleSaveNotif} disabled={savingNotif}>{savingNotif ? "Guardando…" : "Guardar notificaciones"}</button>
        </div>
      )}

      </div>
    </div>
  );
}

// ── Main content ─────────────────────────────────────────────────────────────
const MKT_FONT_MAP: Record<string, string> = {
  inter: "'Inter', -apple-system, sans-serif",
  merriweather: "'Merriweather', Georgia, serif",
  playfair: "'Playfair Display', Georgia, serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

function MarketingContent() {
  const [section, setSection] = useState<MktSection>("engagement");
  const { notifications, loading, contacts } = useMkt();
  const lastNotification = notifications[notifications.length - 1];
  const [themeVars, setThemeVars] = useState<Record<string, string>>(MKT_THEME_VARS);
  const [mktFont, setMktFont] = useState<string>(MKT_FONT_MAP.inter);

  useEffect(() => {
    fetch("/api/settings/mkt-preferences").then(r => r.json()).then(d => {
      if (d && !d.error) {
        const vars = getMktThemeVars(d.theme ?? "dark-luxury", d.accentPrimary);
        setThemeVars(vars);
        setMktFont(MKT_FONT_MAP[d.fontFamily] ?? MKT_FONT_MAP.inter);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ themeVars?: Record<string, string>; font?: string } | Record<string, string>>).detail;
      if (!detail || typeof detail !== "object") return;
      if ("themeVars" in detail || "font" in detail) {
        const d = detail as { themeVars?: Record<string, string>; font?: string };
        if (d.themeVars) setThemeVars(d.themeVars);
        if (d.font) setMktFont(d.font);
      } else {
        setThemeVars(detail as Record<string, string>);
      }
    };
    window.addEventListener("mkt-theme-change", handler);
    return () => window.removeEventListener("mkt-theme-change", handler);
  }, []);

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
      case "contacts": return <MktContactsView />;
      case "reengagement": return <MktReengagement />;
      case "funnel": return <MktFunnel />;
      case "segments-builder": return <MktSegmentsBuilder />;
      case "segments":
      case "segment-health": return <MktSegmentHealth />;
      case "attribution": return <MktAttributionDashboard />;
      case "forecast": return <MktForecast />;
      case "attribution-model": return <MktAttributionModel />;
      case "handoff": return <MktHandoffCenter />;
      case "mkt-analytics": return <MktAnalytics onNavigate={setSection as any} />;
      case "intelligence": return <MktIntelligence />;
      case "pipeline-view": return <MktPipelineView />;
      case "lead-velocity": return <MktLeadVelocity />;
      case "calendar": return <MktCalendar />;
      case "abm": return <MktAbm />;
      case "digest": return <MktDigest />;
      case "roi": return <MktCampaignRevenue />;
      case "export": return <MktExport />;
      case "integrations": return <MktIntegrations />;
      case "calculator": return <CalculatorTool />;
      case "settings": return <MktSettings />;
    }
  };

  return (
    <div
      style={{
        ...themeVars,
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", background: "var(--mkt-bg)",
        fontFamily: mktFont,
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {lastNotification && (
              <div style={{ fontSize: 12, color: "var(--mkt-accent)", display: "flex", alignItems: "center", gap: 6, marginRight: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--mkt-accent)" }} />
                <span style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastNotification.text}</span>
              </div>
            )}
            <MktActivityFeed />
            <NotificationsHub />
          </div>
        </header>

        {/* Empty state */}
        {!loading && contacts.length === 0 && (
          <div style={{
            padding: "16px 24px", background: "rgba(209,156,21,0.05)",
            borderBottom: "1px solid rgba(209,156,21,0.15)",
            fontSize: 12, color: "var(--mkt-text-muted)",
          }}>
            No hay contactos. Agrega contactos usando el módulo de importación o regístralos manualmente.
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
