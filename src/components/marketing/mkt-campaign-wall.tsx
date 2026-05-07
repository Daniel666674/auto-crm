"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useMkt } from "./mkt-provider";
import type { MktCampaign } from "./mkt-types";
import { MKT_CHANNELS } from "./mkt-types";

// ── helpers ───────────────────────────────────────────────────────────────────

function rateColor(rate: number, [good, ok]: [number, number]): string {
  if (rate >= good) return "#22c55e";
  if (rate >= ok) return "#f59e0b";
  return "#ef4444";
}

function safeRate(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function fmt(ts: string | number | null | undefined): string {
  if (!ts) return "—";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function AnimatedNum({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 100); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!ready) return;
    let raf: number;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / 800, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, value]);
  return <>{display}{suffix}</>;
}

// ── Brevo status badge ────────────────────────────────────────────────────────

const BREVO_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  sent:      { label: "Enviada",    bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  scheduled: { label: "Programada", bg: "rgba(59,130,246,0.12)",  color: "#3b82f6" },
  draft:     { label: "Borrador",   bg: "rgba(100,116,139,0.12)", color: "#94a3b8" },
  queued:    { label: "En cola",    bg: "rgba(245,158,11,0.12)",  color: "#f59e0b" },
  suspended: { label: "Suspendida", bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
  archived:  { label: "Archivada",  bg: "rgba(100,116,139,0.08)", color: "#64748b" },
};

function BrevoStatusBadge({ status }: { status: string }) {
  const c = BREVO_STATUS[status] ?? { label: status, bg: "rgba(100,116,139,0.12)", color: "#94a3b8" };
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

// Local-campaign status badge (for non-Brevo channels)
function LocalStatusBadge({ status }: { status: MktCampaign["status"] }) {
  const cfg = {
    active:    { bg: "rgba(34,197,94,0.12)",   color: "#22c55e", label: "Activa" },
    paused:    { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b", label: "Pausada" },
    completed: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8", label: "Completada" },
  };
  const c = cfg[status] ?? cfg.active;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

// ── types ─────────────────────────────────────────────────────────────────────

interface BrevoGlobalStats {
  sent: number;
  delivered: number;
  uniqueOpens: number;
  uniqueClicks: number;
  hardBounces: number;
  softBounces: number;
  unsubscriptions: number;
}

interface BrevoCampaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  sendTime?: string;
  statistics?: { globalStats?: BrevoGlobalStats };
}

// ── form shared style ─────────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)",
  color: "var(--mkt-text)", fontSize: 13, outline: "none",
};

interface BrevoList { id: number; name: string; uniqueSubscribers: number; }

// ── CampaignFormModal ─────────────────────────────────────────────────────────

function CampaignFormModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { addCampaign } = useMkt();
  const [form, setForm] = useState({
    name: "", status: "active" as MktCampaign["status"],
    startDate: new Date().toISOString().split("T")[0],
    targetSegment: "", cadenceType: "outreach", channel: "brevo_email",
    totalContacts: 0, subject: "", htmlContent: "", listIds: [] as number[],
    scheduledAt: "", senderEmail: "daniel.acosta@blackscale.consulting",
  });
  const [brevoLists, setBrevoLists] = useState<BrevoList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (form.channel === "brevo_email" || form.channel === "outbound") {
      setLoadingLists(true);
      fetch("/app/api/brevo/lists")
        .then(r => r.json())
        .then(d => setBrevoLists(d.lists || []))
        .catch(() => {})
        .finally(() => setLoadingLists(false));
    }
  }, [form.channel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true); setError("");
    try {
      let brevoCampaignId = "";
      if (form.channel === "brevo_email" && form.subject && form.htmlContent && form.listIds.length > 0) {
        const res = await fetch("/app/api/brevo/campaigns/create", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name, subject: form.subject, htmlContent: form.htmlContent,
            listIds: form.listIds, scheduledAt: form.scheduledAt || null, senderEmail: form.senderEmail,
          }),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); setSubmitting(false); return; }
        brevoCampaignId = String(data.id || data.campaigns?.[0]?.id || "");
      }
      addCampaign({
        name: form.name, status: form.status, startDate: new Date(form.startDate).getTime(),
        targetSegment: form.targetSegment, cadenceType: form.cadenceType, channel: form.channel,
        brevoCampaignId, totalContacts: Number(form.totalContacts) || form.listIds.length,
        openRate: 0, clickRate: 0, replyRate: 0, conversions: 0, lastSent: null,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const selectStyle: React.CSSProperties = { ...fieldStyle, appearance: "none" };
  const isBrevoEmail = form.channel === "brevo_email";
  const needsLists = isBrevoEmail || form.channel === "outbound";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{
        position: "relative", width: 520, maxHeight: "90vh", overflowY: "auto",
        background: "var(--mkt-surface)", borderRadius: 16, border: "1px solid var(--mkt-border)",
        padding: 24, boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--mkt-text)" }}>Nueva Campaña</h2>
        {error && (
          <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, color: "#ef4444" }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Nombre *</label>
            <input required style={fieldStyle} placeholder="Ej: Outreach Q2 — Seguros Colombia"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Canal *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {MKT_CHANNELS.map(ch => (
                <button key={ch.id} type="button" onClick={() => setForm({ ...form, channel: ch.id })}
                  style={{
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${form.channel === ch.id ? "var(--mkt-accent)" : "var(--mkt-border)"}`,
                    background: form.channel === ch.id ? "rgba(209,156,21,0.08)" : "transparent",
                    color: form.channel === ch.id ? "var(--mkt-accent)" : "var(--mkt-text-muted)",
                    fontSize: 12, fontWeight: form.channel === ch.id ? 600 : 400, textAlign: "left",
                  }}>
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Fecha inicio</label>
              <input type="date" style={fieldStyle} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Tipo</label>
              <select style={selectStyle} value={form.cadenceType} onChange={e => setForm({ ...form, cadenceType: e.target.value })}>
                <option value="outreach">Outreach</option>
                <option value="nurturing">Nurturing</option>
                <option value="onboarding">Onboarding</option>
                <option value="event">Evento</option>
                <option value="welcome">Welcome</option>
                <option value="reengagement">Re-engagement</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Segmento objetivo</label>
            <input style={fieldStyle} placeholder="Ej: Tier 1 — Seguros Colombia"
              value={form.targetSegment} onChange={e => setForm({ ...form, targetSegment: e.target.value })} />
          </div>
          {needsLists && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                  Listas Brevo {loadingLists && <span style={{ color: "var(--mkt-accent)" }}>Cargando…</span>}
                </label>
                {brevoLists.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto" }}>
                    {brevoLists.map(list => (
                      <label key={list.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--mkt-text)", cursor: "pointer" }}>
                        <input type="checkbox" checked={form.listIds.includes(list.id)}
                          onChange={e => setForm({ ...form, listIds: e.target.checked ? [...form.listIds, list.id] : form.listIds.filter(id => id !== list.id) })}
                          style={{ accentColor: "var(--mkt-accent)" }} />
                        {list.name} <span style={{ color: "var(--mkt-text-muted)" }}>({list.uniqueSubscribers} contactos)</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>
                    {loadingLists ? "Cargando listas de Brevo…" : "No se encontraron listas en Brevo."}
                  </p>
                )}
              </div>
              {isBrevoEmail && (
                <>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Asunto del email *</label>
                    <input style={fieldStyle} placeholder="Ej: Automatiza tu proceso de ventas en 30 días"
                      value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Contenido HTML</label>
                    <textarea style={{ ...fieldStyle, height: 100, resize: "vertical", fontFamily: "monospace", fontSize: 11 }}
                      placeholder="<p>Hola {{contact.FIRSTNAME}},</p>"
                      value={form.htmlContent} onChange={e => setForm({ ...form, htmlContent: e.target.value })} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Remitente</label>
                      <select style={selectStyle} value={form.senderEmail} onChange={e => setForm({ ...form, senderEmail: e.target.value })}>
                        <option value="daniel.acosta@blackscale.consulting">Daniel — BlackScale</option>
                        <option value="julian.vallejo@blackscale.consulting">Julian — BlackScale</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Programar para (opcional)</label>
                      <input type="datetime-local" style={fieldStyle} value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          {!needsLists && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Total contactos (estimado)</label>
              <input type="number" style={fieldStyle} placeholder="0"
                value={form.totalContacts} onChange={e => setForm({ ...form, totalContacts: Number(e.target.value) })} />
              <p style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 6 }}>
                {form.channel === "linkedin" && "Configura esta campaña en LinkedIn Campaign Manager."}
                {form.channel === "meta" && "Configura esta campaña en Meta Business Manager."}
                {form.channel === "google_ads" && "Configura esta campaña en Google Ads."}
              </p>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button type="submit" disabled={submitting} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: submitting ? "rgba(209,156,21,0.5)" : "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: submitting ? "wait" : "pointer" }}>
              {submitting ? "Creando…" : "Crear Campaña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Brevo card ────────────────────────────────────────────────────────────────

function BrevoCard({ camp, replyRate, conversions, expanded, onToggle }: {
  camp: BrevoCampaign;
  replyRate: number;
  conversions: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const gs = camp.statistics?.globalStats;
  const sent = gs?.sent ?? 0;
  const openRate = sent > 0 ? safeRate((gs!.uniqueOpens / sent) * 100) : 0;
  const clickRate = sent > 0 ? safeRate((gs!.uniqueClicks / sent) * 100) : 0;
  const rr = safeRate(replyRate);

  return (
    <div
      onClick={onToggle}
      style={{
        padding: 18, borderRadius: 12, cursor: "pointer", transition: "border-color 0.2s, box-shadow 0.2s",
        background: "var(--mkt-surface)", border: `1px solid ${expanded ? "rgba(209,156,21,0.3)" : "var(--mkt-border)"}`,
        boxShadow: expanded ? "0 0 20px rgba(209,156,21,0.06)" : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {camp.name}
          </div>
          {camp.subject && (
            <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {camp.subject}
            </div>
          )}
        </div>
        <BrevoStatusBadge status={camp.status} />
      </div>

      {/* Rates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12, marginTop: 10 }}>
        {[
          { label: "Open Rate", value: openRate, thresholds: [30, 15] as [number, number] },
          { label: "Click Rate", value: clickRate, thresholds: [10, 5] as [number, number] },
          { label: "Reply Rate", value: rr, thresholds: [5, 2] as [number, number] },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: rateColor(m.value, m.thresholds) }}>
              <AnimatedNum value={m.value} suffix="%" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--mkt-text-muted)", paddingTop: 10, borderTop: "1px solid var(--mkt-border)" }}>
        <span>{sent.toLocaleString("es-CO")} enviados</span>
        <span style={{ color: conversions > 0 ? "var(--mkt-accent)" : "var(--mkt-text-muted)", fontWeight: conversions > 0 ? 600 : 400 }}>
          {conversions} al pipeline
        </span>
        <span>{fmt(camp.sendTime ?? null)}</span>
      </div>

      {/* Expanded breakdown */}
      {expanded && gs && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--mkt-border)" }}>
          <div style={{ fontWeight: 600, color: "var(--mkt-accent)", fontSize: 11, marginBottom: 8 }}>Detalle Brevo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 11, color: "var(--mkt-text-muted)" }}>
            {[
              { label: "Enviados", v: gs.sent },
              { label: "Entregados", v: gs.delivered },
              { label: "Abiertos únicos", v: gs.uniqueOpens },
              { label: "Clicks únicos", v: gs.uniqueClicks },
              { label: "Rebotes", v: gs.hardBounces },
              { label: "Desuscritos", v: gs.unsubscriptions },
            ].map(({ label, v }) => (
              <div key={label}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--mkt-text)" }}>{(v ?? 0).toLocaleString("es-CO")}</div>
                <div>{label}</div>
              </div>
            ))}
          </div>
          <a href="https://app.brevo.com/campaigns" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: "var(--mkt-accent)", textDecoration: "none" }}
            onClick={e => e.stopPropagation()}>
            Ver en Brevo →
          </a>
        </div>
      )}
      {expanded && !gs && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--mkt-border)", fontSize: 12, color: "var(--mkt-text-muted)" }}>
          Sin estadísticas disponibles para esta campaña.
        </div>
      )}
    </div>
  );
}

// ── Local (non-Brevo) card ────────────────────────────────────────────────────

function LocalCard({ camp, expanded, onToggle }: { camp: MktCampaign; expanded: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{
      padding: 18, borderRadius: 12, cursor: "pointer",
      background: "var(--mkt-surface)", border: `1px solid ${expanded ? "rgba(209,156,21,0.3)" : "var(--mkt-border)"}`,
      transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 3 }}>{camp.name}</div>
          <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{camp.targetSegment}</div>
        </div>
        <LocalStatusBadge status={camp.status} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        {[
          { label: "Open Rate", value: safeRate(camp.openRate), thresholds: [30, 15] as [number, number] },
          { label: "Click Rate", value: safeRate(camp.clickRate), thresholds: [10, 5] as [number, number] },
          { label: "Reply Rate", value: safeRate(camp.replyRate), thresholds: [5, 2] as [number, number] },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: rateColor(m.value, m.thresholds) }}>
              <AnimatedNum value={m.value} suffix="%" />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mkt-text-muted)", paddingTop: 10, borderTop: "1px solid var(--mkt-border)" }}>
        <span>{camp.totalContacts} contactos</span>
        <span style={{ color: camp.conversions > 0 ? "var(--mkt-accent)" : "var(--mkt-text-muted)", fontWeight: camp.conversions > 0 ? 600 : 400 }}>
          {camp.conversions} al pipeline
        </span>
      </div>
    </div>
  );
}

// ── Placeholder for future channels ──────────────────────────────────────────

function ComingSoonPanel({ channel }: { channel: string }) {
  const labels: Record<string, string> = {
    linkedin: "LinkedIn Ads", meta: "Meta (Facebook/Instagram)", google_ads: "Google Ads",
  };
  return (
    <div style={{ padding: 48, textAlign: "center", background: "var(--mkt-surface)", borderRadius: 12, border: "1px dashed var(--mkt-border)" }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📡</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 6 }}>{labels[channel] ?? channel}</div>
      <div style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>Integración disponible próximamente.</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type ChannelTab = "brevo_email" | "linkedin" | "meta" | "google_ads";

const TABS: { id: ChannelTab; label: string }[] = [
  { id: "brevo_email", label: "Brevo Email" },
  { id: "linkedin",    label: "LinkedIn" },
  { id: "meta",        label: "Meta" },
  { id: "google_ads",  label: "Google Ads" },
];

export function MktCampaignWall() {
  const { campaigns: localCampaigns } = useMkt();
  const [activeTab, setActiveTab] = useState<ChannelTab>("brevo_email");
  const [brevoCampaigns, setBrevoCampaigns] = useState<BrevoCampaign[]>([]);
  const [loadingBrevo, setLoadingBrevo] = useState(false);
  const [brevoError, setBrevoError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Index local campaigns by brevoCampaignId for O(1) lookup
  const localByBrevoId = Object.fromEntries(
    localCampaigns.filter(c => c.brevoCampaignId).map(c => [c.brevoCampaignId, c])
  );

  const fetchBrevo = useCallback(() => {
    setLoadingBrevo(true);
    setBrevoError("");
    fetch("/app/api/brevo/campaigns")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setBrevoError(d.error); return; }
        setBrevoCampaigns(d.campaigns || []);
      })
      .catch(err => setBrevoError(String(err)))
      .finally(() => setLoadingBrevo(false));
  }, []);

  useEffect(() => {
    if (activeTab === "brevo_email") fetchBrevo();
  }, [activeTab, fetchBrevo]);

  const nonBrevoCampaigns = localCampaigns.filter(c => c.channel === activeTab);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setExpandedId(null); }}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: activeTab === tab.id ? "var(--mkt-accent)" : "var(--mkt-surface)",
                color: activeTab === tab.id ? "#0a0a0a" : "var(--mkt-text-muted)",
                transition: "background 0.15s, color 0.15s",
                ...(tab.id !== "brevo_email" && activeTab !== tab.id ? { opacity: 0.6 } : {}),
              }}
            >
              {tab.label}
              {tab.id !== "brevo_email" && activeTab !== tab.id && (
                <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.7 }}>pronto</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {activeTab === "brevo_email" && (
            <a href="https://app.brevo.com/campaigns" target="_blank" rel="noopener noreferrer"
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              Ver en Brevo
            </a>
          )}
          <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Nueva Campaña
          </button>
        </div>
      </div>

      {/* Brevo tab */}
      {activeTab === "brevo_email" && (
        <>
          {loadingBrevo && (
            <div style={{ textAlign: "center", padding: 32, color: "var(--mkt-text-muted)", fontSize: 13 }}>Cargando campañas desde Brevo…</div>
          )}
          {brevoError && !loadingBrevo && (
            <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Error al cargar campañas: {brevoError}</span>
              <button onClick={fetchBrevo} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Reintentar</button>
            </div>
          )}
          {!loadingBrevo && !brevoError && brevoCampaigns.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--mkt-text-muted)", fontSize: 13, background: "var(--mkt-surface)", borderRadius: 12, border: "1px solid var(--mkt-border)" }}>
              No hay campañas en Brevo. Crea la primera con el botón de arriba.
            </div>
          )}
          {!loadingBrevo && brevoCampaigns.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
              {brevoCampaigns.map(camp => {
                const local = localByBrevoId[String(camp.id)];
                return (
                  <BrevoCard
                    key={camp.id}
                    camp={camp}
                    replyRate={local?.replyRate ?? 0}
                    conversions={local?.conversions ?? 0}
                    expanded={expandedId === String(camp.id)}
                    onToggle={() => setExpandedId(expandedId === String(camp.id) ? null : String(camp.id))}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Other channel tabs */}
      {activeTab !== "brevo_email" && (
        nonBrevoCampaigns.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {nonBrevoCampaigns.map(camp => (
              <LocalCard key={camp.id} camp={camp}
                expanded={expandedId === camp.id}
                onToggle={() => setExpandedId(expandedId === camp.id ? null : camp.id)} />
            ))}
          </div>
        ) : (
          <ComingSoonPanel channel={activeTab} />
        )
      )}

      {showForm && (
        <CampaignFormModal
          onClose={() => setShowForm(false)}
          onCreated={() => { if (activeTab === "brevo_email") fetchBrevo(); }}
        />
      )}
    </div>
  );
}
