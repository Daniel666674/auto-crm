"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, Type, Hash, List, Calendar, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { BSLoading } from "../ui/BSLoading";

interface FieldDef {
  id: string;
  entity: "contact" | "deal";
  label: string;
  fieldKey: string;
  type: "text" | "number" | "select" | "date" | "boolean";
  options: string[];
  order: number;
  active: boolean;
}

const TYPE_META: Record<FieldDef["type"], { label: string; icon: React.ReactNode }> = {
  text: { label: "Texto", icon: <Type size={13} /> },
  number: { label: "Número", icon: <Hash size={13} /> },
  select: { label: "Lista", icon: <List size={13} /> },
  date: { label: "Fecha", icon: <Calendar size={13} /> },
  boolean: { label: "Sí/No", icon: <CheckSquare size={13} /> },
};

const S = {
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, display: "block" },
  input: { width: "100%", padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--foreground)", outline: "none", boxSizing: "border-box" as const },
};

function btn(variant: "primary" | "ghost" | "danger" = "primary"): React.CSSProperties {
  return {
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
    border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 6,
    ...(variant === "primary" ? { background: "var(--primary)", color: "var(--primary-foreground)", border: "none" } : {}),
    ...(variant === "ghost" ? { background: "transparent", color: "var(--muted-foreground)", border: "none" } : {}),
    ...(variant === "danger" ? { background: "rgba(239,68,68,0.12)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" } : {}),
  };
}

export function CustomFieldsSettings() {
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState<"contact" | "deal">("contact");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ label: string; type: FieldDef["type"]; options: string }>({ label: "", type: "text", options: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/custom-fields");
      if (res.ok) setFields(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.label.trim()) { toast.error("El nombre del campo es requerido"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity, label: form.label.trim(), type: form.type,
          options: form.type === "select" ? form.options.split(",").map(o => o.trim()).filter(Boolean) : undefined,
        }),
      });
      if (res.ok) {
        toast.success("Campo creado");
        setForm({ label: "", type: "text", options: "" });
        setShowForm(false);
        await load();
      } else {
        const e = await res.json() as { error?: string };
        toast.error(e.error || "Error al crear campo");
      }
    } catch { toast.error("Error de red"); }
    setSaving(false);
  };

  const toggle = async (f: FieldDef) => {
    await fetch("/api/settings/custom-fields", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id, active: !f.active }),
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este campo? Los valores guardados en contactos/deals dejarán de mostrarse.")) return;
    await fetch(`/api/settings/custom-fields?id=${id}`, { method: "DELETE" });
    await load();
  };

  if (loading) return <BSLoading label="Cargando campos…" />;

  const shown = fields.filter(f => f.entity === entity);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Campos personalizados</h3>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Agrega campos propios a contactos y deals para adaptar Nexus a BlackScale.
          </p>
        </div>
        <button style={btn("primary")} onClick={() => setShowForm(v => !v)}>
          <Plus size={13} /> Nuevo campo
        </button>
      </div>

      {/* Entity toggle */}
      <div style={{ display: "flex", gap: 8 }}>
        {([["contact", "Contactos"], ["deal", "Deals"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setEntity(k)}
            style={{
              padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${entity === k ? "var(--primary)" : "var(--border)"}`,
              background: entity === k ? "rgba(195,154,76,0.12)" : "transparent",
              color: entity === k ? "#C39A4C" : "var(--muted-foreground)",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ ...S.card, border: "1px solid rgba(195,154,76,0.3)", background: "rgba(195,154,76,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <span style={S.label}>Nombre del campo</span>
              <input style={S.input} placeholder="Ej: Presupuesto anual" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
            </div>
            <div>
              <span style={S.label}>Tipo</span>
              <select style={S.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as FieldDef["type"] })}>
                {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          {form.type === "select" && (
            <div style={{ marginTop: 12 }}>
              <span style={S.label}>Opciones (separadas por coma)</span>
              <input style={S.input} placeholder="Bajo, Medio, Alto" value={form.options} onChange={e => setForm({ ...form, options: e.target.value })} />
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
            <button style={btn("ghost")} onClick={() => { setShowForm(false); setForm({ label: "", type: "text", options: "" }); }}>Cancelar</button>
            <button style={btn("primary")} onClick={add} disabled={saving}>
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />} Agregar a {entity === "contact" ? "contactos" : "deals"}
            </button>
          </div>
        </div>
      )}

      {/* Field list */}
      {shown.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, padding: 28 }}>
          Sin campos personalizados para {entity === "contact" ? "contactos" : "deals"}.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shown.map(f => (
            <div key={f.id} style={{ ...S.card, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, opacity: f.active ? 1 : 0.55 }}>
              <button onClick={() => toggle(f)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: f.active ? "#C39A4C" : "var(--muted-foreground)", flexShrink: 0 }}>
                {f.active ? <ToggleRight size={22} style={{ color: "#C39A4C" }} /> : <ToggleLeft size={22} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  {TYPE_META[f.type].icon} {TYPE_META[f.type].label}
                  {f.type === "select" && f.options.length > 0 && <span>· {f.options.join(", ")}</span>}
                  <code style={{ opacity: 0.6 }}>{f.fieldKey}</code>
                </div>
              </div>
              <button onClick={() => remove(f.id)} style={{ ...btn("danger"), padding: "5px 8px", flexShrink: 0 }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
