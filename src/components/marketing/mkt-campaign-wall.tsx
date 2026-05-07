"use client";

import React, { useEffect, useState } from "react";
import { useMkt } from "./mkt-provider";
import { mktFormatRelative } from "./mkt-utils";
import type { MktCampaign } from "./mkt-types";
import { MKT_CHANNELS } from "./mkt-types";

function rateColor(rate: number, [good, ok]: [number, number]): string {
  if (rate >= good) return "#22c55e";
  if (rate >= ok) return "#f59e0b";
  return "#ef4444";
}

function safeRate(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function StatusBadge({ status }: { status: MktCampaign["status"] }) {
  const cfg = {
    active: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Activa" },
    paused: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Pausada" },
    completed: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8", label: "Completada" },
  };
  const c = cfg[status] ?? cfg.active;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    brevo_email: { label: "Brevo Email", color: "#3b82f6" },
    linkedin: { label: "LinkedIn", color: "#0a66c2" },
    meta: { label: "Meta", color: "#1877f2" },
    google_ads: { label: "Google Ads", color: "#ea4335" },
    outbound: { label: "Outbound", color: "#8b5cf6" },
  };
  const c = labels[channel] ?? { label: channel, color: "#64748b" };
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
      background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}33`,
    }}>
      {c.label}
    </span>
  );
}

function AnimatedNum({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let raf: number;
    const start = Date.now();
    const duration = 800;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, value]);

  return <>{display}{suffix}</>;
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)",
  color: "var(--mkt-text)", fontSize: 13, outline: "none",
};

interface BrevoList {
  id: number;
  name: string;
  uniqueSubscribers: number;
}

function CampaignFormModal({ onClose }: { onClose: () => void }) {
  const { addCampaign } = useMkt();
  const [form, setForm] = useState({
    name: "",
    status: "active" as MktCampaign["status"],
    startDate: new Date().toISOString().split("T")[0],
    targetSegment: "",
    cadenceType: "outreach",
    channel: "brevo_email",
    totalContacts: 0,
    // Brevo email specific
    subject: "",
    htmlContent: "",
    listIds: [] as number[],
    scheduledAt: "",
    senderEmail: "daniel.acosta@blackscale.consulting",
  });

  const [brevoLists, setBrevoLists] = useState<BrevoList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load Brevo lists when channel is brevo_email
  useEffect(() => {
    if (form.channel === "brevo_email" || form.channel === "outbound") {
      setLoadingLists(true);
      fetch("/api/brevo/lists")
        .then(r => r.json())
        .then(d => setBrevoLists(d.lists || []))
        .catch(() => {})
        .finally(() => setLoadingLists(false));
    }
  }, [form.channel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      // If Brevo email: actually create the campaign in Brevo
      let brevoCampaignId = "";
      if (form.channel === "brevo_email" && form.subject && form.htmlContent && form.listIds.length > 0) {
        const res = await fetch("/api/brevo/campaigns/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            subject: form.subject,
            htmlContent: form.htmlContent,
            listIds: form.listIds,
            scheduledAt: form.scheduledAt || null,
            senderEmail: form.senderEmail,
          }),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); setSubmitting(false); return; }
        brevoCampaignId = String(data.id || data.campaigns?.[0]?.id || "");
      }

      addCampaign({
        name: form.name,
        status: form.status,
        startDate: new Date(form.startDate).getTime(),
        targetSegment: form.targetSegment,
        cadenceType: form.cadenceType,
        channel: form.channel,
        brevoCampaignId,
        totalContacts: Number(form.totalContacts) || form.listIds.length,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        conversions: 0,
        lastSent: null,
      });
      onClose();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const selectFieldStyle: React.CSSProperties = { ...fieldStyle, appearance: "none" };
  const isBrevoEmail = form.channel === "brevo_email";
  const isBrevoOutbound = form.channel === "outbound";
  const needsBrevoLists = isBrevoEmail || isBrevoOutbound;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{
        position: "relative", width: 520, maxHeight: "90vh", overflowY: "auto",
        background: "var(--mkt-surface)", borderRadius: 16,
        border: "1px solid var(--mkt-border)",
        padding: 24, boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--mkt-text)" }}>Nueva Campaña</h2>

        {error && (
          <div style={{
            padding: "8px 12px", borderRadius: 8, marginBottom: 12,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            fontSize: 12, color: "#ef4444",
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Campaign name */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
              Nombre *
            </label>
            <input required style={fieldStyle} placeholder="Ej: Outreach Q2 - Seguros Colombia"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          {/* Channel selector */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
              Canal *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {MKT_CHANNELS.map(ch => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setForm({ ...form, channel: ch.id })}
                  style={{
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${form.channel === ch.id ? "var(--mkt-accent)" : "var(--mkt-border)"}`,
                    background: form.channel === ch.id ? "rgba(209,156,21,0.08)" : "transparent",
                    color: form.channel === ch.id ? "var(--mkt-accent)" : "var(--mkt-text-muted)",
                    fontSize: 12, fontWeight: form.channel === ch.id ? 600 : 400,
                    textAlign: "left", transition: "all 0.15s",
                  }}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + cadence type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                Fecha inicio
              </label>
              <input type="date" style={fieldStyle} value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                Tipo
              </label>
              <select style={selectFieldStyle} value={form.cadenceType}
                onChange={e => setForm({ ...form, cadenceType: e.target.value })}>
                <option value="outreach">Outreach</option>
                <option value="nurturing">Nurturing</option>
                <option value="onboarding">Onboarding</option>
                <option value="event">Evento</option>
                <option value="welcome">Welcome</option>
                <option value="reengagement">Re-engagement</option>
              </select>
            </div>
          </div>

          {/* Segment / target */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
              Segmento objetivo
            </label>
            <input style={fieldStyle} placeholder="Ej: Tier 1 — Seguros Colombia"
              value={form.targetSegment} onChange={e => setForm({ ...form, targetSegment: e.target.value })} />
          </div>

          {/* Brevo-specific fields */}
          {needsBrevoLists && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                  Listas Brevo {loadingLists && <span style={{ color: "var(--mkt-accent)" }}>Cargando…</span>}
                </label>
                {brevoLists.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto" }}>
                    {brevoLists.map(list => (
                      <label key={list.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--mkt-text)", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={form.listIds.includes(list.id)}
                          onChange={e => setForm({
                            ...form,
                            listIds: e.target.checked
                              ? [...form.listIds, list.id]
                              : form.listIds.filter(id => id !== list.id),
                          })}
                          style={{ accentColor: "var(--mkt-accent)" }}
                        />
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
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                      Asunto del email *
                    </label>
                    <input style={fieldStyle} placeholder="Ej: Automatiza tu proceso de ventas en 30 días"
                      value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                      Contenido HTML
                    </label>
                    <textarea
                      style={{ ...fieldStyle, height: 100, resize: "vertical", fontFamily: "monospace", fontSize: 11 }}
                      placeholder="<p>Hola {{contact.FIRSTNAME}},</p>"
                      value={form.htmlContent}
                      onChange={e => setForm({ ...form, htmlContent: e.target.value })}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                        Remitente
                      </label>
                      <select style={selectFieldStyle} value={form.senderEmail}
                        onChange={e => setForm({ ...form, senderEmail: e.target.value })}>
                        <option value="daniel.acosta@blackscale.consulting">Daniel — BlackScale</option>
                        <option value="julian.vallejo@blackscale.consulting">Julian — BlackScale</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                        Programar para (opcional)
                      </label>
                      <input type="datetime-local" style={fieldStyle} value={form.scheduledAt}
                        onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Non-Brevo: just notes */}
          {!needsBrevoLists && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                Total contactos (estimado)
              </label>
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
            <button type="button" onClick={onClose} style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid var(--mkt-border)",
              background: "transparent", color: "var(--mkt-text)", fontSize: 13, cursor: "pointer",
            }}>Cancelar</button>
            <button type="submit" disabled={submitting} style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: submitting ? "rgba(209,156,21,0.5)" : "var(--mkt-accent)",
              color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: submitting ? "wait" : "pointer",
            }}>
              {submitting ? "Creando…" : "Crear Campaña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Brevo live stats overlay ──────────────────────────────────────────────
function LiveStatsPanel({ brevoCampaignId }: { brevoCampaignId: string }) {
  const [stats, setStats] = useState<null | Record<string, unknown>>(null);

  useEffect(() => {
    if (!brevoCampaignId) return;
    fetch(`/api/brevo/campaigns?id=${brevoCampaignId}`)
      .then(r => r.json())
      .then(d => {
        const campaign = d.campaigns?.find((c: Record<string, unknown>) => String(c.id) === brevoCampaignId);
        if (campaign?.statistics?.globalStats) setStats(campaign.statistics.globalStats);
      })
      .catch(() => {});
  }, [brevoCampaignId]);

  if (!stats) return null;

  return (
    <div style={{
      marginTop: 10, padding: "10px 12px", borderRadius: 8,
      background: "rgba(209,156,21,0.06)", border: "1px solid rgba(209,156,21,0.15)",
      fontSize: 11, color: "var(--mkt-text-muted)",
    }}>
      <div style={{ fontWeight: 600, color: "var(--mkt-accent)", marginBottom: 6 }}>Live stats desde Brevo</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Enviados", key: "sent" },
          { label: "Entregados", key: "delivered" },
          { label: "Abiertos", key: "uniqueOpens" },
          { label: "Clicks", key: "uniqueClicks" },
          { label: "Rebotados", key: "hardBounces" },
          { label: "Desuscritos", key: "unsubscriptions" },
        ].map(({ label, key }) => (
          <div key={key}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mkt-text)" }}>{String(stats[key] ?? 0)}</div>
            <div>{label}</div>
          </div>
        ))}
      </div>
      <a
        href="https://app.brevo.com/campaigns"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block", marginTop: 8,
          fontSize: 11, color: "var(--mkt-accent)", textDecoration: "none",
        }}
        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"}
        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"}
      >
        Ver en Brevo →
      </a>
    </div>
  );
}

export function MktCampaignWall() {
  const { campaigns } = useMkt();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>{campaigns.length} campañas registradas</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href="https://app.brevo.com/campaigns"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid var(--mkt-border)",
              background: "transparent", color: "var(--mkt-text-muted)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            Ver datos en Brevo
          </a>
          <button onClick={() => setShowForm(true)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>+ Nueva Campaña</button>
        </div>
      </div>

      {campaigns.length === 0 && (
        <div style={{
          padding: 40, textAlign: "center",
          color: "var(--mkt-text-muted)", fontSize: 13,
          background: "var(--mkt-surface)", borderRadius: 12,
          border: "1px solid var(--mkt-border)",
        }}>
          No hay campañas registradas. Crea la primera con el botón de arriba.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {campaigns.map(camp => {
          const openRate = safeRate(camp.openRate);
          const clickRate = safeRate(camp.clickRate);
          const replyRate = safeRate(camp.replyRate);

          return (
            <div key={camp.id}
              style={{
                padding: 18, borderRadius: 12, cursor: "pointer", transition: "border-color 0.2s, box-shadow 0.2s",
                background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "rgba(209,156,21,0.25)";
                el.style.boxShadow = "0 0 20px rgba(209,156,21,0.04)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "var(--mkt-border)";
                el.style.boxShadow = "none";
              }}
              onClick={() => setExpandedId(expandedId === camp.id ? null : camp.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "var(--mkt-text)" }}>{camp.name}</div>
                  <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{camp.targetSegment}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <StatusBadge status={camp.status} />
                  <ChannelBadge channel={camp.channel || "brevo_email"} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { label: "Open Rate", value: openRate, thresholds: [30, 15] as [number, number] },
                  { label: "Click Rate", value: clickRate, thresholds: [10, 5] as [number, number] },
                  { label: "Reply Rate", value: replyRate, thresholds: [5, 2] as [number, number] },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginBottom: 2 }}>{m.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: rateColor(m.value, m.thresholds) }}>
                      <AnimatedNum value={m.value} suffix="%" />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 11, color: "var(--mkt-text-muted)",
                paddingTop: 10, borderTop: "1px solid var(--mkt-border)",
              }}>
                <span>{camp.totalContacts} contactos</span>
                <span style={{ color: camp.conversions > 0 ? "var(--mkt-accent)" : "var(--mkt-text-muted)", fontWeight: 600 }}>
                  {camp.conversions} al pipeline
                </span>
                {camp.lastSent && <span>{mktFormatRelative(camp.lastSent)}</span>}
              </div>

              {expandedId === camp.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--mkt-border)" }}>
                  {camp.brevoCampaignId ? (
                    <LiveStatsPanel brevoCampaignId={camp.brevoCampaignId} />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--mkt-text)" }}>
                        Timeline
                      </div>
                      {[
                        { date: mktFormatRelative(camp.startDate), text: "Campaña creada" },
                        camp.lastSent ? { date: mktFormatRelative(camp.lastSent), text: "Último envío registrado" } : null,
                        { date: "—", text: camp.totalContacts > 0 ? `${camp.totalContacts} contactos en segmento` : "Sin contactos registrados" },
                      ].filter(Boolean).map((ev, j) => (
                        <div key={j} style={{ display: "flex", gap: 10, fontSize: 12 }}>
                          <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--mkt-accent)", marginTop: 5, flexShrink: 0 }} />
                          <div style={{ color: "var(--mkt-text)" }}>
                            <span style={{ color: "var(--mkt-text-muted)" }}>{ev!.date}</span>
                            <span style={{ marginLeft: 8 }}>{ev!.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && <CampaignFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
