"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users, Download } from "lucide-react";
import { formatDate } from "@/lib/constants";
import { SOURCE_LABELS } from "@/lib/constants";
import type { Contact, Temperature, LeadSource } from "@/types";

const TEMP_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  hot:  { label: "Caliente", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  warm: { label: "Tibio",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  cold: { label: "Frío",     color: "var(--muted-foreground)", bg: "rgba(255,255,255,0.06)" },
};

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

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase());
    const matchesTemp = !filterTemp || c.temperature === filterTemp;
    return matchesSearch && matchesTemp;
  });

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
              width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
              fontSize: 13, color: "var(--foreground)", outline: "none",
            }}
          />
        </div>

        {/* Temp filters */}
        <div style={{ display: "flex", gap: 6 }}>
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterTemp(f.value)}
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
                border: `1px solid ${filterTemp === f.value ? "var(--primary)" : "var(--border)"}`,
                background: filterTemp === f.value ? "rgba(209,156,21,0.12)" : "var(--card)",
                color: filterTemp === f.value ? "var(--primary)" : "var(--muted-foreground)",
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Export */}
        <button
          onClick={() => window.open("/api/export?type=contacts")}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)",
            fontSize: 12, color: "var(--muted-foreground)", cursor: "pointer",
          }}
        >
          <Download size={13} />
          Exportar
        </button>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 100px 80px 80px 90px",
          padding: "10px 16px", borderBottom: "1px solid var(--border)",
          background: "var(--card)",
        }}>
          {["Nombre", "Empresa", "Fuente", "Temperatura", "ICP Fit", "Engagement", "Fecha"].map(h => (
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
            const temp = TEMP_CONFIG[contact.temperature] ?? TEMP_CONFIG.cold;
            return (
              <div
                key={contact.id}
                onClick={() => router.push(`/contacts/${contact.id}`)}
                style={{
                  display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 100px 80px 80px 90px",
                  padding: "12px 16px", cursor: "pointer", alignItems: "center",
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                  background: "var(--card)", transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--card)")}
              >
                {/* Name + avatar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={contact.name} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.email || "—"}</div>
                  </div>
                </div>

                {/* Company */}
                <span style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {contact.company || "—"}
                </span>

                {/* Source */}
                <span style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {SOURCE_LABELS[contact.source as LeadSource] || contact.source}
                </span>

                {/* Temperature badge */}
                <div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: temp.bg, color: temp.color,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: temp.color, display: "inline-block" }} />
                    {temp.label}
                  </span>
                </div>

                {/* ICP Fit bar (Apollo score) */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ height: 4, width: 36, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${contact.score ?? 0}%`, borderRadius: 2, background: "var(--primary)" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{contact.score ?? 0}</span>
                </div>

                {/* Engagement bar (Brevo score, nullable) */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {contact.engagementScore != null ? (
                    <>
                      <div style={{ height: 4, width: 36, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${contact.engagementScore}%`, borderRadius: 2, background: "#2dd4bf" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#2dd4bf" }}>{contact.engagementScore}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.4 }}>—</span>
                  )}
                </div>

                {/* Date */}
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                  {formatDate(contact.createdAt)}
                </span>
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
