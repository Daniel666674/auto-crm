"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface ContactOption { id: string; name: string; company: string | null; }

interface Props {
  stageId: string;
  contacts: ContactOption[];
  onCreated: () => void;
}

export function QuickAddDeal({ stageId, contacts, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [contactQuery, setContactQuery] = useState("");
  const [contactId, setContactId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    setOpen(false);
    setTitle(""); setValue(""); setContactQuery(""); setContactId("");
  };

  const filteredContacts = contactQuery.trim()
    ? contacts.filter(c => {
        const q = contactQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  const selectedContact = contacts.find(c => c.id === contactId);

  const submit = async () => {
    if (!title.trim() || !contactId) {
      toast.error("Título y contacto son requeridos");
      return;
    }
    setSaving(true);
    try {
      const cents = Math.round((parseFloat(value) || 0) * 100);
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), value: cents, stageId, contactId, probability: 10 }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al crear deal");
      }
      toast.success("Deal creado");
      close();
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Agregar deal a esta etapa"
        style={{
          padding: "3px 6px", borderRadius: 5, border: "1px dashed var(--border)",
          background: "transparent", color: "var(--muted-foreground)",
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11,
        }}
      >
        <Plus size={12} /> Deal
      </button>
    );
  }

  const input: React.CSSProperties = {
    width: "100%", padding: "5px 8px", borderRadius: 5, fontSize: 12,
    border: "1px solid var(--border)", background: "var(--background)",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  };

  return (
    <div ref={ref} style={{ padding: 8, borderRadius: 6, background: "var(--background)", border: "1px solid var(--primary)", display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título del deal" autoFocus style={input} />
      <input value={value} onChange={e => setValue(e.target.value)} placeholder="Valor (USD)" type="number" min="0" style={input} />
      <div style={{ position: "relative" }}>
        {selectedContact ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}>
            <span>{selectedContact.name}{selectedContact.company ? ` · ${selectedContact.company}` : ""}</span>
            <button onClick={() => { setContactId(""); setContactQuery(""); }} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
          </div>
        ) : (
          <>
            <input value={contactQuery} onChange={e => setContactQuery(e.target.value)} placeholder="Buscar contacto…" style={input} />
            {filteredContacts.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 30, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, padding: 3, maxHeight: 160, overflowY: "auto", boxShadow: "0 6px 16px rgba(0,0,0,0.3)" }}>
                {filteredContacts.map(c => (
                  <div key={c.id} onClick={() => { setContactId(c.id); setContactQuery(""); }}
                    style={{ padding: "5px 8px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    {c.company && <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{c.company}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        <button onClick={submit} disabled={saving} style={{ flex: 1, padding: "5px", borderRadius: 5, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 11, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "…" : "Crear"}
        </button>
        <button onClick={close} style={{ padding: "5px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 11, cursor: "pointer" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
