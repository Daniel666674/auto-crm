"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DealCard } from "./DealCard";
import { QuickAddDeal } from "./QuickAddDeal";
import { formatCurrency } from "@/lib/constants";

interface Deal {
  id: string;
  title: string;
  value: number;
  contactName: string | null;
  contactTemperature: string | null;
  probability: number;
  contactId?: string;
  stageUpdatedAt?: Date | string | null;
  expectedClose?: Date | string | null;
  lastActivityAt?: Date | string | null;
}

interface ContactOption { id: string; name: string; company: string | null; }

interface KanbanColumnProps {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
  contactOptions: ContactOption[];
  onCreated: () => void;
  onReturnToMarketing?: (args: { dealId: string; dealTitle: string; contactId: string; contactName: string | null }) => void;
}

export function KanbanColumn({ id, name, color, deals, contactOptions, onCreated, onReturnToMarketing }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = deals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: 260, width: 260, flexShrink: 0,
        display: "flex", flexDirection: "column",
        borderRadius: 12,
        background: isOver ? "rgba(209,156,21,0.04)" : "var(--card)",
        border: `1px solid ${isOver ? "var(--primary)" : "var(--border)"}`,
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)",
            background: "var(--background)", padding: "1px 6px", borderRadius: 10,
          }}>{deals.length}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{formatCurrency(totalValue)}</span>
            {weightedValue > 0 && weightedValue !== totalValue && (
              <span style={{ fontSize: 10, color: "var(--primary)" }} title="Valor ponderado por probabilidad">
                ≈ {formatCurrency(Math.round(weightedValue))}
              </span>
            )}
          </div>
          <QuickAddDeal stageId={id} contacts={contactOptions} onCreated={onCreated} />
        </div>
      </div>

      {/* Cards */}
      <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 6, minHeight: 100, overflowY: "auto" }}>
          {deals.map(deal => (
            <DealCard key={deal.id} {...deal} stageColor={color} lastActivityAt={deal.lastActivityAt} onReturnToMarketing={onReturnToMarketing} />
          ))}
          {deals.length === 0 && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--muted-foreground)", opacity: 0.5, minHeight: 80 }}>
              Arrastra aquí
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
