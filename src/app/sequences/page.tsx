"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Contact } from "@/types";

type Activity = { id: string; contactId: string; type: string; completedAt: number | null; createdAt: number };
type Row = Contact & { tier: number; daysSince: number; urgency: string; urgencyColor: string };

const urgencyLabel: Record<string, string> = { overdue: "Vencido", "due-today": "Pendiente", upcoming: "Al día" };

export default function SequencesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState("Todos");
  const [nextActions, setNextActions] = useState<Record<string, string>>({});
  const [logging, setLogging] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts").then(r => r.json()),
      fetch("/api/activities").then(r => r.json()),
    ]).then(([c, a]) => { setContacts(c); setActivities(a); setLoading(false); });
  }, []);

  const rows: Row[] = contacts.map(c => {
    const acts = activities
      .filter(a => a.contactId === c.id && a.completedAt)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    const lastAct = acts[0];
    const daysSince = lastAct?.completedAt
      ? Math.floor((Date.now() - lastAct.completedAt) / 86400000)
      : 99;
    const tier = c.temperature === "hot" ? 1 : c.temperature === "warm" ? 2 : 3;
    let urgency = "upcoming", urgencyColor = "var(--muted-foreground)";
    if (daysSince > 7) { urgency = "overdue"; urgencyColor = "#ef4444"; }
    else if (daysSince >= 3) { urgency = "due-today"; urgencyColor = "#f59e0b"; }
    return { ...c, tier, daysSince, urgency, urgencyColor };
  }).sort((a, b) => b.daysSince - a.daysSince);

  const filtered = tierFilter === "Todos" ? rows : rows.filter(r => String(r.tier) === tierFilter);

  const logInteraction = async (contactId: string) => {
    const description = nextActions[contactId]?.trim() || "Interacción registrada";
    setLogging(prev => ({ ...prev, [contactId]: true }));
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "follow_up", description, contactId, completedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Interacción registrada");
      setNextActions(prev => ({ ...prev, [contactId]: "" }));
      fetch("/api/activities").then(r => r.json()).then(setActivities);
    } catch {
      toast.error("Error al registrar interacción");
    } finally {
      setTimeout(() => setLogging(prev => ({ ...prev, [contactId]: false })), 1500);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Secuencias de Seguimiento</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Cola diaria de follow-ups ordenada por urgencia</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Filtrar por tier:</span>
        {["Todos", "1", "2", "3"].map(t => (
          <button key={t} onClick={() => setTierFilter(t)}
            style={{
              padding: "5px 14px", borderRadius: 20, border: "1px solid var(--border)", fontSize: 12,
              fontWeight: tierFilter === t ? 600 : 400, cursor: "pointer",
              background: tierFilter === t ? "var(--primary)" : "transparent",
              color: tierFilter === t ? "var(--primary-foreground)" : "var(--muted-foreground)",
            }}>
            {t === "Todos" ? "Todos" : `Tier ${t}`}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 12, color: "var(--muted-foreground)" }}>
          <span><span style={{ color: "#ef4444" }}>●</span> Vencido (&gt;7d)</span>
          <span><span style={{ color: "#f59e0b" }}>●</span> Pendiente (3–7d)</span>
          <span><span style={{ color: "var(--muted-foreground)" }}>●</span> Al día</span>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--muted-foreground)", fontSize: 13, padding: 24 }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted-foreground)" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 13 }}>No hay contactos para mostrar con este filtro</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(c => (
            <div key={c.id} style={{
              borderRadius: 10, padding: 14, borderLeft: `3px solid ${c.urgencyColor}`,
              display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
              background: "var(--card)", border: "1px solid var(--border)",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: `${c.urgencyColor}18`, display: "flex", alignItems: "center",
                justifyContent: "center", color: c.urgencyColor, fontWeight: 700, fontSize: 13,
              }}>
                {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{c.company || "—"}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "rgba(209,156,21,0.1)", color: "var(--primary)" }}>
                T{c.tier}
              </span>
              <div style={{ textAlign: "right", minWidth: 80 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: c.urgencyColor }}>
                  {c.daysSince === 99 ? "—" : `${c.daysSince}d`}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{urgencyLabel[c.urgency]}</div>
              </div>
              <input
                value={nextActions[c.id] || ""}
                onChange={e => setNextActions(prev => ({ ...prev, [c.id]: e.target.value }))}
                placeholder="Próxima acción..."
                style={{
                  flex: 2, minWidth: 160, padding: "7px 10px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--background)",
                  color: "var(--foreground)", fontSize: 12,
                }}
              />
              <button
                onClick={() => logInteraction(c.id)}
                disabled={logging[c.id]}
                style={{
                  padding: "7px 14px", borderRadius: 8, border: "1px solid var(--primary)",
                  background: logging[c.id] ? "var(--primary)" : "transparent",
                  color: logging[c.id] ? "var(--primary-foreground)" : "var(--primary)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const, transition: "all 0.2s",
                }}>
                {logging[c.id] ? "✓ Registrado" : "Registrar interacción"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
