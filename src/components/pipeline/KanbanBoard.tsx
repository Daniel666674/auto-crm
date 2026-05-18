"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { List, LayoutGrid, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
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
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
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

  // Stuck deals: open (not won/lost) deals with updatedAt > 14 days ago
  const stuckCount = columns
    .filter(col => !col.isWon && !col.isLost)
    .flatMap(col => col.deals)
    .filter(d => {
      const updated = d.updatedAt ?? (d as { stageUpdatedAt?: Date | string | null }).stageUpdatedAt;
      if (!updated) return false;
      return Math.floor((Date.now() - new Date(updated).getTime()) / 86400000) >= 14;
    }).length;

  // All open deals for list view
  const allOpenDeals = columns.flatMap(col =>
    col.deals.map(d => ({ ...d, stageName: col.name, stageColor: col.color, isWon: col.isWon, isLost: col.isLost }))
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

      {/* Toolbar: legend + view toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "var(--muted-foreground)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><TempDot color="#ef4444" /> Caliente</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><TempDot color="#f59e0b" /> Tibio</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><TempDot color="var(--muted-foreground)" /> Frío</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["kanban", "list"] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", cursor: "pointer",
              background: viewMode === mode ? "var(--primary)" : "var(--card)",
              color: viewMode === mode ? "var(--primary-foreground)" : "var(--muted-foreground)",
              display: "flex", alignItems: "center", gap: 5, fontSize: 12,
            }}>
              {mode === "kanban" ? <LayoutGrid size={13} /> : <List size={13} />}
              {mode === "kanban" ? "Kanban" : "Lista"}
            </button>
          ))}
        </div>
      </div>

      {/* Stuck deals banner */}
      {stuckCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
          borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
          marginBottom: 12, fontSize: 13,
        }}>
          <AlertTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <span>
            <strong style={{ color: "#f59e0b" }}>{stuckCount} deal{stuckCount !== 1 ? "s" : ""}</strong>
            {" "}lleva{stuckCount !== 1 ? "n" : ""} más de 14 días sin avanzar
          </span>
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
                {["Deal", "Contacto", "Valor", "Etapa", "Prob.", "Cierre"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allOpenDeals.map((d, i) => {
                const closeDate = d.expectedClose ? new Date(d.expectedClose) : null;
                const closeDays = closeDate ? Math.ceil((closeDate.getTime() - Date.now()) / 86400000) : null;
                const closeColor = closeDays === null ? "var(--muted-foreground)" : closeDays < 0 ? "#ef4444" : closeDays <= 7 ? "#ef4444" : closeDays <= 30 ? "#f59e0b" : "#22c55e";
                return (
                  <tr key={d.id} style={{ borderBottom: i < allOpenDeals.length - 1 ? "1px solid var(--border)" : "none", background: "var(--card)" }}>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500 }}>{d.title}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--muted-foreground)" }}>{d.contactName || "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{formatCurrency(d.value)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: d.stageColor, flexShrink: 0 }} />
                        {d.stageName}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12 }}>
                      <span style={{ color: d.probability >= 70 ? "#22c55e" : d.probability >= 40 ? "#f59e0b" : "var(--muted-foreground)" }}>
                        {d.probability}%
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: closeColor }}>
                      {closeDays === null ? "—" : closeDays < 0 ? `Vencido ${Math.abs(closeDays)}d` : `${closeDays}d`}
                    </td>
                  </tr>
                );
              })}
              {allOpenDeals.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "30px", textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>Sin deals</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban view */}
      {viewMode === "kanban" && (
        <>
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
                  contactTemperature: d.contactTemperature || (d.contact?.temperature ?? null),
                  probability: d.probability,
                  stageUpdatedAt: d.updatedAt,
                  expectedClose: d.expectedClose,
                  lastActivityAt: (d as { lastActivityAt?: Date | null }).lastActivityAt ?? null,
                }))}
              />
            ))}
          </div>

          {/* Stage conversion funnel */}
          {(() => {
            const activeStages = columns.filter(c => !c.isWon && !c.isLost);
            const wonTotal = columns.filter(c => c.isWon).flatMap(c => c.deals).length;
            if (activeStages.length < 2) return null;
            const maxCount = Math.max(...activeStages.map(s => s.deals.length), 1);
            return (
              <div style={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", padding: "14px 16px", marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                  Embudo por etapa
                </div>
                <div style={{ display: "flex", gap: 0, alignItems: "flex-end" }}>
                  {activeStages.map((stage, i) => {
                    const pct = Math.max(4, (stage.deals.length / maxCount) * 100);
                    const nextStage = activeStages[i + 1];
                    const convRate = nextStage && stage.deals.length > 0
                      ? Math.round((nextStage.deals.length / stage.deals.length) * 100)
                      : null;
                    return (
                      <div key={stage.id} style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 0 }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{stage.deals.length}</div>
                          <div style={{ width: "100%", maxWidth: 80, height: Math.max(6, pct * 0.6), borderRadius: 4, background: stage.color, opacity: 0.8, transition: "height 0.4s" }} />
                          <div style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "center", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stage.name}</div>
                        </div>
                        {convRate !== null && (
                          <div style={{ fontSize: 10, color: convRate >= 50 ? "#22c55e" : convRate >= 25 ? "#f59e0b" : "#ef4444", fontWeight: 700, paddingBottom: 28, flexShrink: 0, width: 28, textAlign: "center" }}>
                            {convRate}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {wonTotal > 0 && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#22c55e" }}>{wonTotal}</div>
                      <div style={{ width: "100%", maxWidth: 80, height: Math.max(6, (wonTotal / maxCount) * 60), borderRadius: 4, background: "#22c55e", opacity: 0.8 }} />
                      <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>Ganados</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}

      <DragOverlay>
        {activeDeal ? (
          <DealCard
            id={activeDeal.id}
            title={activeDeal.title}
            value={activeDeal.value}
            stageColor="var(--primary)"
            contactName={activeDeal.contactName || (activeDeal.contact?.name ?? null)}
            contactTemperature={activeDeal.contactTemperature || (activeDeal.contact?.temperature ?? null)}
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
