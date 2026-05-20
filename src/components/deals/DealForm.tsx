"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CustomFieldInputs } from "@/components/shared/CustomFields";

const dealSchema = z.object({
  title: z.string().min(1, "El titulo es requerido"),
  usd: z.string(),
  fxRate: z.string(),
  value: z.string(),
  contactId: z.string().min(1, "El contacto es requerido"),
  stageId: z.string(),
  probability: z.string(),
  expectedClose: z.string(),
  notes: z.string(),
  competitor: z.string(),
  isRecurring: z.boolean(),
  recurringInterval: z.string(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  open: boolean;
  onClose: () => void;
}

export function DealForm({ open, onClose }: DealFormProps) {
  const router = useRouter();
  const [contactsList, setContacts] = useState<Array<{ id: string; name: string }>>([]);
  const [stagesList, setStages] = useState<Array<{ id: string; name: string }>>([]);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: "",
      usd: "",
      fxRate: "",
      value: "",
      contactId: "",
      stageId: "",
      probability: "50",
      expectedClose: "",
      notes: "",
      competitor: "",
      isRecurring: false,
      recurringInterval: "monthly",
    },
  });

  useEffect(() => {
    if (open) {
      setCustomFields({});
      fetch("/api/contacts").then((r) => r.json()).then(setContacts);
      fetch("/api/pipeline").then((r) => r.json()).then(setStages);
      // Prefill the negotiation FX rate from settings
      fetch("/api/settings/fx-rate")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.rate) setValue("fxRate", String(d.rate)); })
        .catch(() => {});
    }
  }, [open, setValue]);

  // Auto-compute COP value from USD × rate whenever either changes.
  const usdWatch = watch("usd");
  const fxWatch = watch("fxRate");
  useEffect(() => {
    const usd = parseFloat(usdWatch || "0");
    const rate = parseFloat(fxWatch || "0");
    if (usd > 0 && rate > 0) {
      setValue("value", String(Math.round(usd * rate)));
    }
  }, [usdWatch, fxWatch, setValue]);

  const onSubmit = async (data: DealFormData) => {
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          value: Math.round(parseFloat(data.value || "0") * 100),
          usdValue: parseFloat(data.usd || "0") > 0 ? Math.round(parseFloat(data.usd) * 100) : null,
          fxRate: parseFloat(data.fxRate || "0") > 0 ? parseFloat(data.fxRate) : null,
          probability: parseInt(data.probability || "0"),
          competitor: data.competitor || null,
          isRecurring: data.isRecurring,
          recurringInterval: data.isRecurring ? data.recurringInterval : null,
          customFields: Object.keys(customFields).length > 0 ? customFields : null,
        }),
      });

      if (!res.ok) throw new Error("Error al crear deal");

      toast.success("Deal creado exitosamente");
      reset();
      onClose();
      router.refresh();
    } catch {
      toast.error("Error al crear el deal");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deal-title">Titulo *</Label>
            <Input id="deal-title" {...register("title")} placeholder="Ej: Servicio Premium - Empresa X" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="deal-usd">Valor en USD</Label>
              <Input
                id="deal-usd"
                type="number"
                step="0.01"
                {...register("usd")}
                placeholder="10000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-fx">Tasa (COP por USD)</Label>
              <Input
                id="deal-fx"
                type="number"
                step="1"
                {...register("fxRate")}
                placeholder="4000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="deal-value">Valor (COP)</Label>
              <Input
                id="deal-value"
                type="number"
                step="1"
                {...register("value")}
                placeholder="0"
              />
              {parseFloat(usdWatch || "0") > 0 && parseFloat(fxWatch || "0") > 0 && (
                <p className="text-xs text-muted-foreground">
                  ${parseFloat(usdWatch).toLocaleString("en-US")} USD × {parseFloat(fxWatch).toLocaleString("es-CO")} = calculado automáticamente
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Probabilidad (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                {...register("probability")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contacto *</Label>
            <Select
              value={watch("contactId")}
              onValueChange={(v) => v && setValue("contactId", v)}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Seleccionar contacto" />
              </SelectTrigger>
              <SelectContent>
                {contactsList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.contactId && (
              <p className="text-xs text-destructive">{errors.contactId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select
                value={watch("stageId")}
                onValueChange={(v) => v && setValue("stageId", v)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Primera etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stagesList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cierre estimado</Label>
              <Input type="date" {...register("expectedClose")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-notes">Notas</Label>
            <Textarea id="deal-notes" {...register("notes")} rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-competitor">Competidor principal</Label>
            <Input id="deal-competitor" {...register("competitor")} placeholder="ej. HubSpot, Salesforce…" />
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="deal-recurring" {...register("isRecurring")}
              style={{ cursor: "pointer", accentColor: "var(--primary)", width: 16, height: 16 }} />
            <Label htmlFor="deal-recurring" style={{ cursor: "pointer", marginBottom: 0 }}>Deal recurrente (MRR/ARR)</Label>
            {watch("isRecurring") && (
              <Select value={watch("recurringInterval")} onValueChange={v => v && setValue("recurringInterval", v)}>
                <SelectTrigger className="cursor-pointer" style={{ width: 130, height: 32, fontSize: 12 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <CustomFieldInputs entity="deal" values={customFields} onChange={setCustomFields} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? "Creando..." : "Crear Deal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
