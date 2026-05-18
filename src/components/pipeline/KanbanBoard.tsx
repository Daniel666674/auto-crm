"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { DealCard } from "./DealCard";
import { ReturnToMarketingModal } from "./ReturnToMarketingModal";
import { PipelineMetricsBar } from "./PipelineMetricsBar";
import { toast } from "sonner";
import type { PipelineColumn } from "@/types";

interface ContactOption { id: string; name: string; company: string | null; }

interface KanbanBoardProps {
  initialColumns: PipelineColumn[];
  contactOptions: ContactOption[];
}

interface ReturnTarget {
  dealId: string;
  dealTitle: string;
  contactId: string;
  contactName: string | null;
}

export function KanbanBoard({ initialColumns, contactOptions }: KanbanBoardProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<ReturnTarget | null>(null);
  const columnsSnapshot = useRef<PipelineColumn[]>(initialColumns);

  const handleReturnToMarketing = useCallback((args: ReturnTarget) => {
    setReturnTarget(args);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const activeDeal = activeId
    ? columns
        .flatMap((col) => col.deals)
        .find((d) => d.id === activeId)
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    columnsSnapshot.current = columns;
  }, [columns]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which columns the items are in
    const activeColumn = columns.find((col) =>
      col.deals.some((d) => d.id === activeId)
    );
    const overColumn =
      columns.find((col) => col.id === overId) ||
      columns.find((col) => col.deals.some((d) => d.id === overId));

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id)
      return;

    setColumns((prev) => {
      const activeDeal = activeColumn.deals.find((d) => d.id === activeId);
      if (!activeDeal) return prev;

      return prev.map((col) => {
        if (col.id === activeColumn.id) {
          return {
            ...col,
            deals: col.deals.filter((d) => d.id !== activeId),
          };
        }
        if (col.id === overColumn.id) {
          return {
            ...col,
            deals: [...col.deals, { ...activeDeal, stageId: col.id }],
          };
        }
        return col;
      });
    });
  }, [columns]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overColumn =
        columns.find((col) => col.id === over.id) ||
        columns.find((col) => col.deals.some((d) => d.id === over.id));

      if (!overColumn) return;

      // Update the deal's stage via API
      try {
        const res = await fetch("/api/pipeline", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dealId: activeId,
            stageId: overColumn.id,
          }),
        });
        if (!res.ok) {
          throw new Error("API error");
        }
      } catch {
        // Rollback to pre-drag state
        setColumns(columnsSnapshot.current);
        toast.error("Error al mover el deal. Se revirtio el cambio.");
      }
    },
    [columns]
  );

  const TempDot = ({ color }: { color: string }) => (
    <div style={{ width: 6, height: 6, borderRadius: 3, background: color, display: "inline-block" }} />
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Metrics bar */}
      <PipelineMetricsBar columns={columns} />

      {/* Temperature legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><TempDot color="#ef4444" /> Caliente</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><TempDot color="#f59e0b" /> Tibio</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><TempDot color="var(--muted-foreground)" /> Frío</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            name={column.name}
            color={column.color}
            contactOptions={contactOptions}
            onCreated={() => router.refresh()}
            onReturnToMarketing={handleReturnToMarketing}
            deals={column.deals.map((d) => ({
              id: d.id,
              title: d.title,
              value: d.value,
              contactId: d.contactId,
              contactName: d.contactName || (d.contact?.name ?? null),
              contactTemperature:
                d.contactTemperature ||
                (d.contact?.temperature ?? null),
              probability: d.probability,
              stageUpdatedAt: d.updatedAt,
              expectedClose: d.expectedClose,
            }))}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <DealCard
            id={activeDeal.id}
            title={activeDeal.title}
            value={activeDeal.value}
            stageColor="var(--primary)"
            contactName={
              activeDeal.contactName ||
              (activeDeal.contact?.name ?? null)
            }
            contactTemperature={
              activeDeal.contactTemperature ||
              (activeDeal.contact?.temperature ?? null)
            }
            probability={activeDeal.probability}
          />
        ) : null}
      </DragOverlay>

      <ReturnToMarketingModal
        open={!!returnTarget}
        onClose={() => setReturnTarget(null)}
        onDone={() => router.refresh()}
        contactId={returnTarget?.contactId ?? ""}
        contactName={returnTarget?.contactName ?? undefined}
        dealId={returnTarget?.dealId}
        dealTitle={returnTarget?.dealTitle}
      />
    </DndContext>
  );
}
