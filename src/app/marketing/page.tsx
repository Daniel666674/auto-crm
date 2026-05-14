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
import { MktLists } from "@/components/marketing/mkt-lists";
import { MktLeadVelocity } from "@/components/marketing/mkt-lead-velocity";
import { MktAnalytics } from "@/components/marketing/mkt-analytics";
import { MktBrevoHub } from "@/components/marketing/mkt-brevo-hub";
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
  "brevo-hub": "Brevo Hub",
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
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"perfil" | "apariencia" | "integraciones" | "notificaciones">("perfil");

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
  const tabStyle = (id: string): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 500, cursor: "pointer",
    border: "1px solid transparent", background: "transparent",
    color: activeTab === id ? "var(--mkt-text)" : "var(--mkt-text-muted)",
    borderColor: activeTab === id ? "var(--mkt-border)" : "transparent",
    borderBottomColor: activeTab === id ? "var(--mkt-card)" : "transparent",
    marginBottom: activeTab === id ? -1 : 0, transition: "all 0.12s",
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

  // ── apariencia state ──
  const DFLT = { theme: "dark", accentPrimary: "#C39A4C", accentSecondary: "#6D1F2E", textColor: "#e2e8f0", fontFamily: "inter", sidebarBg: "#0a0a0a", sidebarBgType: "solid", uiDensity: "comfortable", borderRadius: "rounded" };
  const [prefs, setPrefs] = useState(DFLT);
  const [savingPrefs, setSavingPrefs] = useState(false);
  useEffect(() => {
    fetch("/api/settings/preferences").then(r => r.json()).then(d => { if (d && !d.error) setPrefs(p => ({ ...p, ...d })); }).catch(() => {});
  }, []);
  const setP = (k: string, v: string) => setPrefs(p => ({ ...p, [k]: v }));
  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      await fetch("/api/settings/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prefs) });
      document.documentElement.style.setProperty("--accent-primary", prefs.accentPrimary);
      document.documentElement.style.setProperty("--accent-secondary", prefs.accentSecondary);
    } finally { setSavingPrefs(false); }
  };
  const Toggle3 = ({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", border: `1px solid ${value === o.id ? "var(--mkt-accent)" : "var(--mkt-border)"}`, background: value === o.id ? "rgba(195,154,76,0.12)" : "transparent", color: value === o.id ? "var(--mkt-accent)" : "var(--mkt-text-muted)", transition: "all 0.12s" }}>{o.label}</button>
      ))}
    </div>
  );

  // ── integraciones state ──
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState("");
  const [apolloSyncing, setApolloSyncing] = useState(false);
  const [apolloMsg, setApolloMsg] = useState("");
  const handleSyncBrevo = async () => {
    setSyncing(true); setSyncMsg("Sincronizando…");
    try { const r = await syncFromBrevo(); setSyncMsg(`✓ ${r.synced} contactos sincronizados`); }
    catch { setSyncMsg("Error al sincronizar"); }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(""), 5000); }
  };
  const handleRecalculate = async () => {
    setRecalculating(true); setRecalcResult("Calculando…");
    try {
      const res = await fetch("/api/brevo/recalculate-scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pushToBrevo: true }) });
      const d = await res.json();
      setRecalcResult(d.error ? `Error: ${d.error}` : `✓ ${d.processed} procesados`);
    } catch { setRecalcResult("Error al recalcular"); }
    finally { setRecalculating(false); setTimeout(() => setRecalcResult(""), 6000); }
  };
  const handleSyncApollo = async () => {
    setApolloSyncing(true); setApolloMsg("Importando…");
    try { const res = await fetch("/api/import-apollo", { method: "POST" }); const d = await res.json(); setApolloMsg(d.error ? "Error" : `✓ ${d.inserted} importados`); }
    catch { setApolloMsg("Error"); }
    finally { setApolloSyncing(false); setTimeout(() => setApolloMsg(""), 5000); }
  };
  const syncBtn = (loading: boolean): React.CSSProperties => ({ ...btn("outline"), width: "100%", justifyContent: "center", opacity: loading ? 0.6 : 1, cursor: loading ? "wait" : "pointer" });

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

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "var(--mkt-text)" }}>Configuración</h2>
        <p style={{ fontSize: 13, color: "var(--mkt-text-muted)", margin: 0 }}>Perfil, apariencia, integraciones y notificaciones</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--mkt-border)", marginBottom: 24 }}>
        {(["perfil", "apariencia", "integraciones", "notificaciones"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(t)}>
            {{ perfil: "Perfil", apariencia: "Apariencia", integraciones: "Integraciones", notificaciones: "Notificaciones" }[t]}
          </button>
        ))}
      </div>

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
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "var(--mkt-text)" }}>Tema</div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              {[{ id: "dark", label: "Oscuro", bg: "#0a0a0a" }, { id: "light", label: "Claro", bg: "#f8fafc" }, { id: "custom", label: "Personalizado", bg: "linear-gradient(135deg,#1a1a2e,#6D1F2E)" }].map(t => (
                <button key={t.id} onClick={() => setP("theme", t.id)} style={{ flex: 1, padding: 14, borderRadius: 10, cursor: "pointer", border: `2px solid ${prefs.theme === t.id ? "var(--mkt-accent)" : "var(--mkt-border)"}`, background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 16, borderRadius: 3, background: t.id === "light" ? "#0f172a" : "#C39A4C", opacity: 0.8 }} />
                  <span style={{ fontSize: 11, color: t.id === "light" ? "#0f172a" : "#e2e8f0", fontWeight: 500 }}>{t.label}</span>
                </button>
              ))}
            </div>
            {prefs.theme === "custom" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[["Accent primario", "accentPrimary"], ["Accent secundario", "accentSecondary"], ["Color texto", "textColor"]].map(([lbl, key]) => (
                  <div key={key}><span style={label}>{lbl}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="color" value={(prefs as Record<string, string>)[key]} onChange={e => setP(key, e.target.value)} style={{ width: 34, height: 34, border: "none", background: "none", cursor: "pointer", borderRadius: 6 }} />
                      <input style={{ ...input, flex: 1 }} value={(prefs as Record<string, string>)[key]} onChange={e => setP(key, e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div><span style={label}>Tipografía</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[["inter","Inter"],["merriweather","Merriweather"],["playfair","Playfair"],["mono","Mono"]].map(([id, lbl]) => (
                    <button key={id} onClick={() => setP("fontFamily", id)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", border: `1px solid ${prefs.fontFamily === id ? "var(--mkt-accent)" : "var(--mkt-border)"}`, background: prefs.fontFamily === id ? "rgba(195,154,76,0.1)" : "transparent", color: prefs.fontFamily === id ? "var(--mkt-accent)" : "var(--mkt-text-muted)" }}>{lbl}</button>
                  ))}
                </div>
              </div>
              <div><span style={label}>Sidebar</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={prefs.sidebarBg} onChange={e => setP("sidebarBg", e.target.value)} style={{ width: 34, height: 34, border: "none", background: "none", cursor: "pointer" }} />
                  <input style={input} value={prefs.sidebarBg} onChange={e => setP("sidebarBg", e.target.value)} />
                </div>
              </div>
              <div><span style={label}>Densidad UI</span><Toggle3 options={[{id:"compact",label:"Compacta"},{id:"comfortable",label:"Normal"},{id:"spacious",label:"Espaciada"}]} value={prefs.uiDensity} onChange={v => setP("uiDensity", v)} /></div>
              <div><span style={label}>Border radius</span><Toggle3 options={[{id:"sharp",label:"Sharp"},{id:"rounded",label:"Redondeado"},{id:"pill",label:"Pill"}]} value={prefs.borderRadius} onChange={v => setP("borderRadius", v)} /></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btn("primary")} onClick={handleSavePrefs} disabled={savingPrefs}>{savingPrefs ? "Guardando…" : "Guardar apariencia"}</button>
            <button style={btn()} onClick={() => { setPrefs(DFLT); fetch("/api/settings/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(DFLT) }); }}>Restaurar defaults</button>
          </div>
        </div>
      )}

      {/* ── INTEGRACIONES ── */}
      {activeTab === "integraciones" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--mkt-text)" }}>Brevo — Sincronización</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--mkt-text)" }}>Sincronizar contactos</div>
                <p style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 10, lineHeight: 1.5 }}>Importa contactos de Brevo con SCORE, TIER e INDUSTRY.</p>
                <button style={syncBtn(syncing)} onClick={handleSyncBrevo} disabled={syncing}>{syncing ? "Sincronizando…" : "Sincronizar desde Brevo"}</button>
                {syncMsg && <p style={{ fontSize: 11, color: "var(--mkt-accent)", marginTop: 6 }}>{syncMsg}</p>}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--mkt-text)" }}>Recalcular ICP Scores</div>
                <p style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginBottom: 10, lineHeight: 1.5 }}>Aplica algoritmo completo y actualiza TIER en Brevo.</p>
                <button style={syncBtn(recalculating)} onClick={handleRecalculate} disabled={recalculating}>{recalculating ? "Calculando…" : "Recalcular Scores ICP"}</button>
                {recalcResult && <p style={{ fontSize: 11, color: "var(--mkt-accent)", marginTop: 6 }}>{recalcResult}</p>}
              </div>
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--mkt-text)" }}>Apollo — CSV Sync</div>
            <p style={{ fontSize: 13, color: "var(--mkt-text-muted)", marginBottom: 12, lineHeight: 1.6 }}>Importa contactos del archivo Apollo CSV con score ICP automático.</p>
            <button style={syncBtn(apolloSyncing)} onClick={handleSyncApollo} disabled={apolloSyncing}>{apolloSyncing ? "Importando…" : "Sincronizar Apollo CSV"}</button>
            {apolloMsg && <p style={{ fontSize: 11, color: "var(--mkt-accent)", marginTop: 8 }}>{apolloMsg}</p>}
          </div>
        </div>
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
      case "lists": return <MktLists onNavigate={setSection as any} />;
      case "mkt-analytics": return <MktAnalytics onNavigate={setSection as any} />;
      case "brevo-hub": return <MktBrevoHub />;
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
