"use client";

import React, { useState } from "react";
import { toast } from "sonner";

interface Props {
  contactId: string;
  initial: string | null | undefined;
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === "string") : [];
  } catch { return []; }
}

export function TagsEditor({ contactId, initial }: Props) {
  const [tags, setTags] = useState<string[]>(parseTags(initial));
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const persist = async (newTags: string[]) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: JSON.stringify(newTags) }),
      });
      if (!res.ok) throw new Error();
    } catch { toast.error("Error al guardar etiquetas"); }
    finally { setSaving(false); }
  };

  const add = (raw: string) => {
    const clean = raw.trim();
    if (!clean || tags.includes(clean) || clean.length > 30) return;
    const newTags = [...tags, clean];
    setTags(newTags);
    persist(newTags);
  };

  const remove = (t: string) => {
    const newTags = tags.filter(x => x !== t);
    setTags(newTags);
    persist(newTags);
  };

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        Etiquetas {saving && <span style={{ fontWeight: 400, textTransform: "none" }}>· guardando…</span>}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        {tags.map(t => (
          <span key={t} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(99,102,241,0.15)", color: "#818cf8", display: "inline-flex", alignItems: "center", gap: 4 }}>
            {t}
            <button onClick={() => remove(t)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 13, lineHeight: 1, opacity: 0.7 }} aria-label={`Quitar ${t}`}>×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); add(input); setInput(""); }
            else if (e.key === "Backspace" && input === "" && tags.length > 0) {
              remove(tags[tags.length - 1]);
            }
          }}
          placeholder={tags.length === 0 ? "Agregar etiqueta…" : "+"}
          style={{ padding: "3px 8px", borderRadius: 4, border: "1px dashed var(--border)", background: "transparent", fontSize: 11, color: "var(--foreground)", outline: "none", width: tags.length === 0 ? 130 : 70 }}
        />
      </div>
    </div>
  );
}
