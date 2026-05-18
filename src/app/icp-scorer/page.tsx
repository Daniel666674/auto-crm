"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/types";

const ICP_INDUSTRIES = ["Tecnología", "Inmobiliaria", "Consultoría", "Salud", "Marketing", "Finanzas", "E-commerce", "Logística", "Educación", "Construcción"];
const ICP_GEOGRAPHIES = ["Colombia", "México", "Latinoamérica", "Global"];

function scoreColor(s: number) { return s >= 70 ? "#22c55e" : s >= 40 ? "#f59e0b" : "#ef4444"; }
function scoreLabel(s: number) { return s >= 70 ? "Alto ICP" : s >= 40 ? "Medio" : "Bajo ICP"; }

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: `${color}18`, color }}>{text}</span>;
}

type Criteria = { industry: string; companySizeMin: number; companySizeMax: number; role: string; geography: string; budgetSignal: string };

interface Breakdown { industry: number; temperature: number; leadScore: number; source: number; budget: number }

function scoreContact(c: Contact, criteria: Criteria): { total: number; breakdown: Breakdown } {
  let industry = 0, temperature = 0, leadScore = 0, source = 0, budget = 0;
  const nameLC = (c.company || "").toLowerCase();

  if (criteria.industry === "Tecnología" && (nameLC.includes("tech") || nameLC.includes("digital") || nameLC.includes("startup"))) industry = 25;
  else if (criteria.industry === "Inmobiliaria" && nameLC.includes("inmob")) industry = 25;
  else if (criteria.industry === "Salud" && (nameLC.includes("dental") || nameLC.includes("salud") || nameLC.includes("med"))) industry = 25;
  else if (criteria.industry === "Marketing" && (nameLC.includes("agencia") || nameLC.includes("market") || nameLC.includes("creativ"))) industry = 25;
  else industry = 5;

  if (c.temperature === "hot") temperature = 30;
  else if (c.temperature === "warm") temperature = 15;

  if ((c.score ?? 0) >= 70) leadScore = 25;
  else if ((c.score ?? 0) >= 40) leadScore = 12;

  if (["evento", "referido"].includes(c.source)) source = 15;
  else if (c.source === "website") source = 10;
  else source = 3;

  if (criteria.budgetSignal && c.notes && c.notes.toLowerCase().includes(criteria.budgetSignal.split(" ")[0].toLowerCase())) budget = 5;

  const total = Math.min(100, industry + temperature + leadScore + source + budget);
  return { total, breakdown: { industry, temperature, leadScore, source, budget } };
}

export default function ICPScorerPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    .map(c => ({ ...c, ...scoreContact(c, criteria) }))
    .sort((a, b) => b.total - a.total)
    .filter(c => c.total >= minScore);

  async function bulkRescore() {
    if (!confirm(`¿Actualizar el lead score de ${scored.length} contactos con su puntuación ICP actual?`)) return;
    setRescoring(true);
    let ok = 0, fail = 0;
    for (const c of scored) {
      try {
        const res = await fetch(`/api/contacts/${c.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score: c.total }) });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setRescoring(false);
    if (fail === 0) toast.success(`${ok} contactos actualizados`);
    else toast.error(`${ok} actualizados, ${fail} fallaron`);
    const fresh = await fetch("/api/contacts").then(r => r.json());
    setContacts(fresh);
  }

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

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Score mínimo: ≥{minScore}
            </label>
            <input type="range" min={0} max={100} step={10} value={minScore}
              onChange={e => setMinScore(+e.target.value)}
              style={{ width: "100%", accentColor: "var(--primary)" }} />
          </div>

          {/* Score legend */}
          <div style={{ borderRadius: 8, padding: "10px 12px", background: "var(--background)", border: "1px solid var(--border)", fontSize: 11, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Distribución de puntos</div>
            {[
              { label: "Industria (match)", max: 25 },
              { label: "Temperatura", max: 30 },
              { label: "Lead score", max: 25 },
              { label: "Fuente", max: 15 },
              { label: "Señal presupuesto", max: 5 },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", color: "var(--muted-foreground)", marginBottom: 3 }}>
                <span>{row.label}</span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>/{row.max}</span>
              </div>
            ))}
          </div>

          <button
            onClick={bulkRescore}
            disabled={rescoring || scored.length === 0}
            style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontWeight: 700, fontSize: 13, cursor: rescoring || scored.length === 0 ? "not-allowed" : "pointer", opacity: rescoring || scored.length === 0 ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {rescoring ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Actualizando...</> : `Aplicar como lead score (${scored.length})`}
          </button>
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
                <div key={c.id} style={{ borderRadius: 10, padding: 14, marginBottom: 8, background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
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
                        <span style={{ fontWeight: 700, color: scoreColor(c.total) }}>{c.total}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--border)" }}>
                        <div style={{ width: `${c.total}%`, height: "100%", borderRadius: 3, background: scoreColor(c.total), transition: "width 0.4s" }} />
                      </div>
                    </div>
                    <Badge text={scoreLabel(c.total)} color={scoreColor(c.total)} />
                  </div>

                  {/* Breakdown */}
                  {expandedId === c.id && (
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                      {[
                        { label: "Industria", val: c.breakdown.industry, max: 25 },
                        { label: "Temperatura", val: c.breakdown.temperature, max: 30 },
                        { label: "Lead score", val: c.breakdown.leadScore, max: 25 },
                        { label: "Fuente", val: c.breakdown.source, max: 15 },
                        { label: "Presupuesto", val: c.breakdown.budget, max: 5 },
                      ].map(row => {
                        const pct = (row.val / row.max) * 100;
                        const color = pct >= 70 ? "#22c55e" : pct >= 30 ? "#f59e0b" : "#ef4444";
                        return (
                          <div key={row.label} style={{ borderRadius: 8, padding: "8px 10px", background: "var(--background)", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 4 }}>{row.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color }}>{row.val}<span style={{ fontSize: 10, fontWeight: 400, color: "var(--muted-foreground)" }}>/{row.max}</span></div>
                            <div style={{ height: 3, borderRadius: 2, background: "var(--border)", marginTop: 5 }}>
                              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
