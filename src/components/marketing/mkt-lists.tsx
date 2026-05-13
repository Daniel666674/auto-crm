"use client";

import React, { useEffect, useState, useCallback } from "react";

type BrevoList = {
  id: number;
  name: string;
  totalSubscribers: number;
  uniqueSubscribers: number;
  totalBlacklisted: number;
};

type Tab = "lists" | "contacts";

function healthColor(pct: number) {
  if (pct >= 85) return "#22c55e";
  if (pct >= 70) return "#f59e0b";
  return "#ef4444";
}

export function MktLists() {
  const [lists, setLists] = useState<BrevoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("lists");

  const load = useCallback(() => {
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
      .then(d => {
        if (d.error) throw new Error(d.error);
        setLists(d.lists || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalContacts = lists.reduce((s, l) => s + (l.uniqueSubscribers || 0), 0);
  const totalBlacklisted = lists.reduce((s, l) => s + (l.totalBlacklisted || 0), 0);
  const totalActive = totalContacts - totalBlacklisted;

  const tabStyle = (id: Tab): React.CSSProperties => ({
    padding: "6px 16px", borderRadius: 6,
    border: "1px solid var(--mkt-border)",
    background: tab === id ? "rgba(209,156,21,0.08)" : "transparent",
    color: tab === id ? "var(--mkt-accent)" : "var(--mkt-text-muted)",
    fontSize: 13, fontWeight: tab === id ? 600 : 400, cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Top row: tabs + action */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={tabStyle("lists")} onClick={() => setTab("lists")}>
            Listas {loading ? "…" : lists.length}
          </button>
          <button style={tabStyle("contacts")} onClick={() => setTab("contacts")}>
            Contactos totales {loading ? "…" : totalContacts.toLocaleString("es-CO")}
          </button>
        </div>
        <a
          href="https://app.brevo.com/contact/list"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "var(--mkt-accent)", color: "#0a0a0a",
            fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none",
          }}
        >
          + Nueva lista
        </a>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 16px", borderRadius: 8, marginBottom: 16,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
          fontSize: 12, color: "#ef4444",
        }}>
          <span>Error: {error}</span>
          <button
            onClick={load}
            style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: "1px solid rgba(239,68,68,0.5)", background: "transparent",
              color: "#ef4444", cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ fontSize: 13, color: "var(--mkt-text-muted)", padding: "20px 0" }}>
          Cargando listas de Brevo…
        </div>
      )}

      {/* Lists tab */}
      {!loading && tab === "lists" && (
        <div style={{
          background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)",
          borderRadius: 10, overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--mkt-border)" }}>
                {["LISTA", "CONTACTOS", "BLOQUEADOS", "HEALTH %", "CADENCIA ACTIVA"].map(h => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left",
                    fontSize: 10, fontWeight: 700, color: "var(--mkt-text-muted)",
                    letterSpacing: "0.08em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lists.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    padding: "32px 16px", textAlign: "center",
                    color: "var(--mkt-text-muted)", fontSize: 12,
                  }}>
                    {error ? "No se pudieron cargar las listas." : "0 listas · 0 contactos totales"}
                  </td>
                </tr>
              ) : lists.map(list => {
                const subs = list.uniqueSubscribers || 0;
                const blocked = list.totalBlacklisted || 0;
                const health = subs > 0 ? Math.round(((subs - blocked) / subs) * 100) : 100;
                return (
                  <tr key={list.id} style={{ borderBottom: "1px solid var(--mkt-border)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--mkt-text)", fontWeight: 500 }}>
                      {list.name}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--mkt-text)" }}>
                      {subs.toLocaleString("es-CO")}
                    </td>
                    <td style={{ padding: "12px 16px", color: blocked > 0 ? "#f59e0b" : "var(--mkt-text-muted)" }}>
                      {blocked.toLocaleString("es-CO")}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: healthColor(health), fontWeight: 600 }}>{health}%</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--mkt-text-muted)", fontSize: 11 }}>—</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{
            padding: "10px 16px", borderTop: "1px solid var(--mkt-border)",
            fontSize: 11, color: "var(--mkt-text-muted)",
          }}>
            {lists.length} listas · {totalContacts.toLocaleString("es-CO")} contactos totales
            {totalBlacklisted > 0 && ` · ${totalBlacklisted.toLocaleString("es-CO")} bloqueados`}
          </div>
        </div>
      )}

      {/* Contacts tab */}
      {!loading && tab === "contacts" && (
        <div style={{
          background: "var(--mkt-surface)", border: "1px solid var(--mkt-border)",
          borderRadius: 10, padding: 24,
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 16, marginBottom: 20,
          }}>
            {[
              { label: "Total suscriptores", value: totalContacts.toLocaleString("es-CO"), color: "var(--mkt-text)" },
              { label: "Activos", value: totalActive.toLocaleString("es-CO"), color: "#22c55e" },
              { label: "Bloqueados", value: totalBlacklisted.toLocaleString("es-CO"), color: totalBlacklisted > 0 ? "#f59e0b" : "var(--mkt-text-muted)" },
              { label: "Total listas", value: lists.length.toString(), color: "var(--mkt-accent)" },
            ].map(stat => (
              <div key={stat.label} style={{
                padding: "16px", borderRadius: 10,
                background: "var(--mkt-bg)", border: "1px solid var(--mkt-border)",
              }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: "var(--mkt-text-muted)", marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--mkt-text-muted)", margin: 0 }}>
            Datos en tiempo real de Brevo. Para ver el desglose por lista, selecciona la pestaña{" "}
            <button
              onClick={() => setTab("lists")}
              style={{ background: "none", border: "none", color: "var(--mkt-accent)", cursor: "pointer", fontSize: 12, padding: 0, fontWeight: 600 }}
            >
              Listas
            </button>.
          </p>
        </div>
      )}
    </div>
  );
}
