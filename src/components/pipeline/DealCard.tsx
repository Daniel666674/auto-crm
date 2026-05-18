"use client";

import { formatCurrency } from "@/lib/constants";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreVertical, RotateCcw, Clock, Calendar } from "lucide-react";
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
  stageUpdatedAt?: Date | string | null;
  expectedClose?: Date | string | null;
  onReturnToMarketing?: (args: { dealId: string; dealTitle: string; contactId: string; contactName: string | null }) => void;
}

function daysSince(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

function daysUntil(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

function ageBadge(days: number): { bg: string; color: string; label: string } {
  if (days >= 14) return { bg: "rgba(239,68,68,0.15)",  color: "#ef4444", label: `${days}d` };
  if (days >= 7)  return { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: `${days}d` };
  return { bg: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)", label: `${days}d` };
}

function closeBadge(days: number): { bg: string; color: string; label: string } {
  if (days < 0)   return { bg: "rgba(239,68,68,0.18)",  color: "#ef4444", label: `Vencido ${Math.abs(days)}d` };
  if (days <= 7)  return { bg: "rgba(239,68,68,0.12)",  color: "#ef4444", label: `${days}d` };
  if (days <= 30) return { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: `${days}d` };
  return { bg: "rgba(34,197,94,0.10)", color: "#22c55e", label: `${days}d` };
}

export function DealCard({ id, title, value, contactName, contactTemperature, probability, stageColor, contactId, stageUpdatedAt, expectedClose, onReturnToMarketing }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [menuOpen, setMenuOpen] = useState(false);

  const ageDays   = daysSince(stageUpdatedAt);
  const closeDays = daysUntil(expectedClose);
  const age   = ageDays !== null ? ageBadge(ageDays) : null;
  const close = closeDays !== null ? closeBadge(closeDays) : null;

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
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{contactName || "—"}</span>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{probability}%</span>
        </div>

        <div style={{ height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden", marginBottom: 6 }}>
          <div style={{ width: `${probability}%`, height: "100%", borderRadius: 2, background: stageColor, transition: "width 0.3s" }} />
        </div>

        {(age || close) && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
            {age && (
              <span title="Días en esta etapa" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: age.bg, color: age.color }}>
                <Clock size={9} />
                {age.label}
              </span>
            )}
            {close && (
              <span title="Días hasta cierre esperado" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: close.bg, color: close.color }}>
                <Calendar size={9} />
                {close.label}
              </span>
            )}
          </div>
        )}
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
