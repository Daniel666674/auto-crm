"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users, Download } from "lucide-react";
import { SOURCE_LABELS } from "@/lib/constants";
import type { Contact, Temperature, LeadSource } from "@/types";

const SOURCE_COLORS: Record<string, { bg: string; color: string }> = {
  website:        { bg: "#3b82f620", color: "#3b82f6" },
  referido:       { bg: "#22c55e20", color: "#22c55e" },
  redes_sociales: { bg: "#ec489920", color: "#ec4899" },
  formulario:     { bg: "#6366f120", color: "#6366f1" },
  evento:         { bg: "#f59e0b20", color: "#f59e0b" },
  llamada_fria:   { bg: "#f9731620", color: "#f97316" },
  whatsapp:       { bg: "#22c55e20", color: "#22c55e" },
  importado:      { bg: "#8b5cf620", color: "#8b5cf6" },
  import:         { bg: "#8b5cf620", color: "#8b5cf6" },
};

function getSourceStyle(source: string) {
  return SOURCE_COLORS[source] ?? { bg: "rgba(255,255,255,0.07)", color: "var(--muted-foreground)" };
}

function scoreTemp(score: number): { label: string; color: string; bg: string } {
  if (score >= 70) return { label: "Caliente", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
  if (score >= 55) return { label: "Tibio",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
  return               { label: "Frío",      color: "var(--muted-foreground)", bg: "rgba(255,255,255,0.06)" };
}

function scoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 55) return "#f59e0b";
  return "#ef4444";
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%", background: "var(--primary)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--primary-foreground)", fontSize: 11, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

interface ContactsTableProps {
  contacts: Contact[];
}

export function ContactsTable({ contacts }: ContactsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState<Temperature | "">("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const filtered = contacts
    .filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.company?.toLowerCase().includes(search.toLowerCase());
      const matchesTemp = !filterTemp || c.temperature === filterTemp;
      return matchesSearch && matchesTemp;
    })
    .sort((a, b) => sortDir === "desc" ? (b.score ?? 0) - (a.score ?? 0) : (a.score ?? 0) - (b.score ?? 0));

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No hay contactos"
        description="Agrega tu primer contacto para comenzar a gestionar tu pipeline de ventas."
        actionLabel="Agregar contacto"
        onAction={() => router.push("/contacts?new=true")}
      />
    );
  }

  const filters: Array<{ value: Temperature | ""; label: string }> = [
    { value: "", label: "Todos" },
    { value: "hot", label: "Caliente" },
    { value: "warm", label: "Tibio" },
    { value: "cold", label: "Frío" },
  ];

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
    cursor: "pointer", border: "1px solid var(--border)",
    background: active ? "var(--primary)" : "transparent",
    color: active ? "var(--primary-foreground)" : "var(--muted-foreground)",
    transition: "all 0.12s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--muted-foreground)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, email o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: 7,
              fontSize: 12, color: "var(--foreground)", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Temp filters */}
        {filters.map(f => (
          <button key={f.value} onClick={() => setFilterTemp(f.value)} style={pill(filterTemp === f.value)}>
            {f.label}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: "var(--border)" }} />

        {/* Sort direction */}
        <button style={pill(false)} onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>
          Score {sortDir === "desc" ? "↓" : "↑"}
        </button>

        {/* Export — same pill style, functional */}
        <button
          onClick={() => window.open("/api/export?type=contacts")}
          style={{ ...pill(false), display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <Download size={12} />
          Exportar
        </button>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "36px 2fr 1.2fr 1fr 110px 100px",
          padding: "10px 16px", borderBottom: "1px solid var(--border)",
          background: "var(--card)",
        }}>
          {["#", "Nombre", "Empresa", "Fuente", "Temperatura", "Score"].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>
            Sin resultados para &ldquo;{search}&rdquo;
          </div>
        ) : (
          filtered.map((contact, i) => {
            const temp = scoreTemp(contact.score ?? 0);
            const sc = scoreColor(contact.score ?? 0);
            return (
              <div
                key={contact.id}
                onClick={() => router.push(`/contacts/${contact.id}`)}
                style={{
                  display: "grid", gridTemplateColumns: "36px 2fr 1.2fr 1fr 110px 100px",
                  padding: "12px 16px", cursor: "pointer", alignItems: "center",
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                  background: i % 2 === 0 ? "var(--card)" : "var(--accent)",
                  transition: "filter 0.12s",
                }}
                onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
                onMouseLeave={e => (e.currentTarget.style.filter = "")}
              >
                {/* Rank */}
                <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>

                {/* Name + avatar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={contact.name} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.email || "—"}</div>
                  </div>
                </div>

                {/* Company */}
                <span style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {contact.company || "—"}
                </span>

                {/* Source badge */}
                {(() => {
                  const s = getSourceStyle(contact.source);
                  return (
                    <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: s.bg, color: s.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                      {SOURCE_LABELS[contact.source as LeadSource] || contact.source}
                    </span>
                  );
                })()}

                {/* Temperature badge — score-derived */}
                <div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: temp.bg, color: temp.color,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: temp.color, flexShrink: 0 }} />
                    {temp.label}
                  </span>
                </div>

                {/* Score bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ height: 5, width: 52, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(contact.score ?? 0, 100)}%`, borderRadius: 3, background: sc, transition: "width 0.5s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: sc, fontWeight: 600 }}>{contact.score ?? 0}</span>
                </div>

              </div>
            );
          })
        )}
      </div>

      <p style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
        {filtered.length} de {contacts.length} contactos
      </p>
    </div>
  );
}
