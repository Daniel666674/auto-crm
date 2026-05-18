"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConsentBadge } from "./ConsentBadge";
import { DataDeletionModal } from "./DataDeletionModal";
import { ContactForm } from "./ContactForm";
import { ActivityForm } from "@/components/activities/ActivityForm";
import { formatCurrency, formatDate, formatRelativeDate, cleanPhoneForWhatsApp } from "@/lib/constants";
import { ACTIVITY_TYPE_CONFIG, SOURCE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import type { Temperature, ActivityType, LeadSource } from "@/types";

const TEMP_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  hot:  { label: "Caliente", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  warm: { label: "Tibio",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  cold: { label: "Frío",     color: "var(--muted-foreground)", bg: "rgba(255,255,255,0.06)" },
};

const ACT_EMOJI: Record<string, string> = {
  call: "📞", email: "✉️", meeting: "🤝", note: "📝", follow_up: "⏰",
};

function qaBtn(color: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
    background: `${color}1a`, color, textDecoration: "none",
    border: `1px solid ${color}33`,
  };
}

const CONSENT_SOURCES = [
  { value: "event", label: "Evento" },
  { value: "form", label: "Formulario" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "cold_email", label: "Email frío" },
  { value: "referral", label: "Referido" },
  { value: "unknown", label: "Desconocido" },
];

interface ContactDetailClientProps {
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    source: string;
    temperature: string;
    score: number;
    notes: string | null;
    createdAt: number | Date;
    consentGiven?: boolean | null;
    consentSource?: string | null;
    engagementStatus?: string | null;
    engagementScore?: number | null;
  };
  deals: Array<{
    id: string;
    title: string;
    value: number;
    probability: number;
    stageName: string | null;
    stageColor: string | null;
    createdAt: number | Date;
  }>;
  activities: Array<{
    id: string;
    type: string;
    description: string;
    scheduledAt: number | Date | null;
    completedAt: number | Date | null;
    createdAt: number | Date;
  }>;
}

export function ContactDetailClient({ contact, deals, activities }: ContactDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"stage" | "score" | "nextsteps" | "activities">("stage");
  const [showEditForm, setShowEditForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [consentGiven, setConsentGiven] = useState(contact.consentGiven ?? false);
  const [consentSource, setConsentSource] = useState(contact.consentSource ?? "unknown");
  const [savingConsent, setSavingConsent] = useState(false);
  const [returningToMkt, setReturningToMkt] = useState(false);
  const [returnedToMkt, setReturnedToMkt] = useState(false);

  const temp = TEMP_CONFIG[contact.temperature] ?? TEMP_CONFIG.cold;
  const initials = contact.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleCompleteActivity = async (activityId: string) => {
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Actividad completada");
      router.refresh();
    } catch {
      toast.error("Error al completar la actividad");
    }
  };

  const handleReturnToMarketing = async () => {
    setReturningToMkt(true);
    try {
      const res = await fetch("/api/return-to-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error al devolver a marketing");
        return;
      }
      setReturnedToMkt(true);
      toast.success("Contacto devuelto al pipeline de marketing");
    } catch {
      toast.error("Error al devolver a marketing");
    } finally {
      setReturningToMkt(false);
    }
  };

  const handleSaveConsent = async () => {
    setSavingConsent(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentGiven,
          consentSource,
          consentDate: consentGiven ? new Date().toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Consentimiento actualizado");
    } catch {
      toast.error("Error al actualizar consentimiento");
    } finally {
      setSavingConsent(false);
    }
  };

  const tabs = [
    { id: "stage" as const, label: "Stage" },
    { id: "score" as const, label: "Score" },
    { id: "nextsteps" as const, label: "Próximos Pasos" },
    { id: "activities" as const, label: `Actividades (${activities.length})` },
  ];

  const pendingActivities = activities.filter(a => !a.completedAt && a.scheduledAt);
  const completedActivities = activities.filter(a => a.completedAt);

  const scoreBreakdown = [
    { label: "Temperatura", value: contact.temperature === "hot" ? 40 : contact.temperature === "warm" ? 25 : 10, max: 40 },
    { label: "Actividad reciente", value: Math.min(activities.length * 5, 30), max: 30 },
    { label: "Deal activo", value: deals.length > 0 ? 20 : 0, max: 20 },
    { label: "Datos completos", value: [contact.email, contact.phone, contact.company].filter(Boolean).length * 3, max: 10 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Back header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => router.push("/contacts")}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)",
            fontSize: 12, color: "var(--muted-foreground)", cursor: "pointer",
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
          Contactos
        </button>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Left sidebar */}
        <div style={{
          width: 280, flexShrink: 0, borderRadius: 12,
          border: "1px solid var(--border)", background: "var(--card)",
          padding: 20, display: "flex", flexDirection: "column", gap: 16,
        }}>
          {/* Avatar + name */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", background: "var(--primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 700, color: "var(--primary-foreground)",
            }}>
              {initials}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{contact.name}</div>
              {contact.company && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{contact.company}</div>}
            </div>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: temp.bg, color: temp.color,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: temp.color, display: "inline-block" }} />
              {temp.label}
            </span>
            <ConsentBadge consentGiven={consentGiven} />
          </div>

          {/* Contact info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {contact.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ color: "var(--muted-foreground)" }}>✉️</span>
                <a href={`mailto:${contact.email}`} style={{ color: "var(--primary)", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ color: "var(--muted-foreground)" }}>📱</span>
                <span style={{ flex: 1, color: "var(--foreground)" }}>{contact.phone}</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ color: "var(--muted-foreground)" }}>🏷️</span>
              <span style={{ color: "var(--muted-foreground)" }}>{SOURCE_LABELS[contact.source as LeadSource] || contact.source}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ color: "var(--muted-foreground)" }}>📅</span>
              <span style={{ color: "var(--muted-foreground)" }}>Desde {formatDate(contact.createdAt)}</span>
            </div>
            {contact.engagementStatus && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ color: "var(--muted-foreground)" }}>📊</span>
                <span style={{ color: "var(--muted-foreground)" }}>Brevo: <b>{contact.engagementStatus}</b></span>
              </div>
            )}
          </div>

          {/* Quick actions — Email · WhatsApp · Call · LinkedIn */}
          {(contact.phone || contact.email) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingTop: 4 }}>
              {contact.email && (
                <a href={`mailto:${contact.email}`} style={qaBtn("#3b82f6")}>✉️ Email</a>
              )}
              {contact.phone && (
                <a href={`https://wa.me/${cleanPhoneForWhatsApp(contact.phone)}`} target="_blank" rel="noopener noreferrer" style={qaBtn("#22c55e")}>
                  💬 WhatsApp
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} style={qaBtn("#f59e0b")}>📞 Llamar</a>
              )}
              <a
                href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(contact.name + (contact.company ? " " + contact.company : ""))}`}
                target="_blank" rel="noopener noreferrer"
                style={qaBtn("#0a66c2")}
              >
                in LinkedIn
              </a>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div style={{ padding: 10, borderRadius: 8, background: "var(--background)", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              {contact.notes}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
            <button
              onClick={() => setShowEditForm(true)}
              style={{
                padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)",
                background: "transparent", color: "var(--foreground)", fontSize: 12,
                cursor: "pointer", fontWeight: 500,
              }}
            >
              ✏️ Editar contacto
            </button>
            <button
              onClick={() => setShowActivityForm(true)}
              style={{
                padding: "8px 0", borderRadius: 8, border: "1px solid var(--primary)",
                background: "rgba(209,156,21,0.08)", color: "var(--primary)", fontSize: 12,
                cursor: "pointer", fontWeight: 500,
              }}
            >
              + Registrar actividad
            </button>
            <DataDeletionModal
              contactId={contact.id}
              contactName={contact.name}
              onDeleted={() => router.push("/contacts")}
            />
          </div>
        </div>

        {/* Right: tabs */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  border: "none", background: "transparent",
                  color: activeTab === tab.id ? "var(--primary)" : "var(--muted-foreground)",
                  borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
                  marginBottom: -1, transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stage tab */}
          {activeTab === "stage" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {contact.source === "marketing_handoff" && !returnedToMkt && (
                <button
                  onClick={handleReturnToMarketing}
                  disabled={returningToMkt}
                  style={{
                    alignSelf: "flex-start", padding: "6px 14px", borderRadius: 8, fontSize: 12,
                    fontWeight: 600, cursor: returningToMkt ? "not-allowed" : "pointer",
                    border: "1px solid #D19C15", color: "#D19C15",
                    background: returningToMkt ? "rgba(209,156,21,0.06)" : "transparent",
                    opacity: returningToMkt ? 0.7 : 1, transition: "background 0.15s",
                  }}
                >
                  {returningToMkt ? "Devolviendo…" : "↩ Devolver a Marketing"}
                </button>
              )}
              {returnedToMkt && (
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "6px 0" }}>
                  Contacto devuelto al pipeline de marketing.
                </div>
              )}
              {deals.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, borderRadius: 10, border: "1px dashed var(--border)" }}>
                  Sin deals asociados
                </div>
              ) : deals.map(deal => (
                <div
                  key={deal.id}
                  onClick={() => router.push(`/deals/${deal.id}`)}
                  style={{
                    padding: 16, borderRadius: 10, border: "1px solid var(--border)",
                    background: "var(--card)", cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{deal.title}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>{formatCurrency(deal.value)}</div>
                    </div>
                    {deal.stageName && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                        border: `1px solid ${deal.stageColor || "var(--border)"}`,
                        color: deal.stageColor || "var(--muted-foreground)",
                        background: deal.stageColor ? `${deal.stageColor}18` : "transparent",
                      }}>
                        {deal.stageName}
                      </span>
                    )}
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${deal.probability}%`, borderRadius: 2, background: deal.stageColor || "var(--primary)", transition: "width 0.3s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--muted-foreground)" }}>
                    <span>Probabilidad: {deal.probability}%</span>
                    <span>{formatDate(deal.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Score tab */}
          {activeTab === "score" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* ICP Fit score (Apollo) */}
              <div style={{ display: "flex", alignItems: "center", gap: 24, padding: 20, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}>
                <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
                  <svg width="100" height="100" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--primary)" strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - (contact.score ?? 0) / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)" }}>{contact.score ?? 0}</span>
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>/100</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>ICP Fit (Apollo)</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                    Calidad del perfil: cargo, tamaño de empresa, industria e intención. Calculado a partir del CSV de Apollo.
                  </div>
                </div>
              </div>

              {/* Engagement score (Brevo) — only shown if present */}
              {contact.engagementScore != null && (
                <div style={{ display: "flex", alignItems: "center", gap: 24, padding: 20, borderRadius: 10, border: "1px solid rgba(45,212,191,0.25)", background: "rgba(45,212,191,0.06)" }}>
                  <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
                    <svg width="100" height="100" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#2dd4bf" strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - contact.engagementScore / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: "#2dd4bf" }}>{contact.engagementScore}</span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>/100</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Engagement (Brevo)</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                      Nivel de engagement en campañas de email. Solo disponible para contactos activos en Brevo.
                    </div>
                  </div>
                </div>
              )}

              {/* Breakdown */}
              <div style={{ padding: 16, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Desglose ICP Fit</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {scoreBreakdown.map(item => (
                    <div key={item.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "var(--muted-foreground)" }}>{item.label}</span>
                        <span style={{ fontWeight: 600 }}>{item.value}/{item.max}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(item.value / item.max) * 100}%`, borderRadius: 2, background: "var(--primary)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Next Steps tab */}
          {activeTab === "nextsteps" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendingActivities.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, borderRadius: 10, border: "1px dashed var(--border)" }}>
                  Sin pasos pendientes
                  <br />
                  <button
                    onClick={() => setShowActivityForm(true)}
                    style={{ marginTop: 12, padding: "6px 14px", borderRadius: 6, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                  >
                    + Agregar actividad
                  </button>
                </div>
              ) : pendingActivities.map(a => {
                const config = ACTIVITY_TYPE_CONFIG[a.type as ActivityType];
                return (
                  <div key={a.id} style={{ padding: 14, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ fontSize: 20, flexShrink: 0 }}>{ACT_EMOJI[a.type] || "📝"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>{config?.label || a.type}</span>
                        {a.scheduledAt && (
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                            {formatDate(a.scheduledAt)}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.4, margin: 0 }}>{a.description}</p>
                    </div>
                    <button
                      onClick={() => handleCompleteActivity(a.id)}
                      style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        border: "1px solid #22c55e", background: "rgba(34,197,94,0.1)",
                        color: "#22c55e", cursor: "pointer", flexShrink: 0,
                      }}
                    >
                      ✓ Completar
                    </button>
                  </div>
                );
              })}

              {completedActivities.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    Completadas ({completedActivities.length})
                  </div>
                  {completedActivities.slice(0, 3).map(a => (
                    <div key={a.id} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", gap: 10, marginBottom: 6, opacity: 0.6 }}>
                      <span style={{ fontSize: 14 }}>{ACT_EMOJI[a.type] || "📝"}</span>
                      <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)", flexShrink: 0 }}>✓</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activities tab */}
          {activeTab === "activities" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button
                  onClick={() => setShowActivityForm(true)}
                  style={{
                    padding: "6px 14px", borderRadius: 6, border: "1px solid var(--primary)",
                    background: "rgba(209,156,21,0.08)", color: "var(--primary)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  + Registrar
                </button>
              </div>

              {activities.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, borderRadius: 10, border: "1px dashed var(--border)" }}>
                  Sin actividades registradas
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {activities.map((a, i) => {
                    const config = ACTIVITY_TYPE_CONFIG[a.type as ActivityType];
                    const isPending = !a.completedAt && a.scheduledAt;
                    return (
                      <div key={a.id} style={{ display: "flex", gap: 12, paddingBottom: 16, position: "relative" }}>
                        {/* Timeline line */}
                        {i < activities.length - 1 && (
                          <div style={{ position: "absolute", left: 17, top: 36, bottom: 0, width: 1, background: "var(--border)" }} />
                        )}
                        {/* Icon */}
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                          background: "var(--card)", border: "1px solid var(--border)",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                          zIndex: 1,
                        }}>
                          {ACT_EMOJI[a.type] || "📝"}
                        </div>
                        {/* Content */}
                        <div style={{ flex: 1, paddingTop: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{config?.label || a.type}</span>
                            {isPending && (
                              <button
                                onClick={() => handleCompleteActivity(a.id)}
                                style={{
                                  padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                                  border: "1px solid #f59e0b", background: "rgba(245,158,11,0.1)",
                                  color: "#f59e0b", cursor: "pointer",
                                }}
                              >
                                Pendiente
                              </button>
                            )}
                            {a.completedAt && (
                              <span style={{ fontSize: 10, color: "#22c55e" }}>✓ Completada</span>
                            )}
                          </div>
                          <p style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.4, margin: "0 0 4px" }}>{a.description}</p>
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{formatRelativeDate(a.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Consent section — always visible below tabs */}
          <div style={{ marginTop: 20, padding: 16, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              🛡️ Consentimiento — Ley 1581 de 2012
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6, fontWeight: 600 }}>Estado</div>
                <div style={{ display: "flex", gap: 16 }}>
                  {[{ val: true, label: "Consentimiento dado" }, { val: false, label: "Sin consentimiento" }].map(o => (
                    <label key={String(o.val)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                      <input type="radio" name="consent" checked={consentGiven === o.val} onChange={() => setConsentGiven(o.val)} />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6, fontWeight: 600 }}>Fuente</div>
                <select
                  value={consentSource}
                  onChange={e => setConsentSource(e.target.value)}
                  style={{ borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", padding: "6px 10px", fontSize: 12, color: "var(--foreground)" }}
                >
                  {CONSENT_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <button
                onClick={handleSaveConsent}
                disabled={savingConsent}
                style={{
                  padding: "6px 14px", borderRadius: 6, background: "var(--primary)", color: "var(--primary-foreground)",
                  border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: savingConsent ? 0.6 : 1,
                }}
              >
                {savingConsent ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ContactForm
        open={showEditForm}
        onClose={() => { setShowEditForm(false); router.refresh(); }}
        initialData={{
          id: contact.id,
          name: contact.name,
          email: contact.email || "",
          phone: contact.phone || "",
          company: contact.company || "",
          source: contact.source,
          temperature: contact.temperature as "cold" | "warm" | "hot",
          notes: contact.notes || "",
        }}
      />

      <ActivityForm
        open={showActivityForm}
        onClose={() => { setShowActivityForm(false); router.refresh(); }}
        preselectedContactId={contact.id}
      />
    </div>
  );
}
