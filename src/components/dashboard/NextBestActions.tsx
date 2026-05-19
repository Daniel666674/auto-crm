"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import type { NBAItem } from "@/lib/nba-engine";

const URGENCY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#D19C15",
  low: "var(--muted-foreground)",
};
const URGENCY_LABEL: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};
const URGENCY_BG: Record<string, string> = {
  high: "rgba(239,68,68,0.12)",
  medium: "rgba(209,156,21,0.12)",
  low: "rgba(255,255,255,0.06)",
};

export function NextBestActions() {
  const router = useRouter();
  const [actions, setActions] = useState<NBAItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/nba?limit=8")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setActions(d.actions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid var(--border)",
      background: "var(--card)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Próximas Acciones</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>
            Prioridad calculada automáticamente
          </div>
        </div>
        {!loading && actions.length > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            background: "rgba(239,68,68,0.12)", color: "#ef4444",
          }}>
            {actions.filter(a => a.urgency === "high").length} urgentes
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="bs-skeleton" style={{ height: 56, borderRadius: 8 }} />
          ))}
        </div>
      ) : actions.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>
          Sin acciones pendientes — todo al día
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {actions.map((item, i) => (
            <button
              key={item.contactId}
              onClick={() => router.push(`/contacts/${item.contactId}`)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "12px 18px",
                borderBottom: i < actions.length - 1 ? "1px solid var(--border)" : "none",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              {/* Urgency indicator */}
              <div style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                background: URGENCY_COLOR[item.urgency],
                boxShadow: `0 0 6px ${URGENCY_COLOR[item.urgency]}66`,
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.contactName}
                  </span>
                  {item.company && (
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      · {item.company}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: URGENCY_COLOR[item.urgency], marginBottom: 2 }}>
                  {item.action}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{item.reason}</div>
              </div>

              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                  background: URGENCY_BG[item.urgency],
                  color: URGENCY_COLOR[item.urgency],
                }}>
                  {URGENCY_LABEL[item.urgency]}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                  Score {item.score}
                </span>
                {item.openDealValue > 0 && (
                  <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>
                    {formatCurrency(item.openDealValue)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
