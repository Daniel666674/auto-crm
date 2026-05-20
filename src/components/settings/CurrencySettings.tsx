"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Save, DollarSign, Info } from "lucide-react";
import { toast } from "sonner";
import { BSLoading } from "../ui/BSLoading";

const S = {
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, display: "block" },
  input: { width: "100%", padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--foreground)", outline: "none", boxSizing: "border-box" as const },
  btn: (variant: "primary" | "ghost" = "primary"): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 6,
    ...(variant === "primary" ? { background: "var(--primary)", color: "var(--primary-foreground)", border: "none" } : {}),
    ...(variant === "ghost" ? { background: "transparent", color: "var(--muted-foreground)", border: "none" } : {}),
  }),
};

interface FxConfig {
  rate: number;
  source: "manual" | "api";
  provider?: string;
  updatedAt: string;
}

export function CurrencySettings({ canEdit = true }: { canEdit?: boolean }) {
  const [config, setConfig] = useState<FxConfig | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/fx-rate");
      if (res.ok) {
        const d = await res.json() as FxConfig;
        setConfig(d);
        setInput(String(d.rate));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const rate = Number(input);
    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error("Ingresa una tasa válida (COP por USD)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/fx-rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate, source: "manual" }),
      });
      if (res.ok) {
        const d = await res.json() as FxConfig;
        setConfig(d);
        setInput(String(d.rate));
        toast.success(`Tasa actualizada: 1 USD = ${d.rate.toLocaleString("es-CO")} COP`);
      } else {
        const e = await res.json() as { error?: string };
        toast.error(e.error || "Error al guardar la tasa");
      }
    } catch { toast.error("Error de red"); }
    setSaving(false);
  };

  if (loading) return <BSLoading label="Cargando tasa de cambio…" />;

  const hasChanges = config ? Number(input) !== config.rate : false;
  const sample = Number(input) > 0 ? Number(input) : (config?.rate ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <DollarSign size={16} style={{ color: "#C39A4C" }} /> Tasa de cambio (USD → COP)
        </h3>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
          Los deals se negocian en USD y se registran en COP a la tasa del día. Esta tasa se usa por defecto al crear deals.
        </p>
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 200px" }}>
            <span style={S.label}>COP por 1 USD</span>
            <input
              type="number" min={1} step={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={!canEdit}
              style={S.input}
              placeholder="4000"
            />
          </div>
          {canEdit && (
            <button onClick={save} disabled={saving || !hasChanges} style={{ ...S.btn("primary"), opacity: (!hasChanges || saving) ? 0.6 : 1 }}>
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              Guardar
            </button>
          )}
        </div>

        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(195,154,76,0.06)", border: "1px solid rgba(195,154,76,0.18)" }}>
          <div style={{ fontSize: 12, color: "var(--foreground)" }}>
            Ejemplo: <strong>$10,000 USD</strong> ={" "}
            <strong style={{ color: "#C39A4C" }}>
              {(10000 * sample).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
            </strong>
          </div>
          {config && (
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
              Última actualización: {new Date(config.updatedAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })} · fuente: {config.source === "api" ? "API" : "manual"}
            </div>
          )}
        </div>

        {/* Room for a future live-rate API */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "flex-start", gap: 8, opacity: 0.7 }}>
          <Info size={13} style={{ color: "var(--muted-foreground)", marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            Próximamente: actualización automática de la tasa vía API de divisas. La configuración ya soporta una fuente <code>api</code>.
          </span>
        </div>
      </div>
    </div>
  );
}
