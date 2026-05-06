"use client";

import { formatCurrency } from "@/lib/constants";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TEMP_COLOR: Record<string, string> = {
  hot: "#ef4444",
  warm: "#f59e0b",
  cold: "var(--muted-foreground)",
};

interface DealCardProps {
  id: string;
  title: string;
  value: number;
  contactName: string | null;
  contactTemperature: string | null;
  probability: number;
  stageColor: string;
}

export function DealCard({ id, title, value, contactName, contactTemperature, probability, stageColor }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        padding: 12,
        borderRadius: 8,
        background: "var(--background)",
        border: "1px solid var(--border)",
        cursor: "grab",
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>{title}</p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{formatCurrency(value)}</span>
        <div style={{
          width: 6, height: 6, borderRadius: 3,
          background: TEMP_COLOR[contactTemperature ?? "cold"] ?? TEMP_COLOR.cold,
        }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{contactName || "—"}</span>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{probability}%</span>
      </div>

      <div style={{ height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${probability}%`, height: "100%", borderRadius: 2, background: stageColor, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}
