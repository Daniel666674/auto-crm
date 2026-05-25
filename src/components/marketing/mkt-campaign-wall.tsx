"use client";

import React, { useEffect, useState } from "react";
import { useMkt } from "./mkt-provider";
import { mktFormatRelative } from "./mkt-utils";
import type { MktCampaign } from "./mkt-types";
import { MKT_CHANNELS } from "./mkt-types";
import { BSCardLoader } from "@/components/ui/BSCardLoader";

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
    email:      { label: "Email",     color: "#3b82f6" },
    linkedin:   { label: "LinkedIn",  color: "#0a66c2" },
    facebook:   { label: "Facebook",  color: "#1877f2" },
    instagram:  { label: "Instagram", color: "#e1306c" },
    meta:       { label: "Meta",      color: "#1877f2" },
    google_ads: { label: "Google Ads", color: "#ea4335" },
    google:     { label: "Google",    color: "#ea4335" },
    outbound:   { label: "Outbound",  color: "#8b5cf6" },
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

function CampaignFormModal({ onClose }: { onClose: () => void }) {
  const { addCampaign } = useMkt();
  const [form, setForm] = useState({
    name: "",
    status: "active" as MktCampaign["status"],
    startDate: new Date().toISOString().split("T")[0],
    targetSegment: "",
    cadenceType: "outreach",
    channel: "email",
    totalContacts: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      addCampaign({
        name: form.name,
        status: form.status,
        startDate: new Date(form.startDate).getTime(),
        targetSegment: form.targetSegment,
        cadenceType: form.cadenceType,
        channel: form.channel,
        totalContacts: Number(form.totalContacts) || 0,
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

          {/* Total contacts */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
              Total contactos (estimado)
            </label>
            <input type="number" style={fieldStyle} placeholder="0"
              value={form.totalContacts} onChange={e => setForm({ ...form, totalContacts: Number(e.target.value) })} />
            <p style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 6 }}>
              {form.channel === "linkedin" && "Configura esta campaña en LinkedIn Campaign Manager."}
              {form.channel === "meta" && "Configura esta campaña en Meta Business Manager (FB + IG)."}
              {form.channel === "facebook" && "Configura esta campaña en Meta Business Manager (Facebook)."}
              {form.channel === "instagram" && "Configura esta campaña en Meta Business Manager (Instagram)."}
              {form.channel === "google_ads" && "Configura esta campaña en Google Ads."}
            </p>
          </div>

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

// Platform filter options — maps user-facing labels to channel ids
const PLATFORM_FILTERS: { id: string; label: string; matches: (channel: string) => boolean }[] = [
  { id: "all",       label: "Todas",     matches: () => true },
  { id: "email",     label: "Email",     matches: c => c === "email" || c === "outbound" },
  { id: "linkedin",  label: "LinkedIn",  matches: c => c === "linkedin" },
  { id: "facebook",  label: "Facebook",  matches: c => c === "meta" || c === "facebook" },
  { id: "instagram", label: "Instagram", matches: c => c === "meta" || c === "instagram" },
  { id: "google",    label: "Google",    matches: c => c === "google_ads" || c === "google" },
];

export function MktCampaignWall() {
  const { campaigns } = useMkt();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const activeFilter = PLATFORM_FILTERS.find(f => f.id === platformFilter) ?? PLATFORM_FILTERS[0];
  const displayCampaigns: MktCampaign[] = campaigns.filter(c =>
    activeFilter.matches((c.channel ?? "email").toLowerCase())
  );

  const platformCounts: Record<string, number> = {};
  for (const f of PLATFORM_FILTERS) {
    platformCounts[f.id] = campaigns.filter(c =>
      f.matches((c.channel ?? "email").toLowerCase())
    ).length;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>
            {displayCampaigns.length} campañas registradas
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowForm(true)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>+ Nueva Campaña</button>
        </div>
      </div>

      {/* Platform filter pills */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--mkt-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4 }}>
          Plataforma
        </span>
        {PLATFORM_FILTERS.map(f => {
          const active = platformFilter === f.id;
          const count = platformCounts[f.id] ?? 0;
          return (
            <button
              key={f.id}
              onClick={() => setPlatformFilter(f.id)}
              style={{
                padding: "5px 11px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${active ? "var(--mkt-accent)" : "var(--mkt-border)"}`,
                background: active ? "rgba(209,156,21,0.10)" : "transparent",
                color: active ? "var(--mkt-accent)" : "var(--mkt-text-muted)",
                fontSize: 11, fontWeight: active ? 600 : 500,
                display: "inline-flex", alignItems: "center", gap: 6,
                transition: "all 0.12s",
              }}
            >
              {f.label}
              <span style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 999,
                background: active ? "rgba(209,156,21,0.20)" : "rgba(255,255,255,0.06)",
                color: active ? "var(--mkt-accent)" : "var(--mkt-text-muted)",
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {displayCampaigns.length === 0 && (
        <div style={{
          padding: 40, textAlign: "center",
          color: "var(--mkt-text-muted)", fontSize: 13,
          background: "var(--mkt-surface)", borderRadius: 12,
          border: "1px solid var(--mkt-border)",
        }}>
          {platformFilter === "all"
            ? "No hay campañas registradas. Crea la primera con el botón de arriba."
            : `No hay campañas en ${activeFilter.label}. Prueba con otra plataforma o crea una nueva.`}
        </div>
      )}

      <BSCardLoader loading={false} label="Cargando campañas…">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {displayCampaigns.map(camp => {
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
                  <ChannelBadge channel={camp.channel || "email"} />
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
                </div>
              )}
            </div>
          );
        })}
      </div>
      </BSCardLoader>

      {showForm && <CampaignFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
