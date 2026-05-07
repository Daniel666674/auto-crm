"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConsentBadge } from "./ConsentBadge";
import { DataDeletionModal } from "./DataDeletionModal";
import { ContactForm } from "./ContactForm";
import { ActivityForm } from "@/components/activities/ActivityForm";
import {
  ArrowLeft, Mail, Phone, Building2, Calendar, FileText,
  Clock, Users, Pencil, Plus, MessageCircle, Copy, Check,
  Download, ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDate, formatRelativeDate, cleanPhoneForWhatsApp } from "@/lib/constants";
import { ACTIVITY_TYPE_CONFIG, SOURCE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import type { Temperature, ActivityType, LeadSource } from "@/types";

const activityIcons: Record<string, typeof Phone> = {
  call: Phone, email: Mail, meeting: Users, note: FileText, follow_up: Clock,
};

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
  const [showEditForm, setShowEditForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(contact.consentGiven ?? false);
  const [consentSource, setConsentSource] = useState(contact.consentSource ?? "unknown");
  const [savingConsent, setSavingConsent] = useState(false);

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success("Copiado");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Error al copiar");
    }
  };

  const handleExport = () => {
    window.location.href = `/api/contacts/${contact.id}/export-data`;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contacts")} aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{contact.name}</h1>
            <StatusBadge temperature={contact.temperature as Temperature} />
            <ConsentBadge consentGiven={consentGiven} />
          </div>
          <p className="text-muted-foreground">
            Score: {contact.score}/100 · {SOURCE_LABELS[contact.source as LeadSource] || contact.source}
            {contact.engagementStatus && <> · Brevo: <span className="font-medium">{contact.engagementStatus}</span></>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Exportar datos
          </Button>
          <DataDeletionModal
            contactId={contact.id}
            contactName={contact.name}
            onDeleted={() => router.push("/contacts")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline flex-1 truncate">
                  {contact.email}
                </a>
                <button onClick={() => handleCopy(contact.email!, "email")} className="p-1 rounded hover:bg-muted">
                  {copiedField === "email" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1">{contact.phone}</span>
                <div className="flex items-center gap-1">
                  <a href={`https://wa.me/${cleanPhoneForWhatsApp(contact.phone)}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-green-50" title="WhatsApp">
                    <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                  </a>
                  <a href={`tel:${contact.phone}`} className="p-1 rounded hover:bg-blue-50" title="Llamar">
                    <Phone className="h-3.5 w-3.5 text-blue-600" />
                  </a>
                  <button onClick={() => handleCopy(contact.phone!, "phone")} className="p-1 rounded hover:bg-muted">
                    {copiedField === "phone" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{contact.company}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Creado {formatDate(contact.createdAt)}</span>
            </div>
            {contact.notes && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">{contact.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deals ({deals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {deals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin deals</p>
            ) : (
              <div className="space-y-3">
                {deals.map((deal) => (
                  <div key={deal.id} className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/deals/${deal.id}`)}>
                    <p className="text-sm font-medium">{deal.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold text-primary">{formatCurrency(deal.value)}</span>
                      <Badge variant="outline" style={{ borderColor: deal.stageColor || undefined, color: deal.stageColor || undefined }}>
                        {deal.stageName}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Actividades ({activities.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowActivityForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Registrar
            </Button>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividades. Registra una llamada, email o nota.</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = activityIcons[activity.type] || FileText;
                  const config = ACTIVITY_TYPE_CONFIG[activity.type as ActivityType];
                  const isPending = !activity.completedAt && activity.scheduledAt;
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="rounded-full bg-muted p-2 h-fit shrink-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{config?.label || activity.type}</Badge>
                          {isPending && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-600 cursor-pointer" onClick={() => handleCompleteActivity(activity.id)}>
                              Completar
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mt-1">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeDate(activity.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ley 1581 — Consent card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Consentimiento — Ley 1581 de 2012
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Estado</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="consent"
                    checked={consentGiven}
                    onChange={() => setConsentGiven(true)}
                  />
                  Consentimiento dado
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="consent"
                    checked={!consentGiven}
                    onChange={() => setConsentGiven(false)}
                  />
                  Sin consentimiento
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Fuente</label>
              <select
                value={consentSource}
                onChange={(e) => setConsentSource(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                {CONSENT_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={handleSaveConsent} disabled={savingConsent}>
              {savingConsent ? "Guardando..." : "Guardar consentimiento"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
