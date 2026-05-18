"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
  contactId: string;
  contactName?: string;
  dealId?: string;
  dealTitle?: string;
}

const REASON_PRESETS = [
  "No es buen fit",
  "No está listo todavía",
  "Mal timing",
  "Duplicado",
  "Enviado por error",
];

export function ReturnToMarketingModal({ open, onClose, onDone, contactId, contactName, dealId, dealTitle }: Props) {
  const [reason, setReason] = useState("");
  const [moveToLost, setMoveToLost] = useState<"keep" | "lost">("lost");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/return-to-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          dealId: dealId || undefined,
          reason: reason || undefined,
          moveToLost: moveToLost === "lost",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al devolver a marketing");
        return;
      }
      toast.success("Devuelto a marketing correctamente");
      onClose();
      setReason("");
      setMoveToLost("lost");
      onDone?.();
    } catch {
      toast.error("Error al devolver a marketing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Devolver a marketing</h2>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 18 }}>
          {dealTitle ? <><strong>{dealTitle}</strong> · {contactName}</> : contactName ?? "Contacto"}
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "block" }}>
            Razón
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {REASON_PRESETS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                style={{
                  padding: "5px 11px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer",
                  border: `1px solid ${reason === p ? "var(--primary)" : "var(--border)"}`,
                  background: reason === p ? "rgba(209,156,21,0.1)" : "transparent",
                  color: reason === p ? "var(--primary)" : "var(--muted-foreground)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Detalles adicionales (opcional)..."
            rows={3}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--background)",
              color: "var(--foreground)", fontSize: 13, fontFamily: "inherit",
              outline: "none", resize: "vertical", boxSizing: "border-box",
            }}
          />
        </div>

        {dealId && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "block" }}>
              ¿Qué hacer con el deal?
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Option
                selected={moveToLost === "lost"}
                onClick={() => setMoveToLost("lost")}
                title="Mover a Cerrado Perdido"
                description="El deal queda registrado como perdido con la razón anotada."
              />
              <Option
                selected={moveToLost === "keep"}
                onClick={() => setMoveToLost("keep")}
                title="Mantener en su etapa actual"
                description="Sólo se agrega la nota de devolución al deal."
              />
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)",
              background: "transparent", color: "var(--muted-foreground)",
              fontSize: 13, cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: "var(--primary)", color: "var(--primary-foreground)",
              fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Devolviendo..." : "Confirmar devolución"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Option({ selected, onClick, title, description }: { selected: boolean; onClick: () => void; title: string; description: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer",
        border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
        background: selected ? "rgba(209,156,21,0.08)" : "transparent",
        display: "flex", alignItems: "flex-start", gap: 10, width: "100%",
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 1,
        border: `2px solid ${selected ? "var(--primary)" : "var(--muted-foreground)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)" }} />}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: selected ? "var(--primary)" : "var(--foreground)" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{description}</div>
      </div>
    </button>
  );
}
