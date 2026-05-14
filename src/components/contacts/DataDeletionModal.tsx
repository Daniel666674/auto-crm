"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DataDeletionModalProps {
  contactId: string;
  contactName: string;
  onDeleted: () => void;
}

export function DataDeletionModal({ contactId, contactName, onDeleted }: DataDeletionModalProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [registerId, setRegisterId] = useState<string | null>(null);

  const canConfirm = confirmText.trim().toLowerCase() === contactName.trim().toLowerCase();

  const handleDelete = async () => {
    if (!canConfirm) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/delete-gdpr`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al eliminar");
        return;
      }
      setRegisterId(data.registerId);
      toast.success(`Datos eliminados. ID de registro: ${data.registerId}`);
      setTimeout(() => {
        setOpen(false);
        onDeleted();
      }, 3000);
    } catch {
      toast.error("Error de red al eliminar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => { setOpen(true); setConfirmText(""); setReason(""); setRegisterId(null); }}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Eliminar datos
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Eliminar datos — Ley 1581
            </DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Se eliminarán todos los datos personales, actividades
              y deals asociados a este contacto.
            </DialogDescription>
          </DialogHeader>

          {registerId ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              Datos eliminados correctamente.<br />
              <strong>ID de registro: {registerId}</strong>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Motivo de eliminación (opcional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Solicitud del titular de datos"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Para confirmar, escribe el nombre completo:{" "}
                  <span className="font-bold text-foreground">{contactName}</span>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Nombre completo del contacto"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-destructive"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!canConfirm || loading}
                >
                  {loading ? "Eliminando..." : "Eliminar permanentemente"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
