"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Pencil, X, Check, Loader2 } from "lucide-react";

const GOLD = "#D19C15";
const GOLD_TEXT = "#0a0a09";

interface Package {
  id: string;
  label: string;
  priceUSD: number;
  description: string;
}

interface ScopeItem {
  id: string;
  label: string;
  price: number;
}

interface PricingConfig {
  packages: Package[];
  scopeItems: ScopeItem[];
  usdToCop: number;
}

const PAYMENT_TERMS = [
  { id: "mensual", label: "Mensual", multiplier: 1.0, suffix: "/mes" },
  { id: "trimestral", label: "Trimestral (-5%)", multiplier: 0.95, suffix: "/trimestre" },
  { id: "anticipado", label: "Anticipado anual (-15%)", multiplier: 0.85, suffix: "/año" },
];

function fmtCOP(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

// ── Edit prices modal ─────────────────────────────────────────────────────────

interface EditPricingModalProps {
  config: PricingConfig;
  onClose: () => void;
  onSave: (c: PricingConfig) => void;
}

function EditPricingModal({ config, onClose, onSave }: EditPricingModalProps) {
  const [draft, setDraft] = useState<PricingConfig>(JSON.parse(JSON.stringify(config)));
  const [saving, setSaving] = useState(false);

  const setPackagePrice = (id: string, priceUSD: number) => {
    setDraft(d => ({ ...d, packages: d.packages.map(p => p.id === id ? { ...p, priceUSD } : p) }));
  };
  const setScopePrice = (id: string, price: number) => {
    setDraft(d => ({ ...d, scopeItems: d.scopeItems.map(s => s.id === id ? { ...s, price } : s) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/pricing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      if (!res.ok) throw new Error();
      onSave(draft);
      toast.success("Precios guardados");
      onClose();
    } catch {
      toast.error("Error al guardar precios");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[540px] max-h-[85vh] overflow-y-auto rounded-2xl border p-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-base font-bold">Editar precios base</div>
          <button onClick={onClose} className="p-1 rounded" style={{ color: "var(--muted-foreground)", cursor: "pointer", background: "transparent", border: "none" }}>
            <X size={16} />
          </button>
        </div>

        {/* USD/COP rate — synced with global FX setting */}
        <div className="mb-5">
          <label className="block text-xs mb-1.5 font-semibold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
            TRM USD → COP
          </label>
          <input
            type="number"
            value={draft.usdToCop}
            disabled
            className="w-40 px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--muted-foreground)", opacity: 0.7 }}
          />
          <p className="text-xs mt-1.5" style={{ color: "var(--muted-foreground)" }}>
            Sincronizado con <a href="/settings" style={{ color: "#C39A4C" }}>Ajustes → Negocio</a> (tasa global del día).
          </p>
        </div>

        {/* Packages */}
        <div className="mb-5">
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted-foreground)" }}>
            Paquetes base (USD)
          </div>
          <div className="flex flex-col gap-2">
            {draft.packages.map(pkg => (
              <div key={pkg.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{pkg.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{pkg.description}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>$</span>
                  <input
                    type="number"
                    value={pkg.priceUSD}
                    onChange={e => setPackagePrice(pkg.id, +e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg text-sm font-bold text-right"
                    style={{ background: "var(--background)", border: `1px solid ${GOLD}50`, color: GOLD }}
                  />
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>USD</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scope items */}
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted-foreground)" }}>
            Alcance adicional (COP)
          </div>
          <div className="flex flex-col gap-2">
            {draft.scopeItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="flex-1 text-sm">{item.label}</div>
                <input
                  type="number"
                  value={item.price}
                  onChange={e => setScopePrice(item.id, +e.target.value)}
                  className="w-32 px-2 py-1 rounded-lg text-sm font-bold text-right"
                  style={{ background: "var(--background)", border: `1px solid ${GOLD}50`, color: GOLD }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm"
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted-foreground)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: GOLD, color: GOLD_TEXT, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calculator ────────────────────────────────────────────────────────────────

export function CalculatorTool() {
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as { role?: string })?.role === "superadmin";

  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const [pkg, setPkg] = useState("growth");
  const [scopeSel, setScopeSel] = useState<string[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentTerm, setPaymentTerm] = useState("mensual");
  const [customBase, setCustomBase] = useState("");

  useEffect(() => {
    fetch("/api/pricing")
      .then(r => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={24} style={{ color: GOLD }} />
      </div>
    );
  }

  const selectedPkg = config.packages.find(p => p.id === pkg) ?? config.packages[0];
  const term = PAYMENT_TERMS.find(t => t.id === paymentTerm) ?? PAYMENT_TERMS[0];

  const baseCOP = (customBase ? parseInt(customBase.replace(/\D/g, "")) : 0) || Math.round(selectedPkg.priceUSD * config.usdToCop);
  const scopeTotal = scopeSel.reduce((s, id) => s + (config.scopeItems.find(i => i.id === id)?.price ?? 0), 0);
  const subtotal = baseCOP + scopeTotal;
  const discountAmt = Math.round(subtotal * (discount / 100));
  const afterDiscount = subtotal - discountAmt;
  const final = Math.round(afterDiscount * term.multiplier);
  const margin = subtotal > 0 ? Math.round((final / subtotal) * 100) : 0;

  const toggleScope = (id: string) =>
    setScopeSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const marginColor = margin >= 70 ? "#22c55e" : margin >= 50 ? "#f59e0b" : "#ef4444";
  const marginBg = margin >= 70 ? "rgba(34,197,94,0.08)" : margin >= 50 ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)";
  const marginBorder = margin >= 70 ? "rgba(34,197,94,0.15)" : margin >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";

  const copyResumen = () => {
    const txt = `Propuesta BlackScale\n\nPaquete: ${selectedPkg.label}\nPrecio: ${fmtCOP(final)}${term.suffix}\nDescuento: ${discount}%\nPago: ${term.label}`;
    navigator.clipboard?.writeText(txt).catch(() => {});
    toast.success("Resumen copiado al portapapeles");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calculadora de Precios</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Calcula el precio final con descuentos y términos de pago
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border"
            style={{ background: "transparent", borderColor: `${GOLD}50`, color: GOLD, cursor: "pointer" }}
          >
            <Pencil size={13} />
            Editar precios
          </button>
        )}
      </div>

      {showEdit && (
        <EditPricingModal
          config={config}
          onClose={() => setShowEdit(false)}
          onSave={setConfig}
        />
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 320px" }}>
        {/* Left: inputs */}
        <div className="flex flex-col gap-4">

          {/* Package selector */}
          <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="text-sm font-bold mb-3">Paquete base</div>
            <div className="flex flex-col gap-2">
              {config.packages.map(p => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-150 cursor-pointer"
                  style={{
                    border: `1px solid ${pkg === p.id ? GOLD : "var(--border)"}`,
                    background: pkg === p.id ? `${GOLD}0A` : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="pkg"
                    value={p.id}
                    checked={pkg === p.id}
                    onChange={() => { setPkg(p.id); setCustomBase(""); }}
                    style={{ accentColor: GOLD }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{p.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{p.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: GOLD }}>${p.priceUSD} USD</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{fmtCOP(Math.round(p.priceUSD * config.usdToCop))}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                O ingresa precio base manual (COP)
              </label>
              <input
                value={customBase}
                onChange={e => setCustomBase(e.target.value)}
                placeholder="ej. 12000000"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
            </div>
          </div>

          {/* Scope items */}
          <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="text-sm font-bold mb-3">Alcance adicional</div>
            <div className="flex flex-col gap-2">
              {config.scopeItems.map(item => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border transition-all duration-150 cursor-pointer"
                  style={{
                    border: `1px solid ${scopeSel.includes(item.id) ? GOLD : "var(--border)"}`,
                    background: scopeSel.includes(item.id) ? `${GOLD}08` : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={scopeSel.includes(item.id)}
                    onChange={() => toggleScope(item.id)}
                    style={{ accentColor: GOLD }}
                  />
                  <span className="flex-1 text-sm">{item.label}</span>
                  <span className="text-sm font-semibold" style={{ color: GOLD }}>{fmtCOP(item.price)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Discount + payment */}
          <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="text-sm font-bold mb-3">Descuento y términos</div>
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-2">
                <span style={{ color: "var(--muted-foreground)" }}>Descuento comercial</span>
                <span className="font-bold" style={{ color: discount > 0 ? "#ef4444" : "var(--muted-foreground)" }}>{discount}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={discount}
                onChange={e => setDiscount(+e.target.value)}
                className="w-full"
                style={{ accentColor: GOLD }}
              />
            </div>
            <div>
              <div className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>Términos de pago</div>
              <div className="flex gap-2 flex-wrap">
                {PAYMENT_TERMS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPaymentTerm(t.id)}
                    className="flex-1 px-2.5 py-2 rounded-lg text-xs transition-all duration-150"
                    style={{
                      minWidth: 100,
                      border: `1px solid ${paymentTerm === t.id ? GOLD : "var(--border)"}`,
                      background: paymentTerm === t.id ? `${GOLD}0D` : "transparent",
                      color: paymentTerm === t.id ? GOLD : "var(--muted-foreground)",
                      fontWeight: paymentTerm === t.id ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div>
          <div className="rounded-xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)", position: "sticky", top: 80 }}>
            <div className="text-sm font-bold mb-4">Resumen de precios</div>

            {/* Line items */}
            <div className="flex flex-col gap-2.5 mb-4">
              <LineItem label="Paquete base" value={fmtCOP(baseCOP)} />
              {scopeTotal > 0 && <LineItem label="Alcance adicional" value={`+ ${fmtCOP(scopeTotal)}`} />}
              {discount > 0 && <LineItem label="Descuento" value={`- ${fmtCOP(discountAmt)}`} negative />}
              {term.multiplier !== 1 && (
                <LineItem
                  label={`Ajuste ${term.label.split(" (")[0].toLowerCase()}`}
                  value={`- ${fmtCOP(Math.round(afterDiscount - final))}`}
                  negative
                />
              )}
            </div>

            <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                Precio final{term.suffix}
              </div>
              <div className="text-3xl font-extrabold tracking-tight" style={{ color: GOLD }}>{fmtCOP(final)}</div>
              <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{term.label.split(" (")[0]}</div>
            </div>

            <div className="mt-4 p-3 rounded-lg border" style={{ background: marginBg, borderColor: marginBorder }}>
              <div className="text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>Margen neto estimado</div>
              <div className="text-2xl font-bold" style={{ color: marginColor }}>{margin}%</div>
            </div>

            <button
              onClick={copyResumen}
              className="w-full mt-4 py-3 rounded-lg text-sm font-bold"
              style={{ background: GOLD, color: GOLD_TEXT, border: "none", cursor: "pointer" }}
            >
              Copiar resumen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LineItem({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span style={{ color: negative ? "#ef4444" : "var(--foreground)" }}>{value}</span>
    </div>
  );
}
