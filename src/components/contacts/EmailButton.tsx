"use client";

import React, { useState, useRef, useEffect } from "react";
import { EMAIL_TEMPLATES, buildMailto } from "@/lib/email-templates";

interface Props {
  email: string;
  contactName: string;
  companyName?: string | null;
  title?: string | null;
}

export function EmailButton({ email, contactName, companyName, title }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const vars = {
    name: contactName.split(" ")[0] || contactName,
    fullname: contactName,
    company: companyName || "",
    title: title || "",
  };

  const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
    background: "#3b82f61a", color: "#3b82f6",
    border: "1px solid #3b82f633",
    width: "100%",
  };

  const itemStyle: React.CSSProperties = {
    display: "block", padding: "7px 10px", fontSize: 12, color: "var(--foreground)",
    textDecoration: "none", borderRadius: 5, cursor: "pointer",
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button onClick={() => setOpen(!open)} style={btnStyle}>
        ✉️ Email <span style={{ marginLeft: 2, fontSize: 9 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
          padding: 4, boxShadow: "0 6px 16px rgba(0,0,0,0.25)", minWidth: 180,
        }}>
          <a href={`mailto:${email}`} onClick={() => setOpen(false)} style={itemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.background = "")}>
            Email vacío
          </a>
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          <div style={{ padding: "4px 10px", fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Plantillas
          </div>
          {EMAIL_TEMPLATES.map(t => (
            <a
              key={t.id}
              href={buildMailto(email, t.id, vars)}
              onClick={() => setOpen(false)}
              style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}
            >
              {t.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
