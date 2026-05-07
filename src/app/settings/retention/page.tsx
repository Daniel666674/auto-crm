"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDate } from "@/lib/constants";

interface RetentionContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  updatedAt: number | string;
}

export default function RetentionPage() {
  const [contacts, setContacts] = useState<RetentionContact[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/retention")
      .then((r) => r.json())
      .then((d) => { setContacts(d.contacts ?? []); setCount(d.count ?? 0); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handle = async (contactId: string, action: "conservar" | "eliminar") => {
    setProcessing(contactId);
    try {
      const res = await fetch("/api/retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "conservar" ? "Contacto conservado por 1 año más" : "Contacto eliminado");
      load();
    } catch {
      toast.error("Error al procesar la acción");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="w-6 h-6" /> Retención de Datos
        </h1>
        <p className="text-muted-foreground">
          Contactos sin actividad en 2+ años que requieren revisión — Ley 1581 de 2012
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>{count} contacto{count !== 1 ? "s" : ""}</strong> sin actividad en más de 2 años.
        Revisa cada uno y decide si conservar o eliminar sus datos.
        La eliminación es definitiva e irreversible.
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
          No hay contactos pendientes de revisión.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Última actividad</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acción</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.company ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(typeof c.updatedAt === "number" ? new Date(c.updatedAt * 1000) : new Date(c.updatedAt))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processing === c.id}
                        onClick={() => handle(c.id, "conservar")}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Conservar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={processing === c.id}
                        onClick={() => handle(c.id, "eliminar")}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
