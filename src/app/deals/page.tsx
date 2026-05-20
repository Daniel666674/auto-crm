"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus, Briefcase, Download, Trash2, ArrowRightLeft } from "lucide-react";
import { formatCurrency, formatUSD, formatDate } from "@/lib/constants";
import { DealForm } from "@/components/deals/DealForm";
import { toast } from "sonner";

interface DealRow {
  id: string;
  title: string;
  value: number;
  usdValue: number | null;
  fxRate: number | null;
  probability: number;
  contactName: string | null;
  stageId: string;
  stageName: string | null;
  stageColor: string | null;
  expectedClose: number | Date | null;
  createdAt: number | Date;
}

interface StageOption {
  id: string;
  name: string;
  color: string | null;
}

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [moveTo, setMoveTo] = useState("");

  const loadDeals = () => {
    fetch("/api/deals")
      .then((res) => res.json())
      .then((data) => {
        setDeals(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDeals();
  }, [showForm]);

  useEffect(() => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((d: Array<{ id: string; name: string; color: string | null }>) =>
        setStages(Array.isArray(d) ? d.map((s) => ({ id: s.id, name: s.name, color: s.color })) : [])
      )
      .catch(() => {});
  }, []);

  const allSelected = deals.length > 0 && deals.every((d) => selected.has(d.id));

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(e: React.MouseEvent) {
    e.stopPropagation();
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(deals.map((d) => d.id)));
  }

  async function bulkMove(stageId: string) {
    if (!selected.size || bulkLoading || !stageId) return;
    setBulkLoading(true);
    await Promise.all(
      [...selected].map((id) =>
        fetch(`/api/deals/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stageId }),
        })
      )
    );
    const stageName = stages.find((s) => s.id === stageId)?.name ?? "etapa";
    setBulkLoading(false);
    setSelected(new Set());
    setMoveTo("");
    toast.success(`${selected.size} deal(s) movidos a ${stageName}`);
    loadDeals();
  }

  async function bulkDelete() {
    if (!selected.size || bulkLoading) return;
    if (!confirm(`¿Eliminar ${selected.size} deal(s)? Esta acción no se puede deshacer.`)) return;
    setBulkLoading(true);
    await Promise.all([...selected].map((id) => fetch(`/api/deals/${id}`, { method: "DELETE" })));
    setBulkLoading(false);
    setSelected(new Set());
    toast.success("Deals eliminados");
    loadDeals();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground">
            Oportunidades de venta activas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open("/api/export?type=deals")}
            className="cursor-pointer"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setShowForm(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Deal
          </Button>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "var(--card)", border: "1px solid var(--primary)", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", marginRight: 4 }}>
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted-foreground)" }}>
            <ArrowRightLeft size={12} /> Mover a:
          </div>
          <select
            value={moveTo}
            onChange={(e) => { setMoveTo(e.target.value); bulkMove(e.target.value); }}
            disabled={bulkLoading}
            style={{ padding: "4px 8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 11, cursor: bulkLoading ? "not-allowed" : "pointer" }}
          >
            <option value="">Elegir etapa…</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <button disabled={bulkLoading}
            onClick={bulkDelete}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", cursor: bulkLoading ? "not-allowed" : "pointer", opacity: bulkLoading ? 0.5 : 1 }}>
            <Trash2 size={12} /> {bulkLoading ? "Procesando..." : "Eliminar"}
          </button>
          <button onClick={() => setSelected(new Set())}
            style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer" }}>
            Deseleccionar
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No hay deals"
          description="Crea tu primer deal para comenzar a gestionar tu pipeline."
          actionLabel="Crear deal"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-9">
                  <input type="checkbox" checked={allSelected} onChange={() => {}} onClick={toggleAll}
                    style={{ cursor: "pointer", accentColor: "var(--primary)" }} />
                </TableHead>
                <TableHead>Titulo</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="hidden md:table-cell">Probabilidad</TableHead>
                <TableHead className="hidden lg:table-cell">Cierre est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => {
                const isSelected = selected.has(deal.id);
                return (
                <TableRow
                  key={deal.id}
                  className="cursor-pointer hover:bg-muted/50"
                  data-state={isSelected ? "selected" : undefined}
                  onClick={() => router.push(`/deals/${deal.id}`)}
                >
                  <TableCell onClick={(e) => toggleSelect(deal.id, e)}>
                    <input type="checkbox" checked={isSelected} onChange={() => {}}
                      style={{ cursor: "pointer", accentColor: "var(--primary)" }} />
                  </TableCell>
                  <TableCell className="font-medium">{deal.title}</TableCell>
                  <TableCell>{deal.contactName || "-"}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {formatCurrency(deal.value)}
                    {deal.usdValue ? (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {formatUSD(deal.usdValue)} USD
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: deal.stageColor || undefined,
                        color: deal.stageColor || undefined,
                      }}
                    >
                      {deal.stageName}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {deal.probability}%
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(deal.expectedClose)}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DealForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
