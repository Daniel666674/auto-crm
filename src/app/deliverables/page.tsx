"use client";

import { useEffect, useState } from "react";
import { BSLoading } from "@/components/ui/BSLoading";

type Deliverable = {
  id: string; clientId: string; title: string; status: string;
  dueDate: string | number | null; owner: string; notes: string | null;
  createdAt: string | number;
};

type Client = { id: string; company: string; name: string; };

const STATUS_COLORS: Record<string, string> = {
  "Pendiente": "#7a756e",
  "En progreso": "#f59e0b",
  "Entregado": "#22c55e",
  "Vencido": "#ef4444",
};

const STATUS_ORDER = ["Vencido", "En progreso", "Pendiente", "Entregado"];

function fDate(ts: string | number) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function DeliverablesPage() {
  const [items, setItems] = useState<Deliverable[]>([]);
  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState("Todos");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", clientId: "", status: "Pendiente", dueDate: "", owner: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/deliverables").then(r => r.json()),
      fetch("/api/clients").then(r => r.json()),
    ]).then(([delivs, cls]) => {
      setItems(Array.isArray(delivs) ? delivs : []);
      setClientsData(Array.isArray(cls) ? cls : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    await fetch(`/api/deliverables/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const addDeliverable = async () => {
    if (!form.title.trim() || !form.clientId) return;
    const res = await fetch("/api/deliverables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: form.clientId,
        title: form.title.trim(),
        status: form.status,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        owner: form.owner,
      }),
    });
    if (res.ok) {
      const newItem = await res.json();
      setItems(prev => [newItem, ...prev]);
      setForm({ title: "", clientId: "", status: "Pendiente", dueDate: "", owner: "" });
      setShowAdd(false);
    }
  };

  const deleteDeliverable = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`/api/deliverables/${id}`, { method: "DELETE" });
  };

  const clientMap = new Map(clientsData.map(c => [c.id, c.company]));
  const now = Date.now();

  const filtered = items
    .filter(i => clientFilter === "Todos" || clientMap.get(i.clientId) === clientFilter)
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  const overdueCount = filtered.filter(i => i.status === "Vencido").length;
  const clientNames = [...new Set(clientsData.map(c => c.company))];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Entregables</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
            Seguimiento por cliente
            {overdueCount > 0 && (
              <> · <span style={{ color: "#ef4444", fontWeight: 600 }}>{overdueCount} vencido{overdueCount !== 1 ? "s" : ""}</span></>
            )}
          </p>
        </div>
        <button
          onClick={() => { setForm(f => ({ ...f, clientId: clientsData[0]?.id || "" })); setShowAdd(true); }}
          disabled={clientsData.length === 0}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none",
            background: clientsData.length === 0 ? "var(--border)" : "var(--primary)",
            color: "var(--primary-foreground)",
            fontSize: 13, fontWeight: 600, cursor: clientsData.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          + Nuevo entregable
        </button>
      </div>

      {clientsData.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12, cursor: "pointer" }}
          >
            {["Todos", ...clientNames].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )}

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 440, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Nuevo Entregable</div>

            <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Título</label>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Describe el entregable..."
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, marginBottom: 14 }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Cliente</label>
                <select
                  value={form.clientId}
                  onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13 }}
                >
                  {clientsData.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Responsable</label>
                <input
                  value={form.owner}
                  onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
                  placeholder="Nombre..."
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13 }}
                />
              </div>
            </div>

            <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Fecha límite</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, marginBottom: 20 }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={addDeliverable} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {loading && <BSLoading label="Cargando entregables…" />}

      {!loading && clientsData.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--border)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Sin clientes activos</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Los entregables se crean una vez que tienes clientes activos desde el Pipeline.</div>
        </div>
      )}

      {!loading && clientsData.length > 0 && filtered.length === 0 && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Sin entregables con este filtro</div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
                {["Entregable", "Cliente", "Estado", "Fecha límite", "Responsable", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const isOverdue = item.status === "Vencido";
                const daysLeft = item.dueDate ? Math.ceil((new Date(item.dueDate).getTime() - now) / 86400000) : null;
                const statusColor = STATUS_COLORS[item.status] || "var(--muted-foreground)";

                return (
                  <tr key={item.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", background: isOverdue ? "rgba(239,68,68,0.03)" : "var(--card)" }}>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: isOverdue ? 600 : 400, color: isOverdue ? "#ef4444" : "var(--foreground)" }}>{item.title}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--muted-foreground)" }}>{clientMap.get(item.clientId) || "—"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <select
                        value={item.status}
                        onChange={e => updateStatus(item.id, e.target.value)}
                        style={{ padding: "4px 8px", borderRadius: 20, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", background: `${statusColor}18`, color: statusColor }}
                      >
                        {["Pendiente", "En progreso", "Entregado", "Vencido"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: isOverdue ? "#ef4444" : "var(--muted-foreground)" }}>
                      {item.dueDate ? fDate(item.dueDate) : "—"}
                      {daysLeft !== null && !isOverdue && daysLeft <= 3 && daysLeft >= 0 && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: "#f59e0b" }}>({daysLeft}d)</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      {item.owner ? (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "rgba(209,156,21,0.1)", color: "var(--primary)" }}>{item.owner}</span>
                      ) : <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <button
                        onClick={() => deleteDeliverable(item.id)}
                        style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 11, cursor: "pointer" }}
                      >✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
