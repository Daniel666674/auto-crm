"use client";

import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Mail, X, FileText } from "lucide-react";
import { EMAIL_TEMPLATES, fillTemplate } from "@/lib/email-templates";
import { BSSpinner } from "@/components/ui/BSSpinner";

interface Props {
  email: string;
  contactName: string;
  companyName?: string | null;
  title?: string | null;
  contactId?: string;
}

const OVERLAY: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(0,0,0,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const MODAL: React.CSSProperties = {
  width: 540,
  background: "#11110F",
  border: "1px solid rgba(215,210,203,0.1)",
  borderRadius: 14,
  padding: 24,
  position: "relative",
  maxHeight: "90vh",
  overflowY: "auto",
};

const FIELD_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#7a756e",
  display: "block",
  marginBottom: 5,
};

const FIELD_INPUT: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(215,210,203,0.1)",
  color: "#D7D2CB",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

export function EmailButton({ email, contactName, companyName, title, contactId }: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(email);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "warn"; msg: string } | null>(null);

  const vars = {
    name: contactName.split(" ")[0] || contactName,
    fullname: contactName,
    company: companyName || "",
    title: title || "",
  };

  const applyTemplate = useCallback(
    (templateId: string) => {
      const tmpl = EMAIL_TEMPLATES.find((t) => t.id === templateId);
      if (!tmpl) return;
      setSubject(fillTemplate(tmpl.subject, vars));
      setBody(fillTemplate(tmpl.body, vars));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contactName, companyName, title]
  );

  const openModal = () => {
    setTo(email);
    setSubject("");
    setBody("");
    setFeedback(null);
    setOpen(true);
  };

  const closeModal = () => {
    if (sending) return;
    setOpen(false);
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      setFeedback({ type: "error", msg: "Completa todos los campos" });
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, to, subject, body }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        const errMsg = data.error || "Error al enviar";
        if (errMsg.includes("RESEND_API_KEY")) {
          setFeedback({ type: "warn", msg: "Configura RESEND_API_KEY para enviar emails" });
        } else {
          setFeedback({ type: "error", msg: errMsg });
        }
        setSending(false);
        return;
      }
      setFeedback({ type: "success", msg: "Email enviado" });
      setTimeout(() => {
        setOpen(false);
        setFeedback(null);
      }, 2000);
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Error de red" });
    } finally {
      setSending(false);
    }
  };

  const triggerBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: "7px 0",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    background: "#3b82f61a",
    color: "#3b82f6",
    border: "1px solid #3b82f633",
    width: "100%",
  };

  return (
    <>
      <button onClick={openModal} style={triggerBtn}>
        <Mail size={13} /> Email
      </button>

      {open &&
        createPortal(
          <div style={OVERLAY} onClick={closeModal}>
            <div style={MODAL} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 18,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: "#D7D2CB" }}>
                  Nuevo mensaje
                </span>
                <button
                  onClick={closeModal}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#7a756e",
                    display: "flex",
                    alignItems: "center",
                    padding: 4,
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Template pills */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ ...FIELD_LABEL, marginBottom: 8 }}>Plantillas</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {EMAIL_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => applyTemplate(tmpl.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                        background: "rgba(209,156,21,0.1)",
                        color: "#C39A4C",
                        border: "1px solid rgba(209,156,21,0.25)",
                        cursor: "pointer",
                      }}
                    >
                      <FileText size={10} />
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={FIELD_LABEL}>Para</label>
                  <input
                    style={FIELD_INPUT}
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
                <div>
                  <label style={FIELD_LABEL}>Asunto</label>
                  <input
                    style={FIELD_INPUT}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label style={FIELD_LABEL}>Mensaje</label>
                  <textarea
                    style={{
                      ...FIELD_INPUT,
                      height: 220,
                      resize: "vertical",
                      lineHeight: 1.6,
                      display: "block",
                    }}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 20,
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12 }}>
                  {feedback?.type === "success" && (
                    <span style={{ color: "#22c55e" }}>{feedback.msg}</span>
                  )}
                  {feedback?.type === "error" && (
                    <span style={{ color: "#ef4444" }}>{feedback.msg}</span>
                  )}
                  {feedback?.type === "warn" && (
                    <span
                      style={{
                        color: "#D19C15",
                        background: "rgba(209,156,21,0.08)",
                        border: "1px solid rgba(209,156,21,0.2)",
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      {feedback.msg}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={closeModal}
                    disabled={sending}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(215,210,203,0.15)",
                      color: "#7a756e",
                      borderRadius: 9,
                      padding: "10px 20px",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: sending ? "not-allowed" : "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    style={{
                      background: sending ? "#9a7410" : "#D19C15",
                      color: "#0a0a09",
                      fontWeight: 700,
                      padding: "10px 24px",
                      borderRadius: 9,
                      border: "none",
                      fontSize: 13,
                      cursor: sending ? "not-allowed" : "pointer",
                      transition: "background 0.12s",
                    }}
                  >
                    {sending ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <BSSpinner size="sm" /> Enviando…
                      </span>
                    ) : (
                      "Enviar"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
