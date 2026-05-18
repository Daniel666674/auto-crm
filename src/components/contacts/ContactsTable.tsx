"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users, Download } from "lucide-react";
import { SOURCE_LABELS } from "@/lib/constants";
import type { Contact, Temperature, LeadSource } from "@/types";

const TEMP_CFG = {
  hot:  { label: "Caliente", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  warm: { label: "Tibio",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  cold: { label: "Frío",     color: "var(--muted-foreground)", bg: "rgba(255,255,255,0.06)" },
} as const;

const SRC_COLORS: Record<string, { bg: string; color: string }> = {
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

function scoreColor(s: number) {
  return s >= 70 ? "#22c55e" : s >= 40 ? "#f59e0b" : "#ef4444";
}

interface ContactsTableProps { contacts: Contact[]; }

export function ContactsTable({ contacts }: ContactsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState<Temperature | "">("");
  const [sortBy, setSortBy] = useState<"score" | "name" | "company" | "industry">("score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const filtered = contacts
    .filter(c => {
      const q = search.toLowerCase();
      const ok = !search || c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
        || c.company?.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q);
      return ok && (!filterTemp || c.temperature === filterTemp);
    })
    .sort((a, b) => {
      let diff = 0;
      if (sortBy === "score") diff = (a.score ?? 0) - (b.score ?? 0);
      else if (sortBy === "name") diff = a.name.localeCompare(b.name);
      else if (sortBy === "company") diff = (a.company || "").localeCompare(b.company || "");
      else if (sortBy === "industry") diff = (a.industry || "").localeCompare(b.industry || "");
      return sortDir === "desc" ? -diff : diff;
    });

  if (contacts.length === 0) {
    return <EmptyState icon={Users} title="No hay contactos" description="Agrega tu primer contacto para comenzar." actionLabel="Agregar contacto" onAction={() => router.push("/contacts?new=true")} />;
  }

  const counts = {
    hot: contacts.filter(c => c.temperature === "hot").length,
    warm: contacts.filter(c => c.temperature === "warm").length,
    cold: contacts.filter(c => c.temperature === "cold").length,
  };

  const cell: React.CSSProperties = { padding: "10px 12px", fontSize: 12, borderBottom: "1px solid var(--border)", verticalAlign: "middle" };
  const hcell: React.CSSProperties = { ...cell, fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, background: "var(--card)", textTransform: "uppercase", letterSpacing: "0.04em" };
  const pill = (active: boolean): React.CSSProperties => ({
    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer",
    border: "1px solid var(--border)",
    background: active ? "var(--primary)" : "transparent",
    color: active ? "var(--primary-foreground)" : "var(--muted-foreground)",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Summary chips */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "Total", value: contacts.length },
          { label: "Caliente", value: counts.hot, color: "#ef4444" },
          { label: "Tibio", value: counts.warm, color: "#f59e0b" },
          { label: "Frío", value: counts.cold },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: "8px 14px", borderRadius: 8, background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }}>
            <span style={{ color: "var(--muted-foreground)" }}>{label} </span>
            <span style={{ fontWeight: 700, color: color ?? "var(--foreground)" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--muted-foreground)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre, email, empresa, industria…" style={{ width: "100%", paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
        </div>
        {([["", "Todos"], ["hot", "Caliente"], ["warm", "Tibio"], ["cold", "Frío"]] as const).map(([v, l]) => (
          <button key={v} style={pill(filterTemp === v)} onClick={() => setFilterTemp(v)}>{l}</button>
        ))}
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ padding: "4px 8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 11, cursor: "pointer" }}>
          <option value="score">Score</option>
          <option value="name">Nombre</option>
          <option value="company">Empresa</option>
          <option value="industry">Industria</option>
        </select>
        <button style={pill(false)} onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>{sortDir === "desc" ? "↓" : "↑"}</button>
        <button onClick={() => window.open("/api/export?type=contacts")} style={{ ...pill(false), display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Download size={12} /> Exportar
        </button>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr>
              {["#", "Nombre", "Empresa", "Industria", "Cargo", "Ubicación", "Score", "Fuente", "Temperatura"].map(h => (
                <th key={h} style={hcell}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ ...cell, textAlign: "center", color: "var(--muted-foreground)", padding: "32px 0" }}>Sin resultados</td></tr>
            ) : filtered.map((c, i) => {
              const temp = TEMP_CFG[c.temperature as keyof typeof TEMP_CFG] ?? TEMP_CFG.cold;
              const sc = scoreColor(c.score ?? 0);
              const src = SRC_COLORS[c.source] ?? { bg: "rgba(255,255,255,0.07)", color: "var(--muted-foreground)" };
              return (
                <tr
                  key={c.id}
                  style={{ background: i % 2 === 0 ? "transparent" : "var(--card)", cursor: "pointer", transition: "filter 0.1s" }}
                  onClick={() => router.push(`/contacts/${c.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
                  onMouseLeave={e => (e.currentTarget.style.filter = "")}
                >
                  <td style={{ ...cell, color: "var(--muted-foreground)", width: 32 }}>{i + 1}</td>
                  <td style={cell}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{c.email || "—"}</div>
                  </td>
                  <td style={cell}>{c.company || "—"}</td>
                  <td style={cell}>{c.industry || "—"}</td>
                  <td style={cell}>{c.title || "—"}</td>
                  <td style={cell}>{c.location || "—"}</td>
                  <td style={cell}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 48, height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: sc, width: `${Math.min(c.score ?? 0, 100)}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: sc, fontWeight: 600 }}>{c.score ?? 0}</span>
                    </div>
                  </td>
                  <td style={cell}>
                    <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: src.bg, color: src.color }}>
                      {SOURCE_LABELS[c.source as LeadSource] || c.source}
                    </span>
                  </td>
                  <td style={cell}>
                    <span style={{ padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: temp.bg, color: temp.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: temp.color, flexShrink: 0 }} />
                      {temp.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
        {filtered.length} de {contacts.length} contactos
      </p>
    </div>
  );
}
