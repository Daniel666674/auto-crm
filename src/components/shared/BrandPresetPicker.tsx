"use client";

import { BRAND_PRESETS, BRAND_PRESET_ORDER } from "@/lib/brand-presets";

interface BrandPresetPickerProps {
  value: string;
  onChange: (id: string) => void;
  /** Compact mode shrinks card padding & label sizes for sidebar/dense layouts. */
  compact?: boolean;
}

export function BrandPresetPicker({ value, onChange, compact = false }: BrandPresetPickerProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: compact ? 8 : 12,
      }}
    >
      {BRAND_PRESET_ORDER.map(id => {
        const p = BRAND_PRESETS[id];
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={selected}
            style={{
              textAlign: "left",
              padding: compact ? 10 : 14,
              borderRadius: 10,
              cursor: "pointer",
              border: `2px solid ${selected ? p.accent : "transparent"}`,
              background: p.surface,
              color: p.text,
              outline: "none",
              transition: "transform 0.12s ease, border-color 0.12s ease",
              transform: selected ? "translateY(-1px)" : "none",
              boxShadow: selected ? `0 6px 22px -10px ${p.accent}` : "none",
              display: "flex",
              flexDirection: "column",
              gap: compact ? 6 : 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: compact ? 12 : 13, letterSpacing: "-0.01em" }}>
                {p.label}
              </span>
              <div style={{ display: "flex", gap: 3 }}>
                <span style={{ width: 12, height: 12, borderRadius: 6, background: p.accent }} />
                <span style={{ width: 12, height: 12, borderRadius: 6, background: p.accentSecondary }} />
              </div>
            </div>
            {!compact && (
              <span style={{ fontSize: 11, lineHeight: 1.4, color: p.textMuted }}>
                {p.description}
              </span>
            )}
            <div
              style={{
                marginTop: compact ? 2 : 4,
                display: "grid",
                gridTemplateColumns: "20px 1fr",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                color: p.textMuted,
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: 3, background: p.bg, border: `1px solid ${p.border}` }} />
              <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{p.mode === "dark" ? "Oscuro" : "Claro"}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
