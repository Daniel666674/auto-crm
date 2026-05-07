"use client";

import React, { useEffect, useState } from "react";
import { useMkt } from "./mkt-provider";
import { mktFormatRelative } from "./mkt-utils";
import type { MktCampaign } from "./mkt-types";
import { MKT_CHANNELS } from "./mkt-types";

// ── helpers ───────────────────────────────────────────────────────────────────

function rateColor(rate: number, [good, ok]: [number, number]): string {
  if (rate >= good) return "#22c55e";
  if (rate >= ok)   return "#f59e0b";
  return "#ef4444";
}

function safeN(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

// Brevo API returns these status strings
function BrevoStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    sent:       { label: "Completada",  bg: "rgba(100,116,139,0.12)", color: "#94a3b8" },
    scheduled:  { label: "Programada",  bg: "rgba(59,130,246,0.12)",  color: "#60a5fa" },
    draft:      { label: "Borrador",    bg: "rgba(100,116,139,0.08)", color: "#64748b" },
    queued:     { label: "En Cola",     bg: "rgba(139,92,246,0.12)",  color: "#a78bfa" },
    suspended:  { label: "Pausada",     bg: "rgba(245,158,11,0.12)",  color: "#f59e0b" },
    in_process: { label: "En Proceso",  bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
    archive:    { label: "Archivada",   bg: "rgba(100,116,139,0.08)", color: "#64748b" },
  };
  const c = map[status] ?? { label: status, bg: "rgba(100,116,139,0.1)", color: "#94a3b8" };
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

// ── channel tabs ──────────────────────────────────────────────────────────────

type ChannelTab = "brevo" | "linkedin" | "meta" | "google";

const CHANNEL_TABS: { id: ChannelTab; label: string; ready: boolean }[] = [
  { id: "brevo",    label: "Brevo Email",  ready: true  },
  { id: "linkedin", label: "LinkedIn Ads", ready: false },
  { id: "meta",     label: "Meta",         ready: false },
  { id: "google",   label: "Google Ads",   ready: false },
];

// ── form styles ───────────────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)",
  color: "var(--mkt-text)", fontSize: 13, outline: "none",
};

interface BrevoList { id: number; name: string; uniqueSubscribers: number; }

// ── create campaign modal ─────────────────────────────────────────────────────

function CampaignFormModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { addCampaign } = useMkt();
  const [form, setForm] = useState({
    name: "", status: "active" as MktCampaign["status"],
    startDate: new Date().toISOString().split("T")[0],
    targetSegment: "", cadenceType: "outreach", channel: "brevo_email",
    totalContacts: 0, subject: "", htmlContent: "",
    listIds: [] as number[], scheduledAt: "",
    senderEmail: "daniel.acosta@blackscale.consulting",
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
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name, subject: form.subject, htmlContent: form.htmlContent,
            listIds: form.listIds, scheduledAt: form.scheduledAt || null,
            senderEmail: form.senderEmail,
          }),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); setSubmitting(false); return; }
        brevoCampaignId = String(data.id || data.campaigns?.[0]?.id || "");
      }
      addCampaign({
        name: form.name, status: form.status,
        startDate: new Date(form.startDate).getTime(),
        targetSegment: form.targetSegment, cadenceType: form.cadenceType,
        channel: form.channel, brevoCampaignId,
        totalContacts: Number(form.totalContacts) || form.listIds.length,
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

  const sel: React.CSSProperties = { ...fieldStyle, appearance: "none" };
  const needsBrevoLists = form.channel === "brevo_email" || form.channel === "outbound";
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", width: 520, maxHeight: "90vh", overflowY: "auto", background: "var(--mkt-surface)", borderRadius: 16, border: "1px solid var(--mkt-border)", padding: 24, boxShadow: "0 24px 48px rgba(0,0,0,0.4)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--mkt-text)" }}>Nueva Campaña</h2>
        {error && <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, color: "#ef4444" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Nombre *</label>
            <input required style={fieldStyle} placeholder="Ej: Outreach Q2 - Seguros Colombia"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={{ ...lbl, marginBottom: 8 }}>Canal *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {MKT_CHANNELS.map(ch => (
                <button key={ch.id} type="button" onClick={() => setForm({ ...form, channel: ch.id })} style={{
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                  border: `1px solid ${form.channel === ch.id ? "var(--mkt-accent)" : "var(--mkt-border)"}`,
                  background: form.channel === ch.id ? "rgba(209,156,21,0.08)" : "transparent",
                  color: form.channel === ch.id ? "var(--mkt-accent)" : "var(--mkt-text-muted)",
                  fontSize: 12, fontWeight: form.channel === ch.id ? 600 : 400,
                }}>{ch.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Fecha inicio</label>
              <input type="date" style={fieldStyle} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Tipo</label>
              <select style={sel} value={form.cadenceType} onChange={e => setForm({ ...form, cadenceType: e.target.value })}>
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
            <label style={lbl}>Segmento objetivo</label>
            <input style={fieldStyle} placeholder="Ej: Tier 1 — Seguros Colombia"
              value={form.targetSegment} onChange={e => setForm({ ...form, targetSegment: e.target.value })} />
          </div>
          {needsBrevoLists && (
            <>
              <div>
                <label style={lbl}>Listas Brevo {loadingLists && <span style={{ color: "var(--mkt-accent)" }}>Cargando…</span>}</label>
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
              {form.channel === "brevo_email" && (
                <>
                  <div>
                    <label style={lbl}>Asunto del email *</label>
                    <input style={fieldStyle} placeholder="Ej: Automatiza tu proceso de ventas en 30 días"
                      value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Contenido HTML</label>
                    <textarea style={{ ...fieldStyle, height: 100, resize: "vertical", fontFamily: "monospace", fontSize: 11 }}
                      placeholder="<p>Hola {{contact.FIRSTNAME}},</p>"
                      value={form.htmlContent} onChange={e => setForm({ ...form, htmlContent: e.target.value })} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={lbl}>Remitente</label>
                      <select style={sel} value={form.senderEmail} onChange={e => setForm({ ...form, senderEmail: e.target.value })}>
                        <option value="daniel.acosta@blackscale.consulting">Daniel — BlackScale</option>
                        <option value="julian.vallejo@blackscale.consulting">Julian — BlackScale</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Programar para (opcional)</label>
                      <input type="datetime-local" style={fieldStyle} value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          {!needsBrevoLists && (
            <div>
              <label style={lbl}>Total contactos (estimado)</label>
              <input type="number" style={fieldStyle} placeholder="0"
                value={form.totalContacts} onChange={e => setForm({ ...form, totalContacts: Number(e.target.value) })} />
              <p style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 6 }}>
                {form.channel === "linkedin"   && "Configura esta campaña en LinkedIn Campaign Manager."}
                {form.channel === "meta"       && "Configura esta campaña en Meta Business Manager."}
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

// ── Brevo raw campaign shape ──────────────────────────────────────────────────

interface BrevoCampaignRaw {
  id: number;
  name: string;
  status: string;
  subject?: string;
  sentDate?: string;
  scheduledAt?: string;
  statistics?: {
    globalStats?: {
      sent?: number;
      delivered?: number;
      uniqueOpens?: number;
      uniqueClicks?: number;
      hardBounces?: number;
      softBounces?: number;
      unsubscriptions?: number;
    };
  };
}

// ── campaign card ─────────────────────────────────────────────────────────────

function BrevoCampaignCard({ camp, localConversions, localReplyRate }: {
  camp: BrevoCampaignRaw;
  localConversions: number;
  localReplyRate: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const gs = camp.statistics?.globalStats ?? {};
  const sent   = safeN(gs.sent);
  const opens  = safeN(gs.uniqueOpens);
  const clicks = safeN(gs.uniqueClicks);

  const openRate  = sent > 0 ? Math.round((opens  / sent) * 1000) / 10 : 0;
  const clickRate = sent > 0 ? Math.round((clicks / sent) * 1000) / 10 : 0;

  const lastSentTs = camp.sentDate    ? new Date(camp.sentDate).getTime()
    : camp.scheduledAt ? new Date(camp.scheduledAt).getTime() : null;

  return (
    <div
      style={{ padding: 18, borderRadius: 12, cursor: "pointer", background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)", transition: "border-color 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(209,156,21,0.25)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--mkt-border)"; }}
      onClick={() => setExpanded(x => !x)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mkt-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {camp.name}
          </div>
          {camp.subject && (
            <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {camp.subject}
            </div>
          )}
        </div>
        <BrevoStatusBadge status={camp.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, margin: "12px 0" }}>
        {[
          { label: "Open Rate",  value: openRate,        th: [30, 15] as [number, number] },
          { label: "Click Rate", value: clickRate,       th: [10,  5] as [number, number] },
          { label: "Reply Rate", value: localReplyRate,  th: [5,   2] as [number, number] },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: rateColor(m.value, m.th) }}>{m.value}%</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--mkt-text-muted)", paddingTop: 10, borderTop: "1px solid var(--mkt-border)" }}>
        <span>{sent > 0 ? sent.toLocaleString("es-CO") : "—"} enviados</span>
        <span style={{ color: localConversions > 0 ? "var(--mkt-accent)" : "var(--mkt-text-muted)", fontWeight: 600 }}>
          {localConversions} al pipeline
        </span>
        {lastSentTs && <span>{mktFormatRelative(lastSentTs)}</span>}
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--mkt-border)" }}>
          <div style={{ fontWeight: 600, color: "var(--mkt-accent)", fontSize: 11, marginBottom: 8 }}>Desglose Brevo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Enviados",          value: gs.sent },
              { label: "Entregados",        value: gs.delivered },
              { label: "Abiertos únicos",   value: gs.uniqueOpens },
              { label: "Clicks únicos",     value: gs.uniqueClicks },
              { label: "Rebotes",           value: safeN(gs.hardBounces) + safeN(gs.softBounces) },
              { label: "Desuscritos",       value: gs.unsubscriptions },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--mkt-text)" }}>{safeN(value).toLocaleString("es-CO")}</div>
                <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <a href="https://app.brevo.com/campaigns" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: "var(--mkt-accent)", textDecoration: "none" }}>
            Ver en Brevo →
          </a>
        </div>
      )}
    </div>
  );
}

// ── Brevo grid (fetches all statuses: sent, scheduled, draft) ─────────────────

function BrevoCampaignGrid({ refreshTrigger }: { refreshTrigger: number }) {
  const { campaigns: localCampaigns } = useMkt();
  const [campaigns, setCampaigns] = useState<BrevoCampaignRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch("/app/api/brevo/campaigns")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setCampaigns(d.campaigns || []);
      })
      .catch(() => setError("No se pudo conectar con Brevo"))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  if (loading) return <div style={{ fontSize: 13, color: "var(--mkt-text-muted)", padding: 24 }}>Cargando campañas desde Brevo…</div>;
  if (error) return (
    <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#f87171" }}>
      {error}. Verifica que <code style={{ fontFamily: "monospace" }}>BREVO_API_KEY</code> esté configurada en el servidor.
    </div>
  );
  if (campaigns.length === 0) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--mkt-text-muted)", fontSize: 13, background: "var(--mkt-surface)", borderRadius: 12, border: "1px solid var(--mkt-border)" }}>
      No hay campañas en Brevo. Crea la primera con el botón de arriba.
    </div>
  );

  // Enrich Brevo data with local conversions/replyRate where brevoCampaignId matches
  const localMap = new Map(
    localCampaigns.filter(c => c.brevoCampaignId).map(c => [c.brevoCampaignId, c])
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
      {campaigns.map(camp => {
        const local = localMap.get(String(camp.id));
        return (
          <BrevoCampaignCard
            key={camp.id}
            camp={camp}
            localConversions={local?.conversions ?? 0}
            localReplyRate={local?.replyRate ?? 0}
          />
        );
      })}
    </div>
  );
}

// ── coming soon placeholder ───────────────────────────────────────────────────

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div style={{ padding: 48, textAlign: "center", color: "var(--mkt-text-muted)", fontSize: 13, background: "var(--mkt-surface)", borderRadius: 12, border: "1px solid var(--mkt-border)" }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>🔌</div>
      <div style={{ fontWeight: 600, color: "var(--mkt-text)", marginBottom: 6, fontSize: 14 }}>{label} — Próximamente</div>
      <div>La integración con {label} se conectará en una próxima sesión.</div>
    </div>
  );
}

// ── main export ───────────────────────────────────────────────────────────────

export function MktCampaignWall() {
  const [tab, setTab] = useState<ChannelTab>("brevo");
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header row: channel tabs + action buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 2 }}>
          {CHANNEL_TABS.map(t => (
            <button key={t.id} onClick={() => t.ready && setTab(t.id)} style={{
              padding: "7px 14px", borderRadius: 8, border: "none",
              cursor: t.ready ? "pointer" : "default",
              background: tab === t.id ? "rgba(209,156,21,0.12)" : "transparent",
              color: tab === t.id ? "var(--mkt-accent)" : t.ready ? "var(--mkt-text-muted)" : "rgba(122,117,110,0.35)",
              fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? "2px solid var(--mkt-accent)" : "2px solid transparent",
            }}>
              {t.label}
              {!t.ready && <span style={{ fontSize: 9, marginLeft: 5, opacity: 0.55 }}>pronto</span>}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="https://app.brevo.com/campaigns" target="_blank" rel="noopener noreferrer"
            style={{ padding: "7px 13px", borderRadius: 8, border: "1px solid var(--mkt-border)", background: "transparent", color: "var(--mkt-text-muted)", fontSize: 12, fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            Ver en Brevo
          </a>
          <button onClick={() => setShowForm(true)} style={{ padding: "7px 15px", borderRadius: 8, border: "none", background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Nueva Campaña
          </button>
        </div>
      </div>

      {tab === "brevo"    && <BrevoCampaignGrid refreshTrigger={refreshTrigger} />}
      {tab === "linkedin" && <ComingSoonTab label="LinkedIn Ads" />}
      {tab === "meta"     && <ComingSoonTab label="Meta (Facebook / Instagram)" />}
      {tab === "google"   && <ComingSoonTab label="Google Ads" />}

      {showForm && (
        <CampaignFormModal
          onClose={() => setShowForm(false)}
          onCreated={() => setRefreshTrigger(x => x + 1)}
        />
      )}
    </div>
  );
}
