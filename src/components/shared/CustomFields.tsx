"use client";

import React, { useEffect, useState } from "react";

export interface CustomFieldDef {
  id: string;
  entity: "contact" | "deal";
  label: string;
  fieldKey: string;
  type: "text" | "number" | "select" | "date" | "boolean";
  options: string[];
  active: boolean;
}

export function useCustomFieldDefs(entity: "contact" | "deal") {
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  useEffect(() => {
    fetch(`/api/settings/custom-fields?entity=${entity}`)
      .then(r => r.ok ? r.json() : [])
      .then((d: CustomFieldDef[]) => setDefs(Array.isArray(d) ? d.filter(f => f.active) : []))
      .catch(() => {});
  }, [entity]);
  return defs;
}

/** Editable inputs for an entity's active custom fields. */
export function CustomFieldInputs({
  entity, values, onChange, labelStyle, inputStyle,
}: {
  entity: "contact" | "deal";
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  labelStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}) {
  const defs = useCustomFieldDefs(entity);
  if (defs.length === 0) return null;

  const lbl: React.CSSProperties = labelStyle ?? { fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 4 };
  const inp: React.CSSProperties = inputStyle ?? { width: "100%", padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--foreground)", outline: "none", boxSizing: "border-box" };

  const set = (key: string, v: unknown) => onChange({ ...values, [key]: v });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Campos personalizados
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {defs.map(f => {
          const val = values[f.id];
          if (f.type === "boolean") {
            return (
              <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "var(--foreground)" }}>
                <input type="checkbox" checked={!!val} onChange={e => set(f.id, e.target.checked)} style={{ accentColor: "var(--primary)", width: 16, height: 16 }} />
                {f.label}
              </label>
            );
          }
          return (
            <div key={f.id}>
              <span style={lbl}>{f.label}</span>
              {f.type === "select" ? (
                <select style={inp} value={(val as string) ?? ""} onChange={e => set(f.id, e.target.value)}>
                  <option value="">—</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  style={inp}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={(val as string | number) ?? ""}
                  onChange={e => set(f.id, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Read-only display of an entity's custom field values. */
export function CustomFieldValues({ entity, values }: { entity: "contact" | "deal"; values: Record<string, unknown> | null | undefined }) {
  const defs = useCustomFieldDefs(entity);
  if (defs.length === 0 || !values) return null;
  const filled = defs.filter(f => values[f.id] !== undefined && values[f.id] !== "" && values[f.id] !== null);
  if (filled.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {filled.map(f => (
        <div key={f.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
          <span style={{ color: "var(--muted-foreground)" }}>{f.label}</span>
          <span style={{ color: "var(--foreground)", fontWeight: 500, textAlign: "right" }}>
            {f.type === "boolean" ? (values[f.id] ? "Sí" : "No") : String(values[f.id])}
          </span>
        </div>
      ))}
    </div>
  );
}

export function parseCustomFields(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}
