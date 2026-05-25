"use client";

import React, { useMemo, useState } from "react";
import { useMkt } from "./mkt-provider";
import type { MktContact } from "./mkt-types";
import { MKT_INDUSTRIES } from "./mkt-types";

// ── Filter panel styles ────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1px solid var(--mkt-border)", background: "var(--mkt-bg)",
  color: "var(--mkt-text)", fontSize: 12, outline: "none", appearance: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "var(--mkt-text-muted)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block",
};

const SENIORITY_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "founder", label: "Founder / Owner" },
  { value: "ceo", label: "CEO / C-Suite" },
  { value: "vp", label: "VP" },
  { value: "director", label: "Director / Head" },
  { value: "manager", label: "Manager / Senior" },
];

const SIZE_OPTIONS = [
  { value: "", label: "Cualquier tamaño" },
  { value: "1-10", label: "1–10 empleados" },
  { value: "11-50", label: "11–50 empleados" },
  { value: "51-200", label: "51–200 empleados" },
  { value: "201-500", label: "201–500 empleados" },
  { value: "501-1000", label: "501–1000 empleados" },
  { value: "1001+", label: "1001+ empleados" },
];

function sizeInRange(companySize: string, filter: string): boolean {
  if (!filter) return true;
  const num = parseInt(companySize) || 0;
  switch (filter) {
    case "1-10": return num >= 1 && num <= 10;
    case "11-50": return num >= 11 && num <= 50;
    case "51-200": return num >= 51 && num <= 200;
    case "201-500": return num >= 201 && num <= 500;
    case "501-1000": return num >= 501 && num <= 1000;
    case "1001+": return num > 1000;
    default: return true;
  }
}

// ── Tier badge ────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: number }) {
  const colors: Record<number, { bg: string; text: string }> = {
    1: { bg: "var(--mkt-accent)", text: "#0a0a0a" },
    2: { bg: "rgba(255,255,255,0.1)", text: "var(--mkt-text-muted)" },
    3: { bg: "rgba(255,255,255,0.04)", text: "rgba(255,255,255,0.3)" },
    4: { bg: "rgba(239,68,68,0.1)", text: "#ef4444" },
  };
  const c = colors[tier] ?? colors[3];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.bg, color: c.text, flexShrink: 0 }}>
      T{tier}
    </span>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--mkt-bg)", overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 30 }}>{score}</span>
    </div>
  );
}

// ── Contact row ───────────────────────────────────────────────────────────
function ContactRow({ contact, rank }: { contact: MktContact; rank: number }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "32px 1fr 140px 160px 80px 60px",
      alignItems: "center", gap: 12,
      padding: "12px 16px", borderRadius: 10,
      background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)",
      transition: "border-color 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(209,156,21,0.2)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--mkt-border)"}
    >
      {/* Rank */}
      <span style={{ fontSize: 11, color: "var(--mkt-text-muted)", textAlign: "center" }}>{rank}</span>

      {/* Name + Company + Title */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)", marginBottom: 1 }}>
          {contact.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>
          {contact.company}
          {contact.jobTitle ? ` · ${contact.jobTitle}` : ""}
        </div>
        {contact.industry && (
          <div style={{ fontSize: 10, color: "var(--mkt-accent)", marginTop: 2 }}>{contact.industry}</div>
        )}
      </div>

      {/* Location + Size */}
      <div style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>
        {contact.location && <div>{contact.location}</div>}
        {contact.companySize && <div>{contact.companySize} emp.</div>}
      </div>

      {/* LinkedIn */}
      <div>
        {contact.linkedinUrl ? (
          <a
            href={contact.linkedinUrl.startsWith("http") ? contact.linkedinUrl : `https://${contact.linkedinUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11, color: "var(--mkt-accent)", textDecoration: "none",
              display: "flex", alignItems: "center", gap: 4,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </a>
        ) : (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>—</span>
        )}
      </div>

      {/* Score bar */}
      <ScoreBar score={contact.score} />

      {/* Tier */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <TierBadge tier={contact.tier} />
      </div>
    </div>
  );
}

// ── Main ICP Scorer ───────────────────────────────────────────────────────
export function MktIcpScorer() {
  const { contacts, recalculateScores, syncing } = useMkt();

  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterSize, setFilterSize] = useState("");
  const [filterSeniority, setFilterSeniority] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterBudget, setFilterBudget] = useState(false);
  const [filterTier, setFilterTier] = useState("");
  const [minScore, setMinScore] = useState(0);

  const filtered = useMemo(() => {
    return contacts
      .filter(c => {
        if (filterTier && c.tier !== parseInt(filterTier)) return false;
        if (filterIndustry && !c.industry.toLowerCase().includes(filterIndustry.toLowerCase())) return false;
        if (filterSize && !sizeInRange(c.companySize, filterSize)) return false;
        if (filterSeniority) {
          const title = c.jobTitle.toLowerCase();
          if (filterSeniority === "founder" && !title.match(/founder|owner|propietario|fundador/)) return false;
          if (filterSeniority === "ceo" && !title.match(/ceo|cto|coo|cmo|cfo|c-suite|chief/)) return false;
          if (filterSeniority === "vp" && !title.match(/vp|vice president|vicepresidente/)) return false;
          if (filterSeniority === "director" && !title.match(/director|head of|head,/)) return false;
          if (filterSeniority === "manager" && !title.match(/manager|gerente|senior/)) return false;
        }
        if (filterLocation && !c.location.toLowerCase().includes(filterLocation.toLowerCase())) return false;
        if (filterBudget && c.emailClicks === 0) return false; // clicked email = budget signal
        if (c.score < minScore) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [contacts, filterTier, filterIndustry, filterSize, filterSeniority, filterLocation, filterBudget, minScore]);

  const tier1 = filtered.filter(c => c.tier === 1).length;
  const tier2 = filtered.filter(c => c.tier === 2).length;
  const tier3 = filtered.filter(c => c.tier >= 3).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>
      {/* Filter Panel */}
      <div style={{
        padding: 16, borderRadius: 12,
        background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mkt-text)", letterSpacing: "0.04em" }}>
          FILTROS ICP
        </div>

        <div>
          <label style={labelStyle}>Tier</label>
          <select style={selectStyle} value={filterTier} onChange={e => setFilterTier(e.target.value)}>
            <option value="">Todos los Tiers</option>
            <option value="1">Tier 1 (70+)</option>
            <option value="2">Tier 2 (45–69)</option>
            <option value="3">Tier 3 (20–44)</option>
            <option value="4">Tier 4 (&lt;20)</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Industria Objetivo</label>
          <select style={selectStyle} value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)}>
            <option value="">Todas</option>
            {MKT_INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Tamaño de Empresa</label>
          <select style={selectStyle} value={filterSize} onChange={e => setFilterSize(e.target.value)}>
            {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Rol / Seniority</label>
          <select style={selectStyle} value={filterSeniority} onChange={e => setFilterSeniority(e.target.value)}>
            {SENIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Geografía</label>
          <input
            style={selectStyle}
            placeholder="Ej: Colombia, Bogotá"
            value={filterLocation}
            onChange={e => setFilterLocation(e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>Score mínimo</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="range" min={0} max={100} step={5}
              value={minScore}
              onChange={e => setMinScore(parseInt(e.target.value))}
              style={{ flex: 1, accentColor: "var(--mkt-accent)" }}
            />
            <span style={{ fontSize: 12, color: "var(--mkt-accent)", fontWeight: 700, minWidth: 24 }}>{minScore}</span>
          </div>
        </div>

        <div>
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={filterBudget}
              onChange={e => setFilterBudget(e.target.checked)}
              style={{ accentColor: "var(--mkt-accent)" }}
            />
            Señal de presupuesto
          </label>
          <p style={{ fontSize: 10, color: "var(--mkt-text-muted)", marginTop: 4 }}>
            Solo contactos que han clickeado emails (señal de interés activo)
          </p>
        </div>

        <button
          onClick={() => { setFilterTier(""); setFilterIndustry(""); setFilterSize(""); setFilterSeniority(""); setFilterLocation(""); setFilterBudget(false); setMinScore(0); }}
          style={{
            padding: "8px", borderRadius: 8, border: "1px solid var(--mkt-border)",
            background: "transparent", color: "var(--mkt-text-muted)", fontSize: 11, cursor: "pointer",
          }}
        >
          Limpiar filtros
        </button>

        <div style={{ borderTop: "1px solid var(--mkt-border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            onClick={recalculateScores}
            disabled={syncing}
            style={{
              padding: "9px 12px", borderRadius: 8, border: "none",
              background: syncing ? "rgba(209,156,21,0.3)" : "var(--mkt-accent)",
              color: "#0a0a0a", fontSize: 12, fontWeight: 600, cursor: syncing ? "wait" : "pointer",
            }}
          >
            {syncing ? "Calculando…" : "Recalcular Scores"}
          </button>
          <p style={{ fontSize: 10, color: "var(--mkt-text-muted)" }}>
            Actualiza SCORE y TIER según el algoritmo ICP.
          </p>
        </div>
      </div>

      {/* Main List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Summary bar */}
        <div style={{
          display: "flex", gap: 12, padding: "12px 16px",
          borderRadius: 10, background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)",
          alignItems: "center", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mkt-text)", flex: 1 }}>
            {filtered.length} contactos
          </span>
          {[
            { label: "Tier 1", count: tier1, color: "var(--mkt-accent)" },
            { label: "Tier 2", count: tier2, color: "rgba(255,255,255,0.5)" },
            { label: "Tier 3+", count: tier3, color: "rgba(255,255,255,0.2)" },
          ].map(b => (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--mkt-text-muted)" }}>{b.label}:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: b.color }}>{b.count}</span>
            </div>
          ))}
        </div>

        {/* Column headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr 140px 160px 80px 60px",
          gap: 12, padding: "6px 16px",
          fontSize: 10, fontWeight: 600, color: "var(--mkt-text-muted)",
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          <span>#</span>
          <span>Contacto</span>
          <span>Ubicación / Tamaño</span>
          <span>LinkedIn</span>
          <span>Score ICP</span>
          <span style={{ textAlign: "center" }}>Tier</span>
        </div>

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: 40, textAlign: "center",
              color: "var(--mkt-text-muted)", fontSize: 13,
              background: "var(--mkt-surface)", borderRadius: 10,
              border: "1px solid var(--mkt-border)",
            }}>
              No hay contactos con estos filtros.
              {contacts.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  Agrega contactos usando el módulo de contactos de marketing.
                </div>
              )}
            </div>
          ) : (
            filtered.map((c, i) => <ContactRow key={c.id} contact={c} rank={i + 1} />)
          )}
        </div>
      </div>
    </div>
  );
}
