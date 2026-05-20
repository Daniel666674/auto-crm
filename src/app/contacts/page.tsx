"use client";

import { useState, useEffect } from "react";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { ContactForm } from "@/components/contacts/ContactForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadContacts = () => {
    fetch("/api/contacts")
      .then((res) => res.json())
      .then((data) => {
        setContacts(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleCloseForm = () => {
    setShowForm(false);
    loadContacts();
  };

  const bulkSendToMarketing = async (ids: string[], clear: () => void) => {
    if (!ids.length) return;
    if (!confirm(`¿Enviar ${ids.length} contacto(s) a marketing? Saldrán del pipeline de ventas.`)) return;
    const reason = prompt("Motivo (opcional) — se registrará en cada contacto:") ?? undefined;
    const results = await Promise.all(
      ids.map((contactId) =>
        fetch("/api/return-to-marketing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId, reason }),
        }).then((r) => r.ok)
      )
    );
    const ok = results.filter(Boolean).length;
    const failed = results.length - ok;
    if (ok) toast.success(`${ok} contacto(s) enviados a marketing`);
    if (failed) toast.error(`${failed} no se pudieron enviar (sin email u otro motivo)`);
    clear();
    loadContacts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contactos</h1>
          <p className="text-muted-foreground">
            Gestiona tus leads y prospectos
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Contacto
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <ContactsTable
          contacts={contacts}
          onRefresh={loadContacts}
          renderBulkActions={(ids, clear) => (
            <button
              disabled={!ids.length}
              onClick={() => bulkSendToMarketing(ids, clear)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid #D19C15", background: "transparent", color: "#D19C15", cursor: "pointer" }}
            >
              ↩ Enviar a marketing
            </button>
          )}
        />
      )}

      <ContactForm open={showForm} onClose={handleCloseForm} />
    </div>
  );
}
