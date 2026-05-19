"use client";

import React, { useState } from "react";
import { CreditCard, Copy, ExternalLink, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";

interface WompiPaymentCardProps {
  dealId: string;
  dealValue: number;
  paymentLinkUrl: string | null;
  paymentStatus: string | null;
  paymentReference: string | null;
  paidAt: Date | null;
}

function formatCOP(cents: number): string {
  const cop = Math.round(cents / 100);
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(cop);
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:  { label: "Pendiente",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <Clock size={14} /> },
  APPROVED: { label: "Aprobado",   color: "#22c55e", bg: "rgba(34,197,94,0.12)",  icon: <CheckCircle2 size={14} /> },
  DECLINED: { label: "Rechazado",  color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: <XCircle size={14} /> },
  VOIDED:   { label: "Anulado",    color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: <XCircle size={14} /> },
};

export function WompiPaymentCard({ dealId, dealValue, paymentLinkUrl, paymentStatus, paymentReference, paidAt }: WompiPaymentCardProps) {
  const [loading, setLoading] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateLink() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/wompi/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      const d = await res.json();
      if (d.error) {
        alert(`Error: ${d.error}`);
      } else {
        window.location.reload();
      }
    } finally { setLoading(false); }
  }

  async function simulateApproved() {
    if (!paymentReference) return;
    setMockLoading(true);
    try {
      const res = await fetch("/api/payments/wompi/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "transaction.updated",
          data: { transaction: { reference: paymentReference, status: "APPROVED", amount_in_cents: dealValue } },
        }),
      });
      const d = await res.json();
      if (d.error) alert(`Error: ${d.error}`);
      else window.location.reload();
    } finally { setMockLoading(false); }
  }

  function copyLink() {
    if (!paymentLinkUrl) return;
    navigator.clipboard.writeText(paymentLinkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const status = paymentStatus ? STATUS_CFG[paymentStatus] ?? { label: paymentStatus, color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: <Clock size={14} /> } : null;
  const hasLink = !!paymentLinkUrl;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 18, background: "var(--card)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CreditCard size={16} color="#22c55e" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Pago Wompi</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Link de pago en COP — mockup para integración real</div>
        </div>
        {status && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: status.bg, color: status.color }}>
            {status.icon}
            {status.label}
          </span>
        )}
      </div>

      {!hasLink && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ padding: 12, borderRadius: 8, background: "var(--background)", border: "1px dashed var(--border)", fontSize: 12, color: "var(--muted-foreground)" }}>
            Genera un link de pago Wompi por <strong style={{ color: "var(--foreground)" }}>{formatCOP(dealValue)}</strong> y envíaselo al cliente. Cuando se apruebe, el deal se mueve automáticamente a <em>Cerrado Ganado</em>.
          </div>
          <button
            disabled={loading || dealValue <= 0}
            onClick={generateLink}
            style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: dealValue > 0 && !loading ? "#22c55e" : "var(--border)", color: dealValue > 0 && !loading ? "white" : "var(--muted-foreground)", cursor: dealValue > 0 && !loading ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <CreditCard size={14} /> {loading ? "Generando…" : "Generar link Wompi"}
          </button>
          {dealValue <= 0 && (
            <div style={{ fontSize: 11, color: "#f59e0b" }}>El deal necesita un valor mayor a $0 para generar un link.</div>
          )}
        </div>
      )}

      {hasLink && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>Link de pago</div>
            <div style={{ display: "flex", gap: 6 }}>
              <code style={{ flex: 1, padding: "8px 10px", borderRadius: 6, background: "var(--background)", border: "1px solid var(--border)", fontSize: 11, fontFamily: "monospace", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {paymentLinkUrl}
              </code>
              <button onClick={copyLink} title="Copiar" style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <Copy size={12} /> {copied ? "Copiado" : "Copiar"}
              </button>
              <a href={paymentLinkUrl ?? "#"} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, textDecoration: "none" }}>
                <ExternalLink size={12} /> Abrir
              </a>
            </div>
          </div>

          {paymentReference && (
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              Referencia: <span style={{ fontFamily: "monospace", color: "var(--foreground)" }}>{paymentReference}</span>
            </div>
          )}

          {paidAt && (
            <div style={{ fontSize: 11, color: "#22c55e" }}>
              Pagado el {new Date(paidAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          )}

          {paymentStatus === "PENDING" && (
            <div style={{ padding: 10, borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 6, fontWeight: 600 }}>⚠ Modo mockup</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8, lineHeight: 1.5 }}>
                Simula que Wompi notificó un pago aprobado. En producción esto vendría del webhook real.
              </div>
              <button
                disabled={mockLoading}
                onClick={simulateApproved}
                style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid #22c55e", background: "transparent", color: "#22c55e", cursor: mockLoading ? "not-allowed" : "pointer" }}
              >
                <RefreshCw size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                {mockLoading ? "Simulando…" : "Simular pago aprobado"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
