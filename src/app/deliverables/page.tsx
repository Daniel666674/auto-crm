"use client";

import { useState } from "react";

type Deliverable = {
  id: string; clientId: string; title: string; client: string;
  status: string; dueDate: number | null; owner: string;
};

const STATUS_COLORS: Record<string, string> = {
  "Pendiente": "#7a756e",
  "En progreso": "#f59e0b",
  "Entregado": "#22c55e",
  "Vencido": "#ef4444",
};

const STATUS_ORDER = ["Vencido", "En progreso", "Pendiente", "Entregado"];

const SEED: Deliverable[] = [
  { id: "dv1", clientId: "cl1", title: "Informe mensual de métricas CRM", client: "Agencia Creativa", status: "En progreso", dueDate: Date.now() + 3*86400000, owner: "Daniel" },
  { id: "dv2", clientId: "cl1", title: "Setup campaña email Q2", client: "Agencia Creativa", status: "Pendiente", dueDate: Date.now() + 10*86400000, owner: "Julian" },
  { id: "dv3", clientId: "cl2", title: "Migración de datos históricos", client: "Inmobiliaria Rodríguez", status: "Vencido", dueDate: Date.now() - 5*86400000, owner: "Daniel" },
  { id: "dv4", clientId: "cl2", title: "Capacitación equipo comercial", client: "Inmobiliaria Rodríguez", status: "Pendiente", dueDate: Date.now() + 1*86400000, owner: "Daniel" },
  { id: "dv5", clientId: "cl2", title: "Integración WhatsApp Business", client: "Inmobiliaria Rodríguez", status: "Vencido", dueDate: Date.now() - 8*86400000, owner: "Julian" },
  { id: "dv6", clientId: "cl2", title: "Dashboard personalizado", client: "Inmobiliaria Rodríguez", status: "En progreso", dueDate: Date.now() + 2*86400000, owner: "Daniel" },
  { id: "dv7", clientId: "cl3", title: "Onboarding CRM personalizado", client: "TechStartup MX", status: "Entregado", dueDate: Date.now() - 20*86400000, owner: "Julian" },
  { id: "dv8", clientId: "cl5", title: "Configuración automatizaciones", client: "FoodTech CO", status: "Vencido", dueDate: Date.now() - 2*86400000, owner: "Daniel" },
  { id: "dv9", clientId: "cl5", title: "Reporte Q1 pipeline", client: "FoodTech CO", status: "Vencido", dueDate: Date.now() - 15*86400000, owner: "Julian" },
  { id: "dv10", clientId: "cl5", title: "Revisión estrategia de contenidos", client: "FoodTech CO", status: "Pendiente", dueDate: Date.now() + 4*86400000, owner: "Daniel" },
  { id: "dv11", clientId: "cl5", title: "Análisis de conversión mensual", client: "FoodTech CO", status: "Pendiente", dueDate: Date.now() + 6*86400000, owner: "Julian" },
  { id: "dv12", clientId: "cl5", title: "Setup de métricas Brevo", client: "FoodTech CO", status: "Vencido", dueDate: Date.now() - 7*86400000, owner: "Daniel" },
];

const CLIENTS = ["Agencia Creativa", "Inmobiliaria Rodríguez", "TechStartup MX", "Martínez Consultores", "FoodTech CO"];
const CLIENT_IDS: Record<string, string> = {
  "Agencia Creativa": "cl1", "Inmobiliaria Rodríguez": "cl2",
  "TechStartup MX": "cl3", "Martínez Consultores": "cl4", "FoodTech CO": "cl5",
};

function fDate(ts: number) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const emptyForm = { title: "", clientName: "Agencia Creativa", status: "Pendiente", dueDate: "", owner: "Daniel" };

export default function DeliverablesPage() {
  const [items, setItems] = useState<Deliverable[]>(SEED);
  const [clientFilter, setClientFilter] = useState("Todos");
  const [ownerFilter, setOwnerFilter] = useState("Todos");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const now = Date.now();

  const updateStatus = (id: string, status: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));

  const addDeliverable = () => {
    if (!form.title.trim()) return;
    const dueTs = form.dueDate ? new Date(form.dueDate).getTime() : null;
    const newItem: Deliverable = {
      id: `dv${Date.now()}`,
      clientId: CLIENT_IDS[form.clientName] || "cl1",
      title: form.title.trim(),
      client: form.clientName,
      status: form.status,
      dueDate: dueTs,
      owner: form.owner,
    };
    setItems(prev => [newItem, ...prev]);
    setForm(emptyForm);
    setShowAdd(false);
  };

  const filtered = items
    .filter(i => clientFilter === "Todos" || i.client === clientFilter)
    .filter(i => ownerFilter === "Todos" || i.owner === ownerFilter)
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  const overdueCount = filtered.filter(i => i.status === "Vencido").length;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      {/* Header */}
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
          onClick={() => setShowAdd(true)}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none",
            background: "var(--primary)", color: "var(--primary-foreground)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          + Nuevo entregable
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Cliente", value: clientFilter, setter: setClientFilter, options: ["Todos", ...CLIENTS] },
          { label: "Responsable", value: ownerFilter, setter: setOwnerFilter, options: ["Todos", "Daniel", "Julian"] },
        ].map(f => (
          <select
            key={f.label}
            value={f.value}
            onChange={e => f.setter(e.target.value)}
            style={{
              padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--card)", color: "var(--foreground)", fontSize: 12, cursor: "pointer",
            }}
          >
            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Add modal */}
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
                  value={form.clientName}
                  onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13 }}
                >
                  {CLIENTS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Responsable</label>
                <select
                  value={form.owner}
                  onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13 }}
                >
                  <option>Daniel</option>
                  <option>Julian</option>
                </select>
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
              <button
                onClick={() => { setShowAdd(false); setForm(emptyForm); }}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={addDeliverable}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
          Sin entregables con este filtro
        </div>
      ) : (
        <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
                {["Entregable", "Cliente", "Estado", "Fecha límite", "Responsable"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const isOverdue = item.status === "Vencido";
                const daysLeft = item.dueDate ? Math.ceil((item.dueDate - now) / 86400000) : null;
                const statusColor = STATUS_COLORS[item.status] || "var(--muted-foreground)";

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                      background: isOverdue ? "rgba(239,68,68,0.03)" : "var(--card)",
                    }}
                  >
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: isOverdue ? 600 : 400, color: isOverdue ? "#ef4444" : "var(--foreground)" }}>
                      {item.title}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--muted-foreground)" }}>
                      {item.client}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <select
                        value={item.status}
                        onChange={e => updateStatus(item.id, e.target.value)}
                        style={{
                          padding: "4px 8px", borderRadius: 20, border: "none",
                          fontSize: 11, fontWeight: 600, cursor: "pointer",
                          background: `${statusColor}18`, color: statusColor,
                        }}
                      >
                        {["Pendiente", "En progreso", "Entregado", "Vencido"].map(s => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: isOverdue ? "#ef4444" : "var(--muted-foreground)" }}>
                      {item.dueDate ? fDate(item.dueDate) : "—"}
                      {daysLeft !== null && !isOverdue && daysLeft <= 3 && daysLeft >= 0 && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: "#f59e0b" }}>({daysLeft}d)</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 10,
                        background: item.owner === "Daniel" ? "rgba(209,156,21,0.1)" : "rgba(59,130,246,0.1)",
                        color: item.owner === "Daniel" ? "var(--primary)" : "#3b82f6",
                      }}>
                        {item.owner}
                      </span>
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
