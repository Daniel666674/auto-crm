"use client";

import { formatCurrency } from "@/lib/constants";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreVertical, RotateCcw } from "lucide-react";
import { useState } from "react";

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
  contactId?: string;
  onReturnToMarketing?: (args: { dealId: string; dealTitle: string; contactId: string; contactName: string | null }) => void;
}

export function DealCard({ id, title, value, contactName, contactTemperature, probability, stageColor, contactId, onReturnToMarketing }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        padding: 12,
        borderRadius: 8,
        background: "var(--background)",
        border: "1px solid var(--border)",
        position: "relative",
      }}
    >
      <div {...attributes} {...listeners} style={{ cursor: "grab" }}>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, lineHeight: 1.3, paddingRight: 22 }}>{title}</p>

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

      {onReturnToMarketing && contactId && (
        <div style={{ position: "absolute", top: 6, right: 6 }}>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(v => !v);
            }}
            style={{
              padding: 4, borderRadius: 4, border: "none", background: "transparent",
              color: "var(--muted-foreground)", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
            title="Acciones"
          >
            <MoreVertical style={{ width: 14, height: 14 }} />
          </button>
          {menuOpen && (
            <>
              <div
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                style={{ position: "fixed", inset: 0, zIndex: 40 }}
              />
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute", top: 28, right: 0, zIndex: 50,
                  minWidth: 200, borderRadius: 8, padding: 4,
                  background: "var(--card)", border: "1px solid var(--border)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onReturnToMarketing({ dealId: id, dealTitle: title, contactId, contactName });
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "8px 10px", borderRadius: 6, border: "none",
                    background: "transparent", color: "var(--foreground)",
                    fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <RotateCcw style={{ width: 13, height: 13 }} />
                  Devolver a marketing
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
