"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Link2, Users } from "lucide-react";
import { CustomFieldValues, parseCustomFields } from "@/components/shared/CustomFields";
import { ConsentBadge } from "./ConsentBadge";
import { DataDeletionModal } from "./DataDeletionModal";
import { ContactForm } from "./ContactForm";
import { ActivityForm } from "@/components/activities/ActivityForm";
import { ContactEngagementCard } from "./ContactEngagementCard";
import { ContactNextBestAction } from "./ContactNextBestAction";
import { EmailButton } from "./EmailButton";
import { TagsEditor } from "./TagsEditor";
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

const TIER_CONFIG: Record<string, string> = {
  A: "#16a34a", B: "#C39A4C", C: "#4299e1", D: "#64748b",
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
    title?: string | null;
    industry?: string | null;
    location?: string | null;
    linkedinUrl?: string | null;
    companyWebsite?: string | null;
    companyLinkedin?: string | null;
    employeeCount?: number | null;
    fitScore?: number | null;
    fitTier?: string | null;
    sigLinkedinAds?: boolean | null;
    sigPostFreq?: string | null;
    sigDmActive?: boolean | null;
    sigMetaAds?: boolean | null;
    sigGoogleAds?: boolean | null;
    sigMgrNoHead?: boolean | null;
    sigVacancy?: boolean | null;
    whatsappNumber?: string | null;
    tags?: string | null;
    lifecycleStage?: string | null;
    returnedToMarketingAt?: number | Date | null;
    returnedToMarketingReason?: string | null;
    firstTouchCampaignId?: string | null;
    lastTouchCampaignId?: string | null;
    customFields?: string | null;
  };
  deals: Array<{
    id: string;
    title: string;
    value: number;
    probability: number;
    stageName: string | null;
    stageColor: string | null;
    stageOrder?: number | null;
    isWon?: boolean | null;
    isLost?: boolean | null;
    stageId: string;
    createdAt: number | Date;
  }>;
  activities: Array<{
    id: string;
    type: string;
    description: string;
    scheduledAt: number | Date | null;
    completedAt: number | Date | null;
    createdAt: number | Date;
    transcriptText?: string | null;
    daptaMeetingId?: string | null;
  }>;
  relatedContacts?: Array<{
    id: string;
    name: string;
    company: string | null;
    title: string | null;
  }>;
  stages?: Array<{
    id: string;
    order: number;
    isWon: boolean;
    isLost: boolean;
  }>;
  emailEvents?: Array<{
    id: string;
    type: string;
    messageId: string | null;
    url: string | null;
    createdAt: number | Date;
  }>;
}

const EMAIL_EVENT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  sent:        { icon: "✉️", label: "Email enviado",         color: "#4299e1" },
  open:        { icon: "👁️", label: "Email abierto",        color: "#48bb78" },
  click:       { icon: "🔗", label: "Link clicado",          color: "#9f7aea" },
  reply:       { icon: "↩️", label: "Respuesta recibida",   color: "#C39A4C" },
  bounce:      { icon: "⚠️", label: "Email rebotado",        color: "#ef4444" },
  unsubscribe: { icon: "🚫", label: "Canceló suscripción",  color: "#718096" },
  complaint:   { icon: "🚨", label: "Marcó como spam",       color: "#ef4444" },
};

type TimelineItem =
  | { kind: "activity"; id: string; type: string; description: string; scheduledAt: number | Date | null; completedAt: number | Date | null; createdAt: number | Date; transcriptText?: string | null; daptaMeetingId?: string | null }
  | { kind: "email_event"; id: string; type: string; url: string | null; createdAt: number | Date };

function DaptaTranscript({ transcript }: { transcript: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const preview = transcript.slice(0, 200);
  return (
    <div style={{ marginBottom: 6, padding: "8px 10px", borderRadius: 6, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>🎙 Transcripción Dapta</span>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, cursor: "pointer", border: "1px solid rgba(139,92,246,0.3)", background: "transparent", color: "#a78bfa" }}
        >
          {expanded ? "Contraer" : "Ver completa"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--foreground)", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
        {expanded ? transcript : `${preview}${transcript.length > 200 ? "…" : ""}`}
      </p>
    </div>
  );
}

function toMs(val: Date | number | null | undefined): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  return (val as number) < 1e10 ? (val as number) * 1000 : (val as number);
}

export function ContactDetailClient({ contact, deals, activities, relatedContacts = [], stages = [], emailEvents = [] }: ContactDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"stage" | "score" | "nextsteps" | "activities" | "related">("stage");
  const [showEditForm, setShowEditForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [consentGiven, setConsentGiven] = useState(contact.consentGiven ?? false);
  const [consentSource, setConsentSource] = useState(contact.consentSource ?? "unknown");
  const [savingConsent, setSavingConsent] = useState(false);
  const [returningToMkt, setReturningToMkt] = useState(false);
  const [returnedToMkt, setReturnedToMkt] = useState(false);
  const [sendToMktOpen, setSendToMktOpen] = useState(false);
  const [sendToMktReason, setSendToMktReason] = useState("");
  const [sendToMktSubmitting, setSendToMktSubmitting] = useState(false);

  const [signals, setSignals] = useState({
    sigLinkedinAds: contact.sigLinkedinAds ?? false,
    sigPostFreq: contact.sigPostFreq ?? "",
    sigDmActive: contact.sigDmActive ?? false,
    sigMetaAds: contact.sigMetaAds ?? false,
    sigGoogleAds: contact.sigGoogleAds ?? false,
    sigMgrNoHead: contact.sigMgrNoHead ?? false,
    sigVacancy: contact.sigVacancy ?? false,
  });

  const updateSignal = async (field: keyof typeof signals, value: boolean | string) => {
    const prev = signals[field];
    setSignals(s => ({ ...s, [field]: value }));
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      toast.success("Señal actualizada");
      router.refresh();
    } catch {
      setSignals(s => ({ ...s, [field]: prev }));
      toast.error("Error al actualizar la señal");
    }
  };

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
      toast.success("Contacto devuelto al pipeline de marketing");
      router.push("/contacts");
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
    { id: "activities" as const, label: `Actividades (${activities.length + emailEvents.length})` },
    { id: "related" as const, label: `Relacionados (${relatedContacts.length})` },
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
              {contact.title && <div style={{ fontSize: 12, color: "var(--foreground)", marginTop: 1, fontWeight: 500 }}>{contact.title}</div>}
              {contact.company && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 1 }}>{contact.company}</div>}
              {contact.industry && (
                <span style={{ display: "inline-block", marginTop: 4, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                  {contact.industry}
                </span>
              )}
            </div>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: temp.bg, color: temp.color,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: temp.color, display: "inline-block" }} />
              {temp.label}
            </span>
            {contact.fitTier && TIER_CONFIG[contact.fitTier] && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: `${TIER_CONFIG[contact.fitTier]}1f`, color: TIER_CONFIG[contact.fitTier],
              }}>
                Fit {contact.fitTier}{contact.fitScore != null ? ` · ${contact.fitScore}` : ""}
              </span>
            )}
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
            {contact.location && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ color: "var(--muted-foreground)" }}>📍</span>
                <span style={{ color: "var(--muted-foreground)" }}>{contact.location}</span>
              </div>
            )}
            {contact.companyWebsite && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <Globe size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <a href={contact.companyWebsite} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {contact.companyWebsite.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            {contact.companyLinkedin && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <Link2 size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <a href={contact.companyLinkedin} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  LinkedIn empresa
                </a>
              </div>
            )}
            {contact.employeeCount != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <Users size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ color: "var(--muted-foreground)" }}>{contact.employeeCount} empleados</span>
              </div>
            )}
            {contact.engagementStatus && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ color: "var(--muted-foreground)" }}>📊</span>
                <span style={{ color: "var(--muted-foreground)" }}>Brevo: <b>{contact.engagementStatus}</b></span>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {contact.email ? (
                <EmailButton email={contact.email} contactName={contact.name} companyName={contact.company} title={contact.title} contactId={contact.id} />
              ) : (
                <button onClick={() => setShowEditForm(true)} style={{ ...qaBtn("#3b82f6"), border: "1px dashed #3b82f655", background: "rgba(59,130,246,0.06)" }} title="Agregar email para enviar mensajes">
                  ✉️ Agregar email
                </button>
              )}
              {contact.phone ? (
                <a href={`https://wa.me/${cleanPhoneForWhatsApp(contact.phone)}`} target="_blank" rel="noopener noreferrer" style={qaBtn("#22c55e")}>
                  💬 WhatsApp
                </a>
              ) : (
                <button onClick={() => setShowEditForm(true)} style={{ ...qaBtn("#22c55e"), border: "1px dashed #22c55e55", background: "rgba(34,197,94,0.06)" }} title="Agregar teléfono para WhatsApp">
                  💬 Agregar WhatsApp
                </button>
              )}
              {contact.phone ? (
                <a href={`tel:${contact.phone}`} style={qaBtn("#f59e0b")}>📞 Llamar</a>
              ) : (
                <button onClick={() => setShowEditForm(true)} style={{ ...qaBtn("#f59e0b"), border: "1px dashed #f59e0b55", background: "rgba(245,158,11,0.06)" }} title="Agregar teléfono para llamar">
                  📞 Agregar teléfono
                </button>
              )}
              <a
                href={contact.linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(contact.name + (contact.company ? " " + contact.company : ""))}`}
                target="_blank" rel="noopener noreferrer"
                style={qaBtn("#0a66c2")}
              >
                in LinkedIn
              </a>
            </div>
            {/* WhatsApp Business API — ready for token */}
            <button
              onClick={async () => {
                const waNum = contact.whatsappNumber || contact.phone;
                if (!waNum) { toast.error("Sin número de WhatsApp"); return; }
                try {
                  const res = await fetch("/api/whatsapp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: waNum, name: contact.name }) });
                  const d = await res.json();
                  if (d.notConfigured) toast.info("WhatsApp Business API no configurada — agrega WHATSAPP_API_TOKEN en .env");
                  else if (d.error) toast.error(d.error);
                  else toast.success("Mensaje enviado via WhatsApp API");
                } catch { toast.error("Error al contactar API"); }
              }}
              style={{ ...qaBtn("#25d366"), width: "100%", border: "1px dashed #25d36655", background: "rgba(37,211,102,0.06)" }}
            >
              🟢 WhatsApp Business API
            </button>
          </div>

          {/* Tags */}
          <TagsEditor contactId={contact.id} initial={contact.tags} />

          {/* Marketing signals editor (VA) */}
          <div style={{ padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Señales de Marketing (Scoring)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {([
                { field: "sigLinkedinAds", label: "Pauta activa en LinkedIn Ads" },
                { field: "sigDmActive", label: "Decision maker activo en LinkedIn (30d)" },
                { field: "sigMetaAds", label: "Pauta en Meta Ads" },
                { field: "sigGoogleAds", label: "Pauta en Google Ads" },
                { field: "sigMgrNoHead", label: "Marketing Manager sin Head/Director" },
                { field: "sigVacancy", label: "Vacante abierta en Marketing" },
              ] as const).map(({ field, label }) => (
                <label key={field} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, cursor: "pointer", color: "var(--foreground)" }}>
                  <input
                    type="checkbox"
                    checked={!!signals[field]}
                    onChange={e => updateSignal(field, e.target.checked)}
                    style={{ marginTop: 1, cursor: "pointer" }}
                  />
                  <span style={{ lineHeight: 1.3 }}>{label}</span>
                </label>
              ))}
              <div style={{ marginTop: 2 }}>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, marginBottom: 4 }}>Frecuencia de posts</div>
                <select
                  value={signals.sigPostFreq}
                  onChange={e => updateSignal("sigPostFreq", e.target.value)}
                  style={{ width: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", padding: "6px 10px", fontSize: 12, color: "var(--foreground)", cursor: "pointer" }}
                >
                  <option value="">Ninguna</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          {contact.notes && (
            <div style={{ padding: 10, borderRadius: 8, background: "var(--background)", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              {contact.notes}
            </div>
          )}

          {/* Custom fields */}
          <CustomFieldValues entity="contact" values={parseCustomFields(contact.customFields)} />

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

            {/* Utilities row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button
                onClick={() => {
                  const lastAct = activities.reduce<number | null>((m, a) => {
                    const ts = a.completedAt || a.createdAt;
                    if (!ts) return m;
                    const ms = ts instanceof Date ? ts.getTime() : (ts as number) < 1e10 ? (ts as number) * 1000 : (ts as number);
                    return m === null || ms > m ? ms : m;
                  }, null);
                  const days = lastAct !== null ? Math.floor((Date.now() - lastAct) / 86400000) : null;
                  const activeDeals = deals.filter(d => !d.isWon && !d.isLost);
                  const activeVal = activeDeals.reduce((s, d) => s + d.value, 0);
                  const summary = [
                    `${contact.name}${contact.title ? ` · ${contact.title}` : ""}${contact.company ? ` @ ${contact.company}` : ""}`,
                    `${contact.email || "—"} · ${contact.phone || "—"}`,
                    `Temp: ${contact.temperature.toUpperCase()} · Score: ${contact.score}`,
                    `Última actividad: ${days === null ? "ninguna" : days === 0 ? "hoy" : `hace ${days}d`}`,
                    `Deals activos: ${activeDeals.length} (${formatCurrency(activeVal)})`,
                  ].join("\n");
                  navigator.clipboard.writeText(summary).then(
                    () => toast.success("Resumen copiado"),
                    () => toast.error("No se pudo copiar")
                  );
                }}
                style={{ padding: "6px 0", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 11, cursor: "pointer" }}
              >
                📋 Copiar resumen
              </button>
              <a
                href={`/api/contacts/${contact.id}/vcard`}
                download
                style={{ padding: "6px 0", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 11, cursor: "pointer", textAlign: "center", textDecoration: "none" }}
              >
                💾 vCard
              </a>
            </div>

            <button
              onClick={() => setSendToMktOpen(true)}
              style={{ padding: "8px 0", borderRadius: 8, border: "1px solid #D19C15", background: "transparent", color: "#D19C15", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
            >
              ↩ Enviar a marketing
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
          {/* Next Best Action banner */}
          <ContactNextBestAction
            temperature={contact.temperature}
            deals={deals.map(d => ({ stageId: d.stageId, createdAt: d.createdAt }))}
            activities={activities}
            stages={stages}
            onLogActivity={() => setShowActivityForm(true)}
            onCreateDeal={() => router.push(`/pipeline`)}
          />
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
              {/* Engagement health widget */}
              {(() => {
                const now = Date.now();
                const lastAct = activities.reduce<number | null>((m, a) => {
                  const ts = a.completedAt || a.createdAt;
                  if (!ts) return m;
                  const ms = ts instanceof Date ? ts.getTime() : (ts as number) < 1e10 ? (ts as number) * 1000 : ts as number;
                  return m === null || ms > m ? ms : m;
                }, null);
                const daysSinceLast = lastAct !== null ? Math.floor((now - lastAct) / 86400000) : null;
                const activeDealVal = deals.filter(d => !d.isWon && !d.isLost).reduce((sum, d) => sum + d.value, 0);
                return <ContactEngagementCard lastActivityDays={daysSinceLast} activeDealValue={activeDealVal} temperature={contact.temperature} icpScore={contact.score} />;
              })()}
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

              {/* Marketing Context */}
              {(contact.lifecycleStage || contact.firstTouchCampaignId || contact.returnedToMarketingAt) && (
                <div style={{ padding: 16, borderRadius: 10, border: "1px solid rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.05)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#a78bfa" }}>Contexto de Marketing</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {contact.lifecycleStage && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Lifecycle Stage</div>
                        <span style={{ padding: "3px 9px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                          {contact.lifecycleStage}
                        </span>
                      </div>
                    )}
                    {contact.firstTouchCampaignId && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>1ª Campaña</div>
                        <span style={{ fontSize: 12, color: "var(--foreground)", fontFamily: "monospace" }}>{contact.firstTouchCampaignId}</span>
                      </div>
                    )}
                    {contact.lastTouchCampaignId && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Última Campaña</div>
                        <span style={{ fontSize: 12, color: "var(--foreground)", fontFamily: "monospace" }}>{contact.lastTouchCampaignId}</span>
                      </div>
                    )}
                    {contact.returnedToMarketingAt && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Devuelto a Marketing</div>
                        <div style={{ fontSize: 12, color: "#f59e0b" }}>
                          {new Date(contact.returnedToMarketingAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                          {contact.returnedToMarketingReason && <span style={{ color: "var(--muted-foreground)" }}> — {contact.returnedToMarketingReason}</span>}
                        </div>
                      </div>
                    )}
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

              {(() => {
                const timeline: TimelineItem[] = [
                  ...activities.map(a => ({ kind: "activity" as const, ...a })),
                  ...emailEvents.map(e => ({ kind: "email_event" as const, id: e.id, type: e.type, url: e.url, createdAt: e.createdAt })),
                ].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

                if (timeline.length === 0) {
                  return (
                    <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, borderRadius: 10, border: "1px dashed var(--border)" }}>
                      Sin actividades registradas
                    </div>
                  );
                }

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {timeline.map((item, i) => {
                      if (item.kind === "activity") {
                        const a = item;
                        const config = ACTIVITY_TYPE_CONFIG[a.type as ActivityType];
                        const isPending = !a.completedAt && a.scheduledAt;
                        return (
                          <div key={`act-${a.id}`} style={{ display: "flex", gap: 12, paddingBottom: 16, position: "relative" }}>
                            {i < timeline.length - 1 && (
                              <div style={{ position: "absolute", left: 17, top: 36, bottom: 0, width: 1, background: "var(--border)" }} />
                            )}
                            <div style={{
                              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                              background: "var(--card)", border: "1px solid var(--border)",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                              zIndex: 1,
                            }}>
                              {ACT_EMOJI[a.type] || "📝"}
                            </div>
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
                              {a.daptaMeetingId && a.transcriptText && (
                                <DaptaTranscript transcript={a.transcriptText} />
                              )}
                              {a.daptaMeetingId && !a.transcriptText && (
                                <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 4 }}>
                                  🎙 Grabado por Dapta · sin transcripción
                                </div>
                              )}
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{formatRelativeDate(a.createdAt)}</span>
                            </div>
                          </div>
                        );
                      } else {
                        const e = item;
                        const cfg = EMAIL_EVENT_CONFIG[e.type] ?? { icon: "✉️", label: e.type, color: "#4299e1" };
                        return (
                          <div key={`ee-${e.id}`} style={{ display: "flex", gap: 12, paddingBottom: 16, position: "relative" }}>
                            {i < timeline.length - 1 && (
                              <div style={{ position: "absolute", left: 17, top: 36, bottom: 0, width: 1, background: "var(--border)" }} />
                            )}
                            <div style={{
                              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                              background: `${cfg.color}18`, border: `1px solid ${cfg.color}40`,
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                              zIndex: 1,
                            }}>
                              {cfg.icon}
                            </div>
                            <div style={{ flex: 1, paddingTop: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                              </div>
                              {e.url && (
                                <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.4, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {e.url}
                                </p>
                              )}
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{formatRelativeDate(e.createdAt)}</span>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Related contacts tab */}
          {activeTab === "related" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {relatedContacts.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, borderRadius: 10, border: "1px dashed var(--border)" }}>
                  {contact.company ? `Sin otros contactos en ${contact.company}` : "Sin empresa asociada"}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>
                    Otros contactos en <strong style={{ color: "var(--foreground)" }}>{contact.company}</strong>
                  </div>
                  {relatedContacts.map(rc => (
                    <div
                      key={rc.id}
                      onClick={() => router.push(`/contacts/${rc.id}`)}
                      style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                      onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.06)")}
                      onMouseLeave={e => (e.currentTarget.style.filter = "")}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--primary-foreground)", flexShrink: 0 }}>
                        {rc.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{rc.name}</div>
                        {rc.title && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{rc.title}</div>}
                      </div>
                    </div>
                  ))}
                </>
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
          title: contact.title || "",
          industry: contact.industry || "",
          location: contact.location || "",
          linkedinUrl: contact.linkedinUrl || "",
          companyWebsite: contact.companyWebsite || "",
          companyLinkedin: contact.companyLinkedin || "",
          employeeCount: contact.employeeCount ?? null,
          whatsappNumber: contact.whatsappNumber || "",
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

      {/* Send to Marketing inline modal */}
      {sendToMktOpen && (
        <div
          onClick={() => !sendToMktSubmitting && setSendToMktOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, maxWidth: 480, width: "100%" }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Enviar a marketing</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>
              <strong style={{ color: "var(--foreground)" }}>{contact.name}</strong> volverá al ciclo de nurturing de marketing.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {["No es buen fit", "No está listo todavía", "Mal timing", "Necesita más educación", "Duplicado"].map(r => (
                <button
                  key={r}
                  onClick={() => setSendToMktReason(prev => prev ? `${prev}; ${r}` : r)}
                  style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)" }}
                >
                  + {r}
                </button>
              ))}
            </div>
            <textarea
              value={sendToMktReason}
              onChange={e => setSendToMktReason(e.target.value)}
              placeholder="Razón (opcional)"
              rows={3}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", marginBottom: 16, boxSizing: "border-box" as const }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setSendToMktOpen(false)}
                disabled={sendToMktSubmitting}
                style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)" }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setSendToMktSubmitting(true);
                  try {
                    const res = await fetch("/api/return-to-marketing", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ contactId: contact.id, reason: sendToMktReason || undefined }),
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      toast.error(data.error || "Error al enviar");
                    } else {
                      toast.success("Contacto enviado a marketing");
                      router.push("/contacts");
                    }
                  } catch { toast.error("Error al enviar"); }
                  finally { setSendToMktSubmitting(false); }
                }}
                disabled={sendToMktSubmitting}
                style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: "1px solid #D19C15", background: "#D19C15", color: "#0a0a0a", fontWeight: 600 }}
              >
                {sendToMktSubmitting ? "Enviando…" : "Enviar a marketing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
