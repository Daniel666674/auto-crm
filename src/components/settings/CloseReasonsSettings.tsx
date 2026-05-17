"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const S = {
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, display: "block" },
  input: { width: "100%", padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--foreground)", outline: "none", boxSizing: "border-box" as const },
  btn: (variant: "primary" | "outline" | "ghost" | "danger" = "outline"): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.12s",
    ...(variant === "primary" ? { background: "var(--primary)", color: "var(--primary-foreground)", border: "none" } : {}),
    ...(variant === "ghost" ? { background: "transparent", color: "var(--muted-foreground)", border: "none" } : {}),
    ...(variant === "danger" ? { background: "rgba(239,68,68,0.12)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" } : {}),
    ...(variant === "outline" ? { background: "transparent", color: "var(--foreground)" } : {}),
  }),
};

interface CloseReason {
  id: string;
  type: "won" | "lost";
  label: string;
  active: boolean;
}

interface Props {
  role: string;
}

export function CloseReasonsSettings({ role }: Props) {
  const canEdit = role === "superadmin";
  const [reasons, setReasons] = useState<CloseReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newType, setNewType] = useState<"won" | "lost">("won");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchReasons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/close-reasons");
      if (!res.ok) throw new Error("Error al cargar razones");
      const data = await res.json();
      setReasons(data);
    } catch {
      toast.error("No se pudieron cargar las razones de cierre");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReasons(); }, [fetchReasons]);

  const handleToggle = async (r: CloseReason) => {
    if (!canEdit) return;
    setSaving(r.id);
    try {
      const res = await fetch(`/api/settings/close-reasons/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !r.active }),
      });
      if (!res.ok) throw new Error();
      setReasons(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x));
      toast.success(`Razon "${r.label}" ${!r.active ? "activada" : "desactivada"}`);
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (r: CloseReason) => {
    if (!canEdit) return;
    if (!confirm(`¿Eliminar la razon "${r.label}"?`)) return;
    setSaving(r.id);
    try {
      const res = await fetch(`/api/settings/close-reasons/${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setReasons(prev => prev.filter(x => x.id !== r.id));
      toast.success("Razon eliminada");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setSaving(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) { toast.error("Ingresa una descripcion"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/settings/close-reasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType, label: newLabel.trim() }),
      });
      if (!res.ok) throw new Error();
      const created: CloseReason = await res.json();
      setReasons(prev => [...prev, created]);
      setNewLabel("");
      setShowForm(false);
      toast.success("Razon agregada");
    } catch {
      toast.error("Error al agregar");
    } finally {
      setAdding(false);
    }
  };

  const wonReasons = reasons.filter(r => r.type === "won");
  const lostReasons = reasons.filter(r => r.type === "lost");

  const ReasonRow = ({ r }: { r: CloseReason }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
        background: r.type === "won" ? (r.active ? "#C39A4C" : "var(--muted-foreground)") : (r.active ? "#ef4444" : "var(--muted-foreground)"),
      }} />
      <span style={{ flex: 1, fontSize: 13, color: r.active ? "var(--foreground)" : "var(--muted-foreground)" }}>
        {r.label}
      </span>
      {canEdit && (
        <>
          <button
            onClick={() => handleToggle(r)}
            disabled={saving === r.id}
            style={{ ...S.btn("ghost"), padding: "4px 6px" }}
            title={r.active ? "Desactivar" : "Activar"}
          >
            {r.active
              ? <CheckCircle size={15} style={{ color: r.type === "won" ? "#C39A4C" : "#ef4444" }} />
              : <XCircle size={15} style={{ color: "var(--muted-foreground)" }} />
            }
          </button>
          <button
            onClick={() => handleDelete(r)}
            disabled={saving === r.id}
            style={{ ...S.btn("ghost"), padding: "4px 6px" }}
            title="Eliminar"
          >
            <Trash2 size={14} style={{ color: "#ef4444" }} />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Razones de Cierre</h3>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            {loading ? "Cargando..." : `${wonReasons.length} ganado · ${lostReasons.length} perdido`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchReasons} style={S.btn("ghost")} disabled={loading} title="Actualizar">
            <RefreshCw size={14} style={{ ...(loading ? { animation: "spin 1s linear infinite" } : {}) }} />
          </button>
          {canEdit && (
            <button onClick={() => setShowForm(v => !v)} style={S.btn("primary")}>
              <Plus size={14} /> Agregar razon
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showForm && canEdit && (
        <div style={{ ...S.card, background: "var(--muted)", padding: 16 }}>
          <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 140px" }}>
              <span style={S.label}>Tipo</span>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as "won" | "lost")}
                style={{ ...S.input, width: 140 }}
              >
                <option value="won">Ganado</option>
                <option value="lost">Perdido</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={S.label}>Descripcion</span>
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Ej: Precio no competitivo"
                style={S.input}
                autoFocus
              />
            </div>
            <button type="submit" disabled={adding} style={S.btn("primary")}>
              {adding ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} />}
              Guardar
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={S.btn("ghost")}>
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* Columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Won column */}
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#C39A4C", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#C39A4C" }}>Ganado</span>
            <span style={{
              marginLeft: "auto", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
              background: "rgba(195,154,76,0.12)", color: "#C39A4C",
            }}>
              {wonReasons.filter(r => r.active).length} activas
            </span>
          </div>
          {loading ? (
            <div style={{ color: "var(--muted-foreground)", fontSize: 13, textAlign: "center", padding: 16 }}>
              <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : wonReasons.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: 16 }}>
              Sin razones configuradas
            </p>
          ) : (
            wonReasons.map(r => <ReasonRow key={r.id} r={r} />)
          )}
        </div>

        {/* Lost column */}
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>Perdido</span>
            <span style={{
              marginLeft: "auto", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
              background: "rgba(239,68,68,0.12)", color: "#ef4444",
            }}>
              {lostReasons.filter(r => r.active).length} activas
            </span>
          </div>
          {loading ? (
            <div style={{ color: "var(--muted-foreground)", fontSize: 13, textAlign: "center", padding: 16 }}>
              <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : lostReasons.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: 16 }}>
              Sin razones configuradas
            </p>
          ) : (
            lostReasons.map(r => <ReasonRow key={r.id} r={r} />)
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
