"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";

interface LineItem {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number; // COP cents
  order: number;
}

const inp: React.CSSProperties = {
  padding: "7px 10px", background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, color: "var(--foreground)", outline: "none", boxSizing: "border-box",
};

export function DealLineItems({ dealId, dealValue }: { dealId: string; dealValue: number }) {
  const router = useRouter();
  const [items, setItems] = useState<LineItem[]>([]);
  const [label, setLabel] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/line-items`);
      if (res.ok) setItems(await res.json());
    } catch { /* ignore */ }
  }, [dealId]);

  useEffect(() => { load(); }, [load]);

  const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  const add = async () => {
    if (!label.trim()) { toast.error("Describe el producto o servicio"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          quantity: parseInt(qty || "1"),
          unitPrice: Math.round(parseFloat(price || "0") * 100),
        }),
      });
      if (res.ok) {
        setLabel(""); setQty("1"); setPrice("");
        await load();
      } else {
        toast.error("Error al agregar línea");
      }
    } catch { toast.error("Error de red"); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    await fetch(`/api/deals/${dealId}/line-items?lineId=${id}`, { method: "DELETE" });
    await load();
  };

  const applyTotal = async () => {
    await fetch(`/api/deals/${dealId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: total }),
    });
    toast.success("Valor del deal actualizado con la suma de líneas");
    router.refresh();
  };

  const matchesValue = total === dealValue;

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Productos / Servicios</h3>
        {items.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Suma de líneas: <strong style={{ color: "var(--foreground)" }}>{formatCurrency(total)}</strong>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "var(--background)", fontSize: 13 }}>
              <span>{it.label}</span>
              <span style={{ color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>{it.quantity} ×</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(it.quantity * it.unitPrice)}</span>
              <button onClick={() => remove(it.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2, display: "inline-flex" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 130px auto", gap: 8, alignItems: "center" }}>
        <input style={inp} placeholder="Ej: Growth — Ads + SDR" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input style={{ ...inp, textAlign: "center" }} type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        <input style={inp} type="number" step="0.01" placeholder="Precio COP" value={price} onChange={(e) => setPrice(e.target.value)} />
        <button onClick={add} disabled={saving}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
          <Plus size={14} /> Agregar
        </button>
      </div>

      {items.length > 0 && !matchesValue && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(195,154,76,0.07)", border: "1px solid rgba(195,154,76,0.25)", fontSize: 12, flexWrap: "wrap" }}>
          <span style={{ color: "var(--muted-foreground)" }}>
            El valor del deal ({formatCurrency(dealValue)}) no coincide con la suma de líneas.
          </span>
          <button onClick={applyTotal}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid #C39A4C", background: "transparent", color: "#C39A4C", cursor: "pointer" }}>
            <Check size={13} /> Usar suma como valor
          </button>
        </div>
      )}
    </div>
  );
}
