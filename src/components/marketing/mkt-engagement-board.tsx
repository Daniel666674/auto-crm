"use client";

import React, { useState } from "react";
import { useMkt } from "./mkt-provider";
import { mktFormatRelative } from "./mkt-utils";
import type { MktContact } from "./mkt-types";
import { MKT_SOURCES, MKT_SOURCE_LABELS } from "./mkt-types";

const COLUMNS = [
  { id: "hot" as const, label: "HOT", icon: "🔥", tint: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.15)" },
  { id: "warm" as const, label: "WARM", icon: "👀", tint: "rgba(245,158,11,0.04)", borderColor: "rgba(245,158,11,0.15)" },
  { id: "cold" as const, label: "COLD", icon: "💤", tint: "rgba(100,116,139,0.04)", borderColor: "rgba(100,116,139,0.15)" },
  { id: "dead" as const, label: "DEAD", icon: "⛔", tint: "rgba(239,68,68,0.02)", borderColor: "rgba(100,116,139,0.1)" },
];

const selectStyle: React.CSSProperties = {
  padding: "6px 28px 6px 10px", borderRadius: 6,
  border: "1px solid var(--mkt-border)", background: "var(--mkt-surface)",
  color: "var(--mkt-text)", fontSize: 12, outline: "none", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
};

function TierBadge({ tier }: { tier: number }) {
  const colors: Record<number, { bg: string; text: string }> = {
    1: { bg: "var(--mkt-accent)", text: "#0a0a0a" },
    2: { bg: "rgba(255,255,255,0.1)", text: "var(--mkt-text-muted)" },
    3: { bg: "rgba(255,255,255,0.04)", text: "rgba(255,255,255,0.3)" },
  };
  const c = colors[tier] ?? colors[3];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.bg, color: c.text }}>
      T{tier}
    </span>
  );
}

function ContactCard({
  contact, isDragging, col, onDragStart, onDragEnd, onPassToSales,
}: {
  contact: MktContact;
  isDragging: boolean;
  col: typeof COLUMNS[number];
  onDragStart: (e: React.DragEvent, c: MktContact) => void;
  onDragEnd: () => void;
  onPassToSales: (id: string) => void;
}) {
  const scoreColor = contact.score >= 70 ? "#22c55e" : contact.score >= 40 ? "#f59e0b" : "var(--mkt-text-muted)";

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, contact)}
      onDragEnd={onDragEnd}
      style={{
        padding: 12, borderRadius: 8, cursor: "grab",
        background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)",
        opacity: isDragging ? 0.4 : 1, transition: "border-color 0.2s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(209,156,21,0.25)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--mkt-border)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)" }}>{contact.name}</div>
          <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{contact.company}</div>
        </div>
        <TierBadge tier={contact.tier} />
      </div>
      <div style={{ fontSize: 11, color: "var(--mkt-accent)", marginBottom: 6, opacity: 0.8 }}>
        {contact.brevoCadence}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--mkt-bg)", overflow: "hidden" }}>
          <div style={{ width: `${contact.score}%`, height: "100%", borderRadius: 2, background: scoreColor, transition: "width 0.8s" }} />
        </div>
        <span style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>{contact.score}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>
          {mktFormatRelative(contact.lastActivity)}
        </span>
        {(col.id === "hot" || col.id === "warm") && !contact.passedToSalesAt && (
          <button
            onClick={e => { e.stopPropagation(); onPassToSales(contact.id); }}
            style={{
              fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
              border: "1px solid var(--mkt-accent)", background: "transparent",
              color: "var(--mkt-accent)", cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = "var(--mkt-accent)"; b.style.color = "#0a0a0a"; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = "transparent"; b.style.color = "var(--mkt-accent)"; }}
          >
            Pasar a ventas →
          </button>
        )}
        {contact.passedToSalesAt && (
          <span style={{ fontSize: 10, color: "#22c55e" }}>✓ Enviado</span>
        )}
      </div>
    </div>
  );
}

export function MktEngagementBoard() {
  const { contacts, updateEngagement, passToSales } = useMkt();
  const [dragged, setDragged] = useState<MktContact | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState("");
  const [filterCadence, setFilterCadence] = useState("");
  const [filterSource, setFilterSource] = useState("");

  const cadences = [...new Set(contacts.map(c => c.brevoCadence))];

  const filtered = contacts.filter(c => {
    if (filterTier && c.tier !== parseInt(filterTier)) return false;
    if (filterCadence && c.brevoCadence !== filterCadence) return false;
    if (filterSource && c.source !== filterSource) return false;
    return true;
  });

  const handleDragStart = (e: React.DragEvent, contact: MktContact) => {
    setDragged(contact);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, colId: string) => { e.preventDefault(); setDragOver(colId); };
  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (dragged && dragged.engagementStatus !== colId) {
      updateEngagement(dragged.id, colId as MktContact["engagementStatus"]);
    }
    setDragged(null); setDragOver(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select style={selectStyle} value={filterTier} onChange={e => setFilterTier(e.target.value)}>
          <option value="">Todos los Tiers</option>
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
        </select>
        <select style={selectStyle} value={filterCadence} onChange={e => setFilterCadence(e.target.value)}>
          <option value="">Todas las cadencias</option>
          {cadences.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={selectStyle} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="">Todas las fuentes</option>
          {MKT_SOURCES.map(s => <option key={s} value={s}>{MKT_SOURCE_LABELS[s]}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {COLUMNS.map(col => {
          const colContacts = filtered.filter(c => c.engagementStatus === col.id);
          const isOver = dragOver === col.id;
          return (
            <div key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, col.id)}
              style={{
                flex: 1, minWidth: 240, display: "flex", flexDirection: "column",
                borderRadius: 12, background: isOver ? col.tint : "var(--mkt-surface)",
                border: `1px solid ${isOver ? "var(--mkt-accent)" : col.borderColor}`,
                transition: "all 0.2s",
              }}
            >
              <div style={{
                padding: "14px 14px 10px",
                borderBottom: `1px solid ${col.borderColor}`,
                background: col.tint, borderRadius: "12px 12px 0 0",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{col.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", color: "var(--mkt-text)" }}>
                    {col.label}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: "var(--mkt-text-muted)",
                    background: "var(--mkt-bg)", padding: "1px 8px",
                    borderRadius: 10, marginLeft: "auto",
                  }}>{colContacts.length}</span>
                </div>
              </div>

              <div style={{
                padding: 8, display: "flex", flexDirection: "column", gap: 6,
                minHeight: 120, flex: 1, overflowY: "auto",
                maxHeight: "calc(100vh - 260px)",
              }}>
                {colContacts.map(contact => (
                  <ContactCard key={contact.id} contact={contact}
                    isDragging={dragged?.id === contact.id} col={col}
                    onDragStart={handleDragStart} onDragEnd={() => { setDragged(null); setDragOver(null); }}
                    onPassToSales={passToSales}
                  />
                ))}
                {colContacts.length === 0 && (
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "var(--mkt-text-muted)", opacity: 0.4,
                  }}>Arrastra aquí</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
