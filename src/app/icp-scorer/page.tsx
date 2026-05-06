"use client";

import { useState, useEffect } from "react";
import type { Contact } from "@/types";

const ICP_INDUSTRIES = ["Tecnología", "Inmobiliaria", "Consultoría", "Salud", "Marketing", "Finanzas", "E-commerce", "Logística", "Educación", "Construcción"];
const ICP_GEOGRAPHIES = ["Colombia", "México", "Latinoamérica", "Global"];

function scoreColor(s: number) { return s >= 70 ? "#22c55e" : s >= 40 ? "#f59e0b" : "#ef4444"; }
function scoreLabel(s: number) { return s >= 70 ? "Alto ICP" : s >= 40 ? "Medio" : "Bajo ICP"; }

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: `${color}18`, color }}>{text}</span>;
}

type Criteria = { industry: string; companySizeMin: number; companySizeMax: number; role: string; geography: string; budgetSignal: string };

function scoreContact(c: Contact, criteria: Criteria): number {
  let score = 0;
  const nameLC = (c.company || "").toLowerCase();
  if (criteria.industry === "Tecnología" && (nameLC.includes("tech") || nameLC.includes("digital") || nameLC.includes("startup"))) score += 25;
  else if (criteria.industry === "Inmobiliaria" && nameLC.includes("inmob")) score += 25;
  else if (criteria.industry === "Salud" && (nameLC.includes("dental") || nameLC.includes("salud") || nameLC.includes("med"))) score += 25;
  else if (criteria.industry === "Marketing" && (nameLC.includes("agencia") || nameLC.includes("market") || nameLC.includes("creativ"))) score += 25;
  else score += 5;
  if (c.temperature === "hot") score += 30;
  else if (c.temperature === "warm") score += 15;
  if ((c.score ?? 0) >= 70) score += 25;
  else if ((c.score ?? 0) >= 40) score += 12;
  if (["evento", "referido"].includes(c.source)) score += 15;
  else if (c.source === "website") score += 10;
  else score += 3;
  if (criteria.budgetSignal && c.notes && c.notes.toLowerCase().includes(criteria.budgetSignal.split(" ")[0].toLowerCase())) score += 5;
  return Math.min(100, score);
}

export default function ICPScorerPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState<Criteria>({
    industry: "Tecnología", companySizeMin: 5, companySizeMax: 200,
    role: "CEO, Director, Gerente", geography: "Colombia", budgetSignal: "ha preguntado precios",
  });
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    fetch("/api/contacts").then(r => r.json()).then(d => { setContacts(d); setLoading(false); });
  }, []);

  const setCrit = (key: keyof Criteria, val: string | number) => setCriteria(prev => ({ ...prev, [key]: val }));

  const scored = contacts
    .map(c => ({ ...c, icpScore: scoreContact(c, criteria) }))
    .sort((a, b) => b.icpScore - a.icpScore)
    .filter(c => c.icpScore >= minScore);

  const field = (label: string, node: React.ReactNode) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>{label}</label>
      {node}
    </div>
  );

  const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13 };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>ICP Scorer</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Define criterios y puntúa cada contacto por ajuste al perfil ideal</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* Criteria panel */}
        <div style={{ borderRadius: 10, padding: 18, background: "var(--card)", border: "1px solid var(--border)", height: "fit-content" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Criterios ICP</div>

          {field("Industria objetivo",
            <select value={criteria.industry} onChange={e => setCrit("industry", e.target.value)} style={inputStyle}>
              {ICP_INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
          )}

          {field("Geografía",
            <select value={criteria.geography} onChange={e => setCrit("geography", e.target.value)} style={inputStyle}>
              {ICP_GEOGRAPHIES.map(g => <option key={g}>{g}</option>)}
            </select>
          )}

          {field("Tamaño empresa (empleados)",
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" value={criteria.companySizeMin} onChange={e => setCrit("companySizeMin", +e.target.value)} style={{ ...inputStyle, width: "auto", flex: 1 }} placeholder="Min" />
              <input type="number" value={criteria.companySizeMax} onChange={e => setCrit("companySizeMax", +e.target.value)} style={{ ...inputStyle, width: "auto", flex: 1 }} placeholder="Max" />
            </div>
          )}

          {field("Rol / Seniority",
            <input value={criteria.role} onChange={e => setCrit("role", e.target.value)} style={inputStyle} />
          )}

          {field("Señal de presupuesto",
            <input value={criteria.budgetSignal} onChange={e => setCrit("budgetSignal", e.target.value)} placeholder="ej. pidió precios" style={inputStyle} />
          )}

          <div>
            <label style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Score mínimo: ≥{minScore}
            </label>
            <input type="range" min={0} max={100} step={10} value={minScore}
              onChange={e => setMinScore(+e.target.value)}
              style={{ width: "100%", accentColor: "var(--primary)" }} />
          </div>
        </div>

        {/* Ranked contacts */}
        <div>
          {loading ? (
            <div style={{ color: "var(--muted-foreground)", fontSize: 13, padding: 24 }}>Cargando contactos...</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>
                {scored.length} contacto{scored.length !== 1 ? "s" : ""} · ordenados por ICP fit
              </div>
              {scored.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted-foreground)" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
                  <div style={{ fontSize: 13 }}>Ningún contacto supera el score mínimo con estos criterios</div>
                </div>
              ) : scored.map(c => (
                <div key={c.id} style={{ borderRadius: 10, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-foreground)", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{c.company || "—"} · {c.source}</div>
                  </div>
                  <div style={{ width: 140 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: "var(--muted-foreground)" }}>ICP Fit</span>
                      <span style={{ fontWeight: 700, color: scoreColor(c.icpScore) }}>{c.icpScore}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--border)" }}>
                      <div style={{ width: `${c.icpScore}%`, height: "100%", borderRadius: 3, background: scoreColor(c.icpScore), transition: "width 0.4s" }} />
                    </div>
                  </div>
                  <Badge text={scoreLabel(c.icpScore)} color={scoreColor(c.icpScore)} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
