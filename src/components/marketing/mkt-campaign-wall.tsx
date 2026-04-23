"use client";

import React, { useEffect, useState } from "react";
import { useMkt } from "./mkt-provider";
import { mktFormatRelative } from "./mkt-utils";
import type { MktCampaign } from "./mkt-types";

function rateColor(rate: number, [good, ok]: [number, number]): string {
  if (rate >= good) return "#22c55e";
  if (rate >= ok) return "#f59e0b";
  return "#ef4444";
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
    name: "", status: "active" as MktCampaign["status"],
    startDate: new Date().toISOString().split("T")[0],
    targetSegment: "", cadenceType: "outreach", totalContacts: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addCampaign({
      ...form,
      startDate: new Date(form.startDate).getTime(),
      totalContacts: Number(form.totalContacts) || 0,
    });
    onClose();
  };

  const selectFieldStyle: React.CSSProperties = { ...fieldStyle, appearance: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{
        position: "relative", width: 440, background: "var(--mkt-surface)",
        borderRadius: 16, border: "1px solid var(--mkt-border)",
        padding: 24, boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--mkt-text)" }}>Nueva Campaña</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input required style={fieldStyle} placeholder="Nombre de la campaña"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input type="date" style={fieldStyle} value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })} />
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
          <input style={fieldStyle} placeholder="Segmento objetivo"
            value={form.targetSegment} onChange={e => setForm({ ...form, targetSegment: e.target.value })} />
          <input type="number" style={fieldStyle} placeholder="Total contactos"
            value={form.totalContacts} onChange={e => setForm({ ...form, totalContacts: Number(e.target.value) })} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid var(--mkt-border)",
              background: "transparent", color: "var(--mkt-text)", fontSize: 13, cursor: "pointer",
            }}>Cancelar</button>
            <button type="submit" style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Crear</button>
          </div>
        </form>
      </div>
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
        <p style={{ fontSize: 13, color: "var(--mkt-text-muted)" }}>{campaigns.length} campañas registradas</p>
        <button onClick={() => setShowForm(true)} style={{
          padding: "8px 16px", borderRadius: 8, border: "none",
          background: "var(--mkt-accent)", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ Nueva Campaña</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {campaigns.map(camp => (
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "var(--mkt-text)" }}>{camp.name}</div>
                <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{camp.targetSegment}</div>
              </div>
              <StatusBadge status={camp.status} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[
                { label: "Open Rate", value: camp.openRate, thresholds: [30, 15] as [number, number] },
                { label: "Click Rate", value: camp.clickRate, thresholds: [10, 5] as [number, number] },
                { label: "Reply Rate", value: camp.replyRate, thresholds: [5, 2] as [number, number] },
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
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "var(--mkt-text)" }}>
                  Timeline de actividad
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { date: "Hace 2 días", text: `Batch enviado a ${Math.round(camp.totalContacts * 0.3)} contactos` },
                    { date: "Hace 5 días", text: `${Math.round(camp.totalContacts * camp.openRate / 100)} aperturas registradas` },
                    { date: "Hace 7 días", text: `Campaña ${camp.status === "active" ? "activada" : camp.status === "paused" ? "pausada" : "completada"}` },
                    { date: mktFormatRelative(camp.startDate), text: "Campaña creada" },
                  ].map((ev, j) => (
                    <div key={j} style={{ display: "flex", gap: 10, fontSize: 12 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: 3, background: "var(--mkt-accent)",
                        marginTop: 5, flexShrink: 0,
                      }} />
                      <div style={{ color: "var(--mkt-text)" }}>
                        <span style={{ color: "var(--mkt-text-muted)" }}>{ev.date}</span>
                        <span style={{ marginLeft: 8 }}>{ev.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && <CampaignFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
