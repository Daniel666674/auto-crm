"use client";

import React, { useEffect, useState } from "react";

interface BrevoList {
  id: number;
  name: string;
  uniqueSubscribers: number;
  totalBlacklisted: number;
  createdAt?: string;
  folderId?: number;
}

const S: Record<string, React.CSSProperties> = {
  card: { background: "#111111", border: "1px solid #1e1e1e", borderRadius: 10 },
  th: { padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap" },
  td: { padding: "12px 14px", fontSize: 12, color: "#e2e8f0", borderBottom: "1px solid #1e1e1e", verticalAlign: "middle" },
  pill: (active: boolean): React.CSSProperties => ({ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "1px solid #1e1e1e", background: active ? "#C39A4C" : "transparent", color: active ? "#0a0a0a" : "#718096" }),
};

function HealthBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "#48bb78" : pct >= 60 ? "#C39A4C" : "#6D1F2E";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 60, height: 5, borderRadius: 3, background: "#1e1e1e", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: color }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{pct}%</span>
    </div>
  );
}

function calcHealth(list: BrevoList): number {
  const total = (list.uniqueSubscribers || 0) + (list.totalBlacklisted || 0);
  if (total === 0) return 100;
  return Math.round((list.uniqueSubscribers / total) * 100);
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 44, borderRadius: 8, background: "#111111", border: "1px solid #1e1e1e", animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

export function MktLists() {
  const [lists, setLists] = useState<BrevoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    fetch("/app/api/marketing/lists")
      .then(r => {
        const ct = r.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error(`Brevo no disponible (HTTP ${r.status}). Verifica la conexión del servidor.`);
        }
        return r.json();
      })
      .then(d => { if (d.error) setError(d.error); else setLists(d.lists || []); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true); setSaveError("");
    try {
      const r = await fetch("/app/api/marketing/lists", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const ct = r.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) throw new Error(`Brevo no disponible (HTTP ${r.status})`);
      const d = await r.json();
      if (d.error) { setSaveError(d.error); return; }
      setNewName(""); setShowModal(false); load();
    } catch (e: any) { setSaveError(String(e)); }
    finally { setSaving(false); }
  };

  const totalContacts = lists.reduce((s, l) => s + (l.uniqueSubscribers || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ ...S.card, padding: "8px 14px", fontSize: 12 }}>
            <span style={{ color: "#718096" }}>Listas </span>
            <span style={{ fontWeight: 700, color: "#C39A4C" }}>{lists.length}</span>
          </div>
          <div style={{ ...S.card, padding: "8px 14px", fontSize: 12 }}>
            <span style={{ color: "#718096" }}>Contactos totales </span>
            <span style={{ fontWeight: 700, color: "#C39A4C" }}>{totalContacts.toLocaleString("es-CO")}</span>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#C39A4C", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Nueva lista
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(109,31,46,0.15)", border: "1px solid #6D1F2E", fontSize: 12, color: "#f87171", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button onClick={load} style={{ background: "transparent", border: "1px solid #6D1F2E", borderRadius: 5, color: "#f87171", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>Reintentar</button>
        </div>
      )}

      {/* Table */}
      {loading ? <Skeleton /> : lists.length === 0 && !error ? (
        <div style={{ ...S.card, padding: "40px 0", textAlign: "center", fontSize: 13, color: "#718096" }}>
          No hay listas en Brevo. Crea la primera con el botón de arriba.
        </div>
      ) : (
        <div style={{ ...S.card, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Lista", "Contactos", "Bloqueados", "Health %", "Cadencia Activa"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lists.map((list, i) => {
                  const health = calcHealth(list);
                  const isLast = i === lists.length - 1;
                  const tdStyle = { ...S.td, borderBottom: isLast ? "none" : "1px solid #1e1e1e" };
                  return (
                    <tr key={list.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{list.name}</div>
                        <div style={{ fontSize: 10, color: "#718096" }}>ID {list.id}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600, color: "#C39A4C" }}>{(list.uniqueSubscribers || 0).toLocaleString("es-CO")}</span>
                      </td>
                      <td style={tdStyle}>
                        {(list.totalBlacklisted || 0) > 0
                          ? <span style={{ color: "#f87171" }}>{list.totalBlacklisted}</span>
                          : <span style={{ color: "#718096" }}>0</span>}
                      </td>
                      <td style={tdStyle}><HealthBar pct={health} /></td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 11, color: "#718096" }}>—</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Summary row */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid #1e1e1e", display: "flex", gap: 20, fontSize: 11, color: "#718096" }}>
            <span>{lists.length} listas · {totalContacts.toLocaleString("es-CO")} contactos totales</span>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => setShowModal(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
          <div style={{ position: "relative", width: 400, background: "#111111", border: "1px solid #1e1e1e", borderRadius: 14, padding: 24, boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>Nueva lista en Brevo</h2>
            {saveError && (
              <div style={{ padding: "8px 12px", borderRadius: 7, background: "rgba(109,31,46,0.15)", border: "1px solid #6D1F2E", fontSize: 12, color: "#f87171", marginBottom: 12 }}>{saveError}</div>
            )}
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Nombre de lista *</label>
                <input
                  required autoFocus
                  value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Ej: Tier 1 — Seguros Colombia"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #1e1e1e", background: "#0a0a0a", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #1e1e1e", background: "transparent", color: "#718096", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: saving ? "rgba(195,154,76,0.5)" : "#C39A4C", color: "#0a0a0a", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}>
                  {saving ? "Creando…" : "Crear lista"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
