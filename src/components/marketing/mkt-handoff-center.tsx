"use client";

import React, { useState } from "react";
import { useMkt } from "./mkt-provider";
import { mktFormatRelative } from "./mkt-utils";
import { MKT_SOURCES, MKT_SOURCE_LABELS } from "./mkt-types";
import type { MktContact } from "./mkt-types";

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)",
  color: "var(--mkt-text)", fontSize: 13, outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: "var(--mkt-text-muted)", marginBottom: 4,
  display: "block", textTransform: "uppercase", letterSpacing: "0.04em",
};

function TierBadge({ tier }: { tier: number }) {
  const colors: Record<number, { bg: string; text: string }> = {
    1: { bg: "var(--mkt-accent)", text: "#0a0a0a" },
    2: { bg: "rgba(255,255,255,0.1)", text: "var(--mkt-text-muted)" },
    3: { bg: "rgba(255,255,255,0.04)", text: "rgba(255,255,255,0.3)" },
  };
  const c = colors[tier] ?? colors[3];
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.bg, color: c.text }}>T{tier}</span>;
}

type NewLead = {
  name: string; company: string; email: string; phone: string;
  source: string; tier: number; brevoCadence: string; marketingNotes: string; industry: string;
};

const defaultLead: NewLead = {
  name: "", company: "", email: "", phone: "",
  source: "website", tier: 2, brevoCadence: "Cold Welcome", marketingNotes: "", industry: "",
};

export function MktHandoffCenter() {
  const { contacts, passToSales, addContact } = useMkt();
  const [newLead, setNewLead] = useState<NewLead>(defaultLead);

  const readyContacts = contacts.filter(c =>
    (c.readyForSales || c.engagementStatus === "hot") && !c.passedToSalesAt
  );
  const passedContacts = contacts
    .filter(c => c.passedToSalesAt)
    .sort((a, b) => (b.passedToSalesAt ?? 0) - (a.passedToSalesAt ?? 0));

  const cadences = [...new Set(contacts.map(c => c.brevoCadence))];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name.trim()) return;
    addContact(newLead);
    setNewLead(defaultLead);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Left: Ready to pass */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8, color: "var(--mkt-text)" }}>
          Listos para pasar a ventas
          <span style={{
            fontSize: 12, fontWeight: 600, padding: "1px 8px", borderRadius: 10,
            background: "var(--mkt-accent)", color: "#0a0a0a",
          }}>{readyContacts.length}</span>
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {readyContacts.length === 0 ? (
            <div style={{
              padding: 24, borderRadius: 12, textAlign: "center",
              color: "var(--mkt-text-muted)", fontSize: 13,
              background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)",
            }}>
              No hay leads listos para pasar
            </div>
          ) : readyContacts.map(c => (
            <div key={c.id} style={{
              padding: 14, borderRadius: 10, display: "flex", alignItems: "center", gap: 12,
              background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)" }}>{c.name}</span>
                  <TierBadge tier={c.tier} />
                </div>
                <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{c.company}</div>
                <div style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 2 }}>
                  {c.brevoCadence} · {mktFormatRelative(c.lastActivity)}
                </div>
              </div>
              <button onClick={() => passToSales(c.id)} style={{
                padding: "8px 14px", borderRadius: 8, border: "none",
                background: "var(--mkt-accent)", color: "#0a0a0a",
                fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}>
                Enviar a pipeline →
              </button>
            </div>
          ))}
        </div>

        {passedContacts.length > 0 && (
          <>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--mkt-text-muted)" }}>
              Enviados recientemente
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {passedContacts.slice(0, 5).map(c => (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  borderRadius: 8, background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.1)",
                }}>
                  <span style={{ fontSize: 12, color: "#22c55e" }}>✓</span>
                  <span style={{ fontSize: 12, flex: 1, color: "var(--mkt-text)" }}>{c.name} — {c.company}</span>
                  <span style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>
                    {mktFormatRelative(c.passedToSalesAt!)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right: Register new lead */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "var(--mkt-text)" }}>
          Registrar nuevo lead
        </h3>
        <div style={{ padding: 20, borderRadius: 12, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input required style={fieldStyle} value={newLead.name}
                onChange={e => setNewLead({ ...newLead, name: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Empresa</label>
                <input style={fieldStyle} value={newLead.company}
                  onChange={e => setNewLead({ ...newLead, company: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Industria</label>
                <input style={fieldStyle} placeholder="Ej: Tecnología" value={newLead.industry}
                  onChange={e => setNewLead({ ...newLead, industry: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" style={fieldStyle} value={newLead.email}
                  onChange={e => setNewLead({ ...newLead, email: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input style={fieldStyle} value={newLead.phone}
                  onChange={e => setNewLead({ ...newLead, phone: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Fuente</label>
                <select style={{ ...fieldStyle, appearance: "none" }} value={newLead.source}
                  onChange={e => setNewLead({ ...newLead, source: e.target.value })}>
                  {MKT_SOURCES.map(s => <option key={s} value={s}>{MKT_SOURCE_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tier</label>
                <select style={{ ...fieldStyle, appearance: "none" }} value={newLead.tier}
                  onChange={e => setNewLead({ ...newLead, tier: parseInt(e.target.value) })}>
                  <option value={1}>Tier 1</option>
                  <option value={2}>Tier 2</option>
                  <option value={3}>Tier 3</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Cadencia</label>
                <select style={{ ...fieldStyle, appearance: "none" }} value={newLead.brevoCadence}
                  onChange={e => setNewLead({ ...newLead, brevoCadence: e.target.value })}>
                  {cadences.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notas</label>
              <textarea style={{ ...fieldStyle, height: 60, resize: "vertical" }} value={newLead.marketingNotes}
                onChange={e => setNewLead({ ...newLead, marketingNotes: e.target.value })} />
            </div>
            <button type="submit" style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: "var(--mkt-accent)", color: "#0a0a0a",
              fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4,
            }}>
              Registrar Lead
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
