"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, Users, Play, Pause, Check, X, ChevronRight } from "lucide-react";
import { BSLoading } from "@/components/ui/BSLoading";
import { toast } from "sonner";
import type { Contact } from "@/types";

const GOLD = "#C39A4C";

interface SequenceStep {
  delay: number;
  type: "email" | "call" | "task" | "follow_up";
  description: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string;
  stepsJson: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Enrollment {
  id: string;
  contactId: string;
  contactName: string | null;
  contactCompany: string | null;
  currentStep: number;
  status: string;
  startedAt: string;
}

const STEP_TYPES = [
  { value: "email", label: "Email" },
  { value: "call", label: "Llamada" },
  { value: "task", label: "Tarea" },
  { value: "follow_up", label: "Follow-up" },
];

const STATUS_COLOR: Record<string, string> = {
  active: "#22c55e",
  paused: "#f59e0b",
  completed: "#3b82f6",
};

function StepTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = { email: GOLD, call: "#3b82f6", task: "#8b5cf6", follow_up: "#22c55e" };
  const color = colors[type] ?? GOLD;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${color}18`, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {STEP_TYPES.find(t => t.value === type)?.label ?? type}
    </span>
  );
}

function emptyStep(): SequenceStep {
  return { delay: 1, type: "email", description: "" };
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selected, setSelected] = useState<Sequence | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSteps, setEditSteps] = useState<SequenceStep[]>([emptyStep()]);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const loadSequences = useCallback(async () => {
    try {
      const rows: Sequence[] = await fetch("/api/sequences").then(r => r.json());
      setSequences(rows);
      if (selected) {
        const updated = rows.find(r => r.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [selected]);

  const loadEnrollments = useCallback(async (seqId: string) => {
    try {
      const rows: Enrollment[] = await fetch(`/api/sequences/${seqId}/enroll`).then(r => r.json());
      setEnrollments(rows);
    } catch { setEnrollments([]); }
  }, []);

  useEffect(() => {
    loadSequences();
    fetch("/api/contacts").then(r => r.json()).then(setContacts).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selected) loadEnrollments(selected.id);
    else setEnrollments([]);
  }, [selected, loadEnrollments]);

  function openNew() {
    setIsNew(true);
    setEditing(true);
    setEditName("");
    setEditDesc("");
    setEditSteps([emptyStep()]);
    setSelected(null);
  }

  function openEdit(seq: Sequence) {
    setIsNew(false);
    setEditing(true);
    setEditName(seq.name);
    setEditDesc(seq.description);
    try { setEditSteps(JSON.parse(seq.stepsJson) || [emptyStep()]); }
    catch { setEditSteps([emptyStep()]); }
  }

  async function saveSequence() {
    if (!editName.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const payload = { name: editName, description: editDesc, steps: editSteps };
      let res;
      if (isNew) {
        res = await fetch("/api/sequences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await fetch(`/api/sequences/${selected!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      if (!res.ok) throw new Error();
      const saved: Sequence = await res.json();
      toast.success(isNew ? "Secuencia creada" : "Secuencia guardada");
      setEditing(false);
      setIsNew(false);
      setSelected(saved);
      await loadSequences();
    } catch { toast.error("Error al guardar la secuencia"); }
    setSaving(false);
  }

  async function toggleActive(seq: Sequence) {
    try {
      await fetch(`/api/sequences/${seq.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !seq.active }) });
      await loadSequences();
      toast.success(seq.active ? "Secuencia pausada" : "Secuencia activada");
    } catch { toast.error("Error"); }
  }

  async function deleteSequence(seq: Sequence) {
    if (!confirm(`¿Eliminar "${seq.name}"? Se eliminarán todos los enrollments.`)) return;
    try {
      await fetch(`/api/sequences/${seq.id}`, { method: "DELETE" });
      toast.success("Secuencia eliminada");
      setSelected(null);
      await loadSequences();
    } catch { toast.error("Error al eliminar"); }
  }

  async function enroll(contactId: string) {
    if (!selected) return;
    try {
      const res = await fetch(`/api/sequences/${selected.id}/enroll`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId }) });
      if (res.status === 409) { toast.error("Este contacto ya está en la secuencia"); return; }
      if (!res.ok) throw new Error();
      toast.success("Contacto inscrito en la secuencia");
      setEnrollOpen(false);
      await loadEnrollments(selected.id);
    } catch { toast.error("Error al inscribir"); }
  }

  async function unenroll(enrollmentId: string) {
    if (!selected) return;
    try {
      await fetch(`/api/sequences/${selected.id}/enroll?enrollmentId=${enrollmentId}`, { method: "DELETE" });
      toast.success("Contacto eliminado de la secuencia");
      await loadEnrollments(selected.id);
    } catch { toast.error("Error"); }
  }

  async function advanceStep(enrollment: Enrollment) {
    if (!selected) return;
    const steps = JSON.parse(selected.stepsJson || "[]") as SequenceStep[];
    const nextStep = enrollment.currentStep + 1;
    const status = nextStep >= steps.length ? "completed" : "active";
    try {
      await fetch(`/api/sequences/${selected.id}/enroll`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enrollmentId: enrollment.id, currentStep: nextStep, status }) });
      await loadEnrollments(selected.id);
    } catch { toast.error("Error"); }
  }

  const addStep = () => setEditSteps(s => [...s, emptyStep()]);
  const removeStep = (i: number) => setEditSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, key: keyof SequenceStep, val: string | number) =>
    setEditSteps(s => s.map((step, idx) => idx === i ? { ...step, [key]: val } : step));

  const selectedSteps: SequenceStep[] = selected ? (() => { try { return JSON.parse(selected.stepsJson); } catch { return []; } })() : [];
  const filteredContacts = contacts.filter(c =>
    !enrollSearch || c.name.toLowerCase().includes(enrollSearch.toLowerCase()) || (c.company || "").toLowerCase().includes(enrollSearch.toLowerCase())
  ).slice(0, 20);

  const inputStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", width: "100%" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Secuencias de Seguimiento</h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Crea flujos multi-paso e inscribe contactos</p>
        </div>
        <button
          onClick={openNew}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: GOLD, color: "#000", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}
        >
          <Plus size={15} /> Nueva secuencia
        </button>
      </div>

      {/* Edit modal overlay */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) setEditing(false); }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 28, width: "min(620px,95vw)", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>{isNew ? "Nueva secuencia" : "Editar secuencia"}</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Nombre</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="ej. Nurture leads fríos" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Descripción</label>
              <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Describe el objetivo de esta secuencia" style={inputStyle} />
            </div>

            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Pasos ({editSteps.length})</div>
            {editSteps.map((step, i) => (
              <div key={i} style={{ borderRadius: 10, border: "1px solid var(--border)", padding: 14, marginBottom: 10, background: "var(--background)", position: "relative" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${GOLD}20`, color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select value={step.type} onChange={e => updateStep(i, "type", e.target.value)} style={{ ...inputStyle, width: "auto", flex: 1 }}>
                        {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>Esperar</span>
                        <input type="number" min={0} max={365} value={step.delay} onChange={e => updateStep(i, "delay", +e.target.value)} style={{ ...inputStyle, width: 60 }} />
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>días</span>
                      </div>
                    </div>
                    <input value={step.description} onChange={e => updateStep(i, "description", e.target.value)} placeholder="Descripción del paso..." style={inputStyle} />
                  </div>
                  <button onClick={() => removeStep(i)} style={{ padding: 6, borderRadius: 6, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", flexShrink: 0 }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addStep} style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Plus size={14} /> Agregar paso
            </button>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setEditing(false)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={saveSequence} disabled={saving} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: GOLD, color: "#000", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, minHeight: 500 }}>
        {/* Sequences list */}
        <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Secuencias ({sequences.length})
          </div>
          {loading ? (
            <BSLoading label="Cargando secuencias…" />
          ) : sequences.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>Sin secuencias. Crea la primera.</div>
          ) : sequences.map(seq => {
            const steps = (() => { try { return JSON.parse(seq.stepsJson) as SequenceStep[]; } catch { return []; } })();
            return (
              <div
                key={seq.id}
                onClick={() => setSelected(seq)}
                style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: selected?.id === seq.id ? `${GOLD}10` : "transparent", borderLeft: selected?.id === seq.id ? `3px solid ${GOLD}` : "3px solid transparent", transition: "background 0.1s" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seq.name}</div>
                  <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: seq.active ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", color: seq.active ? "#22c55e" : "#f59e0b", fontWeight: 700, flexShrink: 0 }}>
                    {seq.active ? "Activa" : "Pausada"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3 }}>{steps.length} paso{steps.length !== 1 ? "s" : ""}</div>
              </div>
            );
          })}
        </div>

        {/* Sequence detail */}
        {!selected ? (
          <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            Selecciona una secuencia para ver el detalle
          </div>
        ) : (
          <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selected.name}</div>
                {selected.description && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{selected.description}</div>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => toggleActive(selected)} title={selected.active ? "Pausar" : "Activar"} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: selected.active ? "#f59e0b" : "#22c55e", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                  {selected.active ? <><Pause size={13} /> Pausar</> : <><Play size={13} /> Activar</>}
                </button>
                <button onClick={() => openEdit(selected)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                  <Edit2 size={13} /> Editar
                </button>
                <button onClick={() => deleteSequence(selected)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, height: "calc(100% - 65px)" }}>
              {/* Steps */}
              <div style={{ borderRight: "1px solid var(--border)", padding: 20, overflowY: "auto" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
                  Pasos ({selectedSteps.length})
                </div>
                {selectedSteps.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "24px 0", textAlign: "center" }}>Sin pasos definidos. Edita la secuencia para agregarlos.</div>
                ) : selectedSteps.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${GOLD}20`, color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
                      {i < selectedSteps.length - 1 && <div style={{ width: 1, height: 24, background: "var(--border)", marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <StepTypeBadge type={step.type} />
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                          {step.delay === 0 ? "Inmediato" : `Día ${step.delay}`}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--foreground)" }}>{step.description || <span style={{ color: "var(--muted-foreground)" }}>Sin descripción</span>}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enrollments */}
              <div style={{ padding: 20, overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Inscritos ({enrollments.length})
                  </div>
                  <button
                    onClick={() => setEnrollOpen(true)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: `1px solid ${GOLD}`, background: "transparent", color: GOLD, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    <Users size={13} /> Inscribir
                  </button>
                </div>

                {enrollments.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "24px 0", textAlign: "center" }}>Sin contactos inscritos.</div>
                ) : enrollments.map(en => (
                  <div key={en.id} style={{ borderRadius: 8, border: "1px solid var(--border)", padding: 12, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{en.contactName || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{en.contactCompany || ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: `${STATUS_COLOR[en.status] ?? GOLD}18`, color: STATUS_COLOR[en.status] ?? GOLD, fontWeight: 700 }}>
                          {en.status === "active" ? "Activo" : en.status === "completed" ? "Completado" : "Pausado"}
                        </span>
                        <button onClick={() => unenroll(en.id)} style={{ padding: 4, borderRadius: 5, border: "none", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer" }} title="Eliminar">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    {en.status === "active" && selectedSteps.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                          Paso {Math.min(en.currentStep + 1, selectedSteps.length)}/{selectedSteps.length}
                        </div>
                        {en.currentStep < selectedSteps.length && (
                          <button
                            onClick={() => advanceStep(en)}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 11, cursor: "pointer" }}
                          >
                            <Check size={11} /> Completar paso
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enroll contact modal */}
      {enrollOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) { setEnrollOpen(false); setEnrollSearch(""); } }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, width: "min(420px,95vw)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Inscribir contacto</div>
            <input
              autoFocus
              value={enrollSearch}
              onChange={e => setEnrollSearch(e.target.value)}
              placeholder="Buscar por nombre o empresa..."
              style={{ ...inputStyle, marginBottom: 12 }}
            />
            <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredContacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => enroll(c.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${GOLD}20`, color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{c.company || "—"}</div>
                  </div>
                  <ChevronRight size={14} style={{ marginLeft: "auto", color: "var(--muted-foreground)" }} />
                </button>
              ))}
              {filteredContacts.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>Sin resultados</div>}
            </div>
            <button onClick={() => { setEnrollOpen(false); setEnrollSearch(""); }} style={{ marginTop: 14, width: "100%", padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
