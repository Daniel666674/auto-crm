"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { NotificationToggle } from "@/components/shared/NotificationToggle";
import { useSession, signOut } from "next-auth/react";
import {
  RefreshCw, CheckCircle, AlertCircle, LogOut, Copy,
  User, Palette, Briefcase, Users, Plug, Kanban, Bell, Lock,
  Upload, Eye, EyeOff, Target, BarChart2, Zap, Globe, Trash2, Link2, ListPlus,
} from "lucide-react";
import { CloseReasonsSettings } from "@/components/settings/CloseReasonsSettings";
import { SalesTargetsSettings } from "@/components/settings/SalesTargetsSettings";
import { DealAgingSettings } from "@/components/settings/DealAgingSettings";
import { ScoringWeightsSettings } from "@/components/settings/ScoringWeightsSettings";
import { FitScoringSettings } from "@/components/settings/FitScoringSettings";
import { SlackSettings } from "@/components/settings/SlackSettings";
import { DaptaSettings } from "@/components/settings/DaptaSettings";
import { EngagementSourceSettings } from "@/components/settings/EngagementSourceSettings";
import { DuplicateDetector } from "@/components/settings/DuplicateDetector";
import { WorkflowTriggers } from "@/components/settings/WorkflowTriggers";
import { HandoffRulesSettings } from "@/components/settings/HandoffRulesSettings";
import { CurrencySettings } from "@/components/settings/CurrencySettings";
import { CustomFieldsSettings } from "@/components/settings/CustomFieldsSettings";
import { BSLoading } from "@/components/ui/BSLoading";
import { DigestScheduleSettings } from "@/components/settings/DigestScheduleSettings";
import { ApiTokensSettings } from "@/components/settings/ApiTokensSettings";
import { applyCrmTheme } from "@/lib/apply-theme";
import { PORTAL_WIDGETS, REQUIREMENTS_MAP, DEFAULT_PORTAL_CONFIG, type PortalConfig } from "@/types/portal";
import { CircleAlert, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "perfil" | "apariencia" | "negocio" | "usuarios" | "integraciones" | "pipeline" | "notificaciones" | "objetivos" | "scoring" | "cliente" | "automatizaciones" | "campos";

interface UserPrefs {
  theme: string; accentPrimary: string; accentSecondary: string;
  textColor: string; fontFamily: string; sidebarBg: string;
  sidebarBgType: string; sidebarBgImage?: string;
  uiDensity: string; borderRadius: string;
}

interface NotifPrefs {
  browserEnabled: boolean; emailEnabled: boolean; emailDigestFrequency: string;
  digestHour: number; digestEmail?: string;
  alertLeadHot: boolean; alertHotThreshold: number;
  alertFollowupOverdue: boolean; alertHandoffPending: boolean;
  alertDealMoved: boolean; alertCampaignPerf: boolean; campaignPerfThreshold: number;
}

interface UserRow {
  id: string; email: string; name?: string; role: string;
  image?: string; lastLogin?: number; createdAt?: number; policyAcknowledged?: boolean;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
  card: {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 12, padding: 24,
  } as React.CSSProperties,
  label: {
    fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)",
    textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6, display: "block",
  },
  input: {
    width: "100%", padding: "8px 12px", background: "var(--card)",
    border: "1px solid var(--border)", borderRadius: 8, fontSize: 13,
    color: "var(--foreground)", outline: "none", boxSizing: "border-box" as const,
  },
  btn: (variant: "primary" | "outline" | "ghost" | "danger" = "outline"): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: "pointer", border: "1px solid var(--border)", display: "inline-flex",
    alignItems: "center", gap: 6, transition: "all 0.12s",
    ...(variant === "primary" ? { background: "var(--primary)", color: "var(--primary-foreground)", border: "none" } : {}),
    ...(variant === "ghost" ? { background: "transparent", color: "var(--muted-foreground)", border: "none" } : {}),
    ...(variant === "danger" ? { background: "rgba(239,68,68,0.12)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" } : {}),
    ...(variant === "outline" ? { background: "transparent", color: "var(--foreground)" } : {}),
  }),
  row: { display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" as const },
  section: { display: "flex", flexDirection: "column" as const, gap: 20 },
  divider: { height: 1, background: "var(--border)", margin: "4px 0" } as React.CSSProperties,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={S.label}>{label}</span>
      {children}
    </div>
  );
}

function SaveBtn({ saving, onClick, label = "Guardar" }: { saving: boolean; onClick: () => void; label?: string }) {
  return (
    <button style={S.btn("primary")} onClick={onClick} disabled={saving}>
      {saving ? <RefreshCw size={13} className="animate-spin" /> : null}
      {saving ? "Guardando…" : label}
    </button>
  );
}

function RoleBadge({ role }: { role: string }) {
  const clean = role.replace(/^inactive:/, "");
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    superadmin: { bg: "rgba(195,154,76,0.15)", color: "#C39A4C", label: "Superadmin" },
    marketing:  { bg: "rgba(99,102,241,0.15)", color: "#6366f1", label: "Marketing" },
    sales:      { bg: "rgba(34,197,94,0.15)",  color: "#22c55e", label: "Sales" },
  };
  const c = cfg[clean] ?? { bg: "rgba(255,255,255,0.07)", color: "var(--muted-foreground)", label: clean };
  return (
    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
      {role.startsWith("inactive:") ? "⊘ " : ""}{c.label}
    </span>
  );
}

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────

function TabPerfil({ session }: { session: ReturnType<typeof useSession>["data"] }) {
  const userName = (session?.user as any)?.name || session?.user?.name || "Usuario";
  const userEmail = session?.user?.email || "";
  const userImage = (session?.user as any)?.image || session?.user?.image;
  const userRole = (session?.user as { role?: string })?.role || "sales";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const [name, setName] = useState(userName);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), ...(preview ? { image: preview } : {}) }),
      });
      toast.success("Perfil actualizado");
    } catch { toast.error("Error al guardar perfil"); }
    finally { setSaving(false); }
  };

  const avatarSrc = preview || userImage;

  return (
    <div style={S.section}>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <div style={{ position: "relative" }}>
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt={name} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(195,154,76,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#C39A4C", border: "2px solid var(--border)" }}>
                {initials}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: "var(--primary)", border: "2px solid var(--card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Upload size={11} color="var(--primary-foreground)" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImage} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{userEmail}</div>
            <div style={{ marginTop: 6 }}><RoleBadge role={userRole} /></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Nombre completo">
            <input style={S.input} value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <input style={{ ...S.input, color: "var(--muted-foreground)", cursor: "not-allowed" }} value={userEmail} readOnly />
          </Field>
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <SaveBtn saving={saving} onClick={handleSave} />
          <button style={S.btn("danger")} onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Lock size={14} style={{ color: "var(--muted-foreground)" }} /> Seguridad
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
          La autenticación está gestionada por <strong>Google OAuth</strong>. Para cambiar tu contraseña o habilitar 2FA, visita{" "}
          <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" style={{ color: "#C39A4C", textDecoration: "underline" }}>
            myaccount.google.com/security
          </a>.
        </p>
        <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, fontSize: 12, color: "#22c55e", display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={13} /> Sesión activa — dominio blackscale.consulting verificado
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Apariencia ──────────────────────────────────────────────────────────

const FONTS = [
  { id: "inter", label: "Inter", preview: "Aa" },
  { id: "merriweather", label: "Merriweather", preview: "Aa" },
  { id: "playfair", label: "Playfair", preview: "Aa" },
  { id: "mono", label: "JetBrains Mono", preview: "Aa" },
];

// Blackscale brandbook palette — appearance options are LOCKED to these values.
// Do not add arbitrary hex colors here without brand approval.
const BS_BRAND = {
  goldPrimary:   "#C39A4C", // Primary accent
  goldDeep:      "#A07A2E", // Deeper gold for hover/secondary accent
  burgundy:      "#6D1F2E", // Brandbook secondary
  ivory:         "#D7D2CB", // Brandbook text on dark
  charcoal:      "#0a0a09", // Brandbook black
  slate:         "#1a1a17", // Brandbook surface
  light:         "#fafafa", // Light-mode bg
  ink:           "#0f172a", // Light-mode text
};

const BS_ACCENT_SWATCHES: { id: string; hex: string; label: string }[] = [
  { id: "gold",     hex: BS_BRAND.goldPrimary, label: "Oro" },
  { id: "goldDeep", hex: BS_BRAND.goldDeep,    label: "Oro profundo" },
  { id: "burgundy", hex: BS_BRAND.burgundy,    label: "Burdeos" },
];

const BS_SIDEBAR_SWATCHES: { id: string; hex: string; label: string }[] = [
  { id: "charcoal", hex: BS_BRAND.charcoal, label: "Carbón" },
  { id: "slate",    hex: BS_BRAND.slate,    label: "Pizarra" },
  { id: "burgundy", hex: BS_BRAND.burgundy, label: "Burdeos" },
];

const BS_TEXT_SWATCHES: { id: string; hex: string; label: string }[] = [
  { id: "ivory", hex: BS_BRAND.ivory, label: "Marfil" },
  { id: "ink",   hex: BS_BRAND.ink,   label: "Tinta" },
];

function BrandSwatchPicker({
  value, onChange, swatches,
}: {
  value: string;
  onChange: (hex: string) => void;
  swatches: { id: string; hex: string; label: string }[];
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {swatches.map(sw => {
        const active = value.toLowerCase() === sw.hex.toLowerCase();
        return (
          <button
            key={sw.id}
            type="button"
            onClick={() => onChange(sw.hex)}
            title={`${sw.label} — ${sw.hex}`}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px 6px 6px", borderRadius: 8, cursor: "pointer",
              border: `1.5px solid ${active ? "#C39A4C" : "var(--border)"}`,
              background: active ? "rgba(195,154,76,0.08)" : "transparent",
              fontSize: 11, color: "var(--foreground)",
              transition: "all 0.12s",
            }}
          >
            <span style={{ width: 22, height: 22, borderRadius: 5, background: sw.hex, border: "1px solid rgba(255,255,255,0.08)" }} />
            <span style={{ fontWeight: active ? 600 : 400 }}>{sw.label}</span>
          </button>
        );
      })}
    </div>
  );
}


function TabApariencia() {
  const DEFAULTS: UserPrefs = {
    theme: "dark", accentPrimary: "#C39A4C", accentSecondary: "#6D1F2E",
    textColor: "#e2e8f0", fontFamily: "inter", sidebarBg: "#0a0a0a",
    sidebarBgType: "solid", uiDensity: "comfortable", borderRadius: "rounded",
  };
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/preferences").then(r => r.json()).then(d => {
      if (d && !d.error) setPrefs({ ...DEFAULTS, ...d });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof UserPrefs, v: string) => setPrefs(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/preferences", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      applyCrmTheme(prefs);
      toast.success("Apariencia guardada");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    setPrefs(DEFAULTS);
    await fetch("/api/settings/preferences", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEFAULTS),
    });
    toast.success("Defaults restaurados");
  };

  if (!loaded) return <BSLoading label="Cargando…" />;

  const ToggleGroup = ({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{
          padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer",
          border: `1px solid ${value === o.id ? "var(--primary)" : "var(--border)"}`,
          background: value === o.id ? "var(--primary)" : "transparent",
          color: value === o.id ? "var(--primary-foreground)" : "var(--muted-foreground)",
          transition: "all 0.12s",
        }}>{o.label}</button>
      ))}
    </div>
  );

  // Live preview mini card
  const previewBg = prefs.sidebarBgType === "solid" ? prefs.sidebarBg
    : `linear-gradient(135deg, ${prefs.sidebarBg}, ${prefs.accentSecondary})`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20, alignItems: "start" }}>
      {/* Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Theme */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Tema</div>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { id: "dark", label: "Oscuro", bg: "#0a0a0a", text: "#e2e8f0" },
              { id: "light", label: "Claro", bg: "#f8fafc", text: "#0f172a" },
              { id: "custom", label: "Personalizado", bg: "linear-gradient(135deg,#1a1a2e,#6D1F2E)", text: "#C39A4C" },
            ].map(t => (
              <button key={t.id} onClick={() => set("theme", t.id)} style={{
                flex: 1, padding: 16, borderRadius: 10, cursor: "pointer",
                border: `2px solid ${prefs.theme === t.id ? "#C39A4C" : "var(--border)"}`,
                background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              }}>
                <div style={{ width: 32, height: 20, borderRadius: 4, background: t.text, opacity: 0.8 }} />
                <span style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{t.label}</span>
              </button>
            ))}
          </div>

          {prefs.theme === "custom" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                Los colores están bloqueados al brandbook de Blackscale. Solo se permiten los tonos oficiales.
              </div>
              <Field label="Accent primario">
                <BrandSwatchPicker value={prefs.accentPrimary} onChange={v => set("accentPrimary", v)} swatches={BS_ACCENT_SWATCHES} />
              </Field>
              <Field label="Accent secundario">
                <BrandSwatchPicker value={prefs.accentSecondary} onChange={v => set("accentSecondary", v)} swatches={BS_ACCENT_SWATCHES} />
              </Field>
              <Field label="Color de texto">
                <BrandSwatchPicker value={prefs.textColor} onChange={v => set("textColor", v)} swatches={BS_TEXT_SWATCHES} />
              </Field>
            </div>
          )}
        </div>

        {/* Typography */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Tipografía</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {FONTS.map(f => (
              <button key={f.id} onClick={() => set("fontFamily", f.id)} style={{
                padding: "12px 8px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                border: `2px solid ${prefs.fontFamily === f.id ? "#C39A4C" : "var(--border)"}`,
                background: prefs.fontFamily === f.id ? "rgba(195,154,76,0.08)" : "transparent",
              }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: prefs.fontFamily === f.id ? "#C39A4C" : "var(--foreground)" }}>{f.preview}</div>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 4 }}>{f.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar background */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Sidebar</div>
          <ToggleGroup
            options={[{ id: "solid", label: "Color sólido" }, { id: "gradient", label: "Gradiente" }, { id: "image", label: "Imagen" }]}
            value={prefs.sidebarBgType} onChange={v => set("sidebarBgType", v)}
          />
          <div style={{ marginTop: 12 }}>
            {prefs.sidebarBgType === "solid" && (
              <BrandSwatchPicker value={prefs.sidebarBg} onChange={v => set("sidebarBg", v)} swatches={BS_SIDEBAR_SWATCHES} />
            )}
            {prefs.sidebarBgType === "gradient" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 4 }}>Color base</div>
                  <BrandSwatchPicker value={prefs.sidebarBg} onChange={v => set("sidebarBg", v)} swatches={BS_SIDEBAR_SWATCHES} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 4 }}>Color secundario</div>
                  <BrandSwatchPicker value={prefs.accentSecondary} onChange={v => set("accentSecondary", v)} swatches={BS_ACCENT_SWATCHES} />
                </div>
              </div>
            )}
            {prefs.sidebarBgType === "image" && (
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                Sube una imagen para el fondo del sidebar (se almacena como base64).
              </div>
            )}
          </div>
        </div>

        {/* Density + border radius */}
        <div style={S.card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <Field label="Densidad UI">
              <ToggleGroup
                options={[{ id: "compact", label: "Compacta" }, { id: "comfortable", label: "Normal" }, { id: "spacious", label: "Espaciada" }]}
                value={prefs.uiDensity} onChange={v => set("uiDensity", v)}
              />
            </Field>
            <Field label="Border radius">
              <ToggleGroup
                options={[{ id: "sharp", label: "Sharp" }, { id: "rounded", label: "Redondeado" }, { id: "pill", label: "Pill" }]}
                value={prefs.borderRadius} onChange={v => set("borderRadius", v)}
              />
            </Field>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <SaveBtn saving={saving} onClick={handleSave} label="Guardar apariencia" />
          <button style={S.btn("outline")} onClick={handleReset}>Restaurar defaults</button>
        </div>
      </div>

      {/* Live preview */}
      <div style={{ position: "sticky", top: 80 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Vista previa</div>
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", fontSize: 11 }}>
          {/* Mini sidebar */}
          <div style={{ background: previewBg, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: prefs.accentPrimary, marginBottom: 4 }} />
            {["Dashboard", "Contactos", "Pipeline", "Marketing"].map(l => (
              <div key={l} style={{ padding: "5px 8px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: prefs.textColor, fontSize: 10 }}>{l}</div>
            ))}
          </div>
          {/* Mini card */}
          <div style={{ background: "#111", padding: 12 }}>
            <div style={{ height: 8, width: "60%", borderRadius: 4, background: prefs.accentPrimary, marginBottom: 8 }} />
            <div style={{ height: 6, width: "80%", borderRadius: 3, background: "rgba(255,255,255,0.12)", marginBottom: 5 }} />
            <div style={{ height: 6, width: "50%", borderRadius: 3, background: "rgba(255,255,255,0.08)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Negocio ─────────────────────────────────────────────────────────────

const INDUSTRIES = ["Technology","Finance","Healthcare","Real Estate","Education","Marketing","Consulting","Retail","Manufacturing","Other"];
const BIZ_TYPES = ["Services","SaaS","Agency","Consulting"];
const BIZ_SIZES = ["Solo","2-5","6-15","16-50","50+"];
const CURRENCIES = ["COP","USD","EUR"];
const TIMEZONES = ["America/Bogota","America/New_York","America/Chicago","America/Denver","America/Los_Angeles","Europe/Madrid","UTC"];

function TabNegocio({ role }: { role: string }) {
  const canEdit = role === "superadmin" || role === "marketing";
  const [data, setData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/business").then(r => r.json()).then(d => { if (!d.error) setData(d); }).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setData(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/business", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast.success("Configuración de negocio guardada");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  if (!canEdit) {
    return (
      <div style={S.card}>
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted-foreground)", fontSize: 13 }}>
          <Lock size={28} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
          Solo superadmin y marketing pueden editar la configuración de negocio.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div style={S.card}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Nombre de empresa">
          <input style={S.input} value={data.company_name || ""} onChange={e => set("company_name", e.target.value)} placeholder="BlackScale Consulting" />
        </Field>
        <Field label="Industria">
          <select style={S.input} value={data.company_industry || ""} onChange={e => set("company_industry", e.target.value)}>
            <option value="">Seleccionar…</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </Field>
        <Field label="Tipo">
          <select style={S.input} value={data.company_type || ""} onChange={e => set("company_type", e.target.value)}>
            <option value="">Seleccionar…</option>
            {BIZ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Tamaño equipo">
          <select style={S.input} value={data.company_size || ""} onChange={e => set("company_size", e.target.value)}>
            <option value="">Seleccionar…</option>
            {BIZ_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Moneda">
          <select style={S.input} value={data.currency || "COP"} onChange={e => set("currency", e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Zona horaria">
          <select style={S.input} value={data.timezone || "America/Bogota"} onChange={e => set("timezone", e.target.value)}>
            {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Idioma CRM">
          <select style={S.input} value={data.language || "es"} onChange={e => set("language", e.target.value)}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 20 }}>
        <SaveBtn saving={saving} onClick={handleSave} label="Guardar configuración" />
      </div>
    </div>
    <CurrencySettings canEdit={canEdit} />
    </div>
  );
}

// ─── Tab: Usuarios ────────────────────────────────────────────────────────────

function TabUsuarios({ currentUserId }: { currentUserId: string }) {
  const [userList, setUserList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("sales");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/settings/users").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setUserList(d);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/settings/users/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, name: inviteName.trim() }),
      });
      const d = await res.json();
      if (d.error) { toast.error(d.error); return; }
      toast.success(`Usuario ${inviteEmail} creado. Al iniciar sesión con Google, su acceso estará activo.`);
      setShowInvite(false); setInviteEmail(""); setInviteName(""); setInviteRole("sales");
      load();
    } catch { toast.error("Error al crear usuario"); }
    finally { setInviting(false); }
  };

  const changeRole = async (id: string, role: string) => {
    await fetch(`/api/settings/users/${id}/role`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    load();
  };

  const toggleStatus = async (id: string, currentRole: string) => {
    const isActive = !currentRole.startsWith("inactive:");
    await fetch(`/api/settings/users/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !isActive }),
    });
    load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{userList.length} usuarios registrados</span>
        <button style={S.btn("primary")} onClick={() => setShowInvite(v => !v)}>+ Invitar usuario</button>
      </div>

      {showInvite && (
        <div style={{ ...S.card, background: "rgba(195,154,76,0.05)", border: "1px solid rgba(195,154,76,0.2)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Nuevo usuario</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Email">
              <input style={S.input} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="usuario@blackscale.consulting" />
            </Field>
            <Field label="Nombre">
              <input style={S.input} value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Nombre completo" />
            </Field>
            <Field label="Rol">
              <select style={S.input} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="superadmin">Superadmin</option>
                <option value="marketing">Marketing</option>
                <option value="sales">Sales</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button style={S.btn("primary")} onClick={handleInvite} disabled={inviting}>
              {inviting ? <RefreshCw size={13} className="animate-spin" /> : null}
              {inviting ? "Creando…" : "Crear usuario"}
            </button>
            <button style={S.btn("ghost")} onClick={() => setShowInvite(false)}>Cancelar</button>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 10 }}>
            El usuario iniciará sesión con su cuenta Google <code>@blackscale.consulting</code>. No se envía contraseña.
          </p>
        </div>
      )}

      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.2fr 120px", padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
          {["Usuario", "Email", "Rol", "Último acceso", "Estado"].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
          ))}
        </div>
        {loading ? (
          <BSLoading label="Cargando usuarios…" />
        ) : userList.map((u, i) => {
          const isMe = u.id === currentUserId;
          const isActive = !u.role.startsWith("inactive:");
          const cleanRole = u.role.replace(/^inactive:/, "");
          const initials = (u.name || u.email).split(/[\s@]/).map(n => n[0]).join("").slice(0, 2).toUpperCase();
          return (
            <div key={u.id} style={{
              display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.2fr 120px",
              padding: "12px 20px", alignItems: "center",
              borderBottom: i < userList.length - 1 ? "1px solid var(--border)" : "none",
              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
              opacity: isActive ? 1 : 0.5,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {u.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.image} alt={initials} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(195,154,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#C39A4C" }}>{initials}</div>
                )}
                <span style={{ fontSize: 13, fontWeight: 500 }}>{u.name || "—"} {isMe && <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>(tú)</span>}</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{u.email}</span>
              <div>
                {isMe ? <RoleBadge role={cleanRole} /> : (
                  <select
                    value={cleanRole}
                    onChange={e => changeRole(u.id, e.target.value)}
                    style={{ ...S.input, padding: "3px 8px", fontSize: 11, width: "auto" }}
                  >
                    <option value="superadmin">Superadmin</option>
                    <option value="marketing">Marketing</option>
                    <option value="sales">Sales</option>
                  </select>
                )}
              </div>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("es-CO") : "Nunca"}
              </span>
              <div>
                {isMe ? (
                  <span style={{ fontSize: 11, color: "#22c55e" }}>● Activo</span>
                ) : (
                  <button
                    onClick={() => toggleStatus(u.id, u.role)}
                    style={{ ...S.btn(isActive ? "outline" : "ghost"), fontSize: 11, padding: "3px 10px" }}
                  >
                    {isActive ? "Desactivar" : "Activar"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Integraciones ───────────────────────────────────────────────────────

function TabIntegraciones({ role }: { role: string }) {
  const isSuperadmin = role === "superadmin";

  const [ga4Connected, setGa4Connected] = useState<boolean | null>(null);
  const [ga4Checking, setGa4Checking] = useState(false);
  const [envStatus, setEnvStatus] = useState<{ brevo: boolean; apollo: boolean; ga4Property: string | null; gscSiteUrl: string } | null>(null);
  const [googleConn, setGoogleConn] = useState<{ connected: boolean; email: string | null } | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  const loadGoogleConn = () => {
    fetch("/api/google/connection")
      .then(r => r.json())
      .then(d => setGoogleConn({ connected: !!d.connected, email: d.email ?? null }))
      .catch(() => setGoogleConn({ connected: false, email: null }));
  };

  useEffect(() => {
    fetch("/api/ga4")
      .then(r => r.json())
      .then(d => setGa4Connected(d.error !== "ga4_not_connected"))
      .catch(() => setGa4Connected(false));
    fetch("/api/settings/integrations-status")
      .then(r => r.json())
      .then(d => setEnvStatus(d))
      .catch(() => {});
    loadGoogleConn();
  }, []);

  const handleGoogleConnect = () => {
    window.location.href = "/api/google/calendar/auth?return=integrations";
  };

  const handleGoogleDisconnect = async () => {
    if (!confirm("¿Desconectar Google Workspace? Las secuencias dejarán de enviarse por Gmail y el calendario se desvinculará hasta reconectar.")) return;
    setGoogleBusy(true);
    try {
      const res = await fetch("/api/google/connection", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setGoogleConn({ connected: false, email: null });
      toast.success("Google Workspace desconectado");
    } catch {
      toast.error("No se pudo desconectar Google");
    } finally {
      setGoogleBusy(false);
    }
  };

  const [brevoKey, setBrevoKey] = useState("");
  const [savingBrevo, setSavingBrevo] = useState(false);
  const [brevoStatus, setBrevoStatus] = useState<"idle" | "ok" | "error">("idle");
  const [brevoVisible, setBrevoVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<null | { synced: number; total: number }>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<null | Record<string, unknown>>(null);

  const [apolloKey, setApolloKey] = useState("");
  const [savingApollo, setSavingApollo] = useState(false);
  const [apolloStatus, setApolloStatus] = useState<"idle" | "ok" | "error">("idle");
  const [apolloVisible, setApolloVisible] = useState(false);
  const [apolloSyncing, setApolloSyncing] = useState(false);
  const [apolloSyncResult, setApolloSyncResult] = useState<null | { inserted: number; skipped: number; total: number }>(null);
  const [apolloLastSync, setApolloLastSync] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/import-apollo").then(r => r.json()).then(d => {
      if (d.lastSync) setApolloLastSync(d.lastSync);
    }).catch(() => {});
  }, []);

  const handleSaveBrevo = async () => {
    if (!brevoKey.trim()) return;
    setSavingBrevo(true);
    try {
      const res = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": brevoKey } });
      setBrevoStatus(res.ok ? "ok" : "error");
      toast[res.ok ? "success" : "error"](res.ok ? "Brevo API key válida. Actualiza BREVO_API_KEY en .env.local." : "Brevo API key inválida.");
    } catch { setBrevoStatus("error"); toast.error("No se pudo verificar la key de Brevo."); }
    finally { setSavingBrevo(false); }
  };

  const handleSyncBrevo = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch("/api/brevo/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setSyncResult({ synced: data.synced, total: data.total });
      toast.success(`${data.synced} contactos sincronizados desde Brevo`);
    } catch { toast.error("Error al sincronizar con Brevo"); }
    finally { setSyncing(false); }
  };

  const handleRecalculate = async () => {
    setRecalculating(true); setRecalcResult(null);
    try {
      const res = await fetch("/api/brevo/recalculate-scores", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushToBrevo: true }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setRecalcResult(data);
      toast.success(`Scores recalculados: ${data.processed} contactos`);
    } catch { toast.error("Error al recalcular scores"); }
    finally { setRecalculating(false); }
  };

  const handleSaveApollo = async () => {
    if (!apolloKey.trim()) return;
    setSavingApollo(true);
    try {
      const res = await fetch("https://api.apollo.io/v1/auth/health", {
        method: "GET", headers: { "X-Api-Key": apolloKey, "Content-Type": "application/json" },
      });
      setApolloStatus(res.ok ? "ok" : "error");
      toast[res.ok ? "success" : "error"](res.ok ? "Apollo API key válida. Actualiza APOLLO_API_KEY en .env.local." : "Apollo API key inválida.");
    } catch { setApolloStatus("error"); toast.error("No se pudo verificar la key de Apollo."); }
    finally { setSavingApollo(false); }
  };

  const StatusIcon = ({ status }: { status: "idle" | "ok" | "error" }) => {
    if (status === "ok") return <CheckCircle size={16} color="#22c55e" />;
    if (status === "error") return <AlertCircle size={16} color="#ef4444" />;
    return null;
  };

  const StatusBadge = ({ connected }: { connected: boolean }) => (
    <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: connected ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: connected ? "#22c55e" : "#ef4444" }}>
      {connected ? "Conectado" : "Pendiente"}
    </span>
  );

  const IntSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(195,154,76,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Brevo */}
      <IntSection title="Brevo — Email Marketing" icon={<span style={{ fontSize: 14, color: "#0070f3" }}>✉</span>}>
        {envStatus !== null && (
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>BREVO_API_KEY en servidor:</span>
            <StatusBadge connected={envStatus.brevo} />
          </div>
        )}
        {isSuperadmin ? (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input type={brevoVisible ? "text" : "password"} placeholder="xkeysib-… (verificar clave)" value={brevoKey} onChange={e => setBrevoKey(e.target.value)}
                  style={{ ...S.input, paddingRight: 36 }} />
                <button onClick={() => setBrevoVisible(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
                  {brevoVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button style={S.btn()} onClick={handleSaveBrevo} disabled={savingBrevo || !brevoKey.trim()}>
                {savingBrevo ? <RefreshCw size={13} className="animate-spin" /> : "Verificar"}
              </button>
              <StatusIcon status={brevoStatus} />
            </div>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 8 }}>
              Para producción: actualiza <code>BREVO_API_KEY</code> en <code>.env.local</code> y reinicia PM2.
            </p>
            <div style={{ ...S.divider, margin: "14px 0" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Sincronizar contactos</div>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>Importa contactos de Brevo con atributos SCORE, TIER e INDUSTRY.</p>
                <button style={{ ...S.btn("outline"), width: "100%", justifyContent: "center" }} onClick={handleSyncBrevo} disabled={syncing}>
                  {syncing ? <><RefreshCw size={12} className="animate-spin" />Sincronizando…</> : "Sincronizar desde Brevo"}
                </button>
                {syncResult && <p style={{ fontSize: 11, color: "#22c55e", marginTop: 6 }}>✓ {syncResult.synced} de {syncResult.total} sincronizados</p>}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Recalcular ICP Scores</div>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>Aplica algoritmo completo y actualiza TIER en Brevo.</p>
                <button style={{ ...S.btn("outline"), width: "100%", justifyContent: "center" }} onClick={handleRecalculate} disabled={recalculating}>
                  {recalculating ? <><RefreshCw size={12} className="animate-spin" />Calculando…</> : "Recalcular Scores ICP"}
                </button>
                {recalcResult && (
                  <p style={{ fontSize: 11, color: "#22c55e", marginTop: 6 }}>
                    ✓ {String(recalcResult.processed)} procesados — T1: {String((recalcResult.tierBreakdown as any)?.tier1 || 0)}, T2: {String((recalcResult.tierBreakdown as any)?.tier2 || 0)}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Estado de conexión</span>
            <StatusBadge connected={true} />
          </div>
        )}
      </IntSection>

      {/* Engagement source (Brevo → BlackScale local, Phase 3) */}
      <EngagementSourceSettings role={role} />

      {/* Apollo */}
      <IntSection title="Apollo — Lead Intelligence" icon={<span style={{ fontSize: 14, color: "#6366f1" }}>◉</span>}>
        {envStatus !== null && (
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>APOLLO_API_KEY en servidor:</span>
            <StatusBadge connected={envStatus.apollo} />
          </div>
        )}
        {isSuperadmin ? (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input type={apolloVisible ? "text" : "password"} placeholder="Apollo API key…" value={apolloKey} onChange={e => setApolloKey(e.target.value)}
                  style={{ ...S.input, paddingRight: 36 }} />
                <button onClick={() => setApolloVisible(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
                  {apolloVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button style={S.btn()} onClick={handleSaveApollo} disabled={savingApollo || !apolloKey.trim()}>
                {savingApollo ? <RefreshCw size={13} className="animate-spin" /> : "Verificar"}
              </button>
              <StatusIcon status={apolloStatus} />
            </div>
            <div style={{ ...S.divider, margin: "14px 0" }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Apollo CSV Sync</div>
              {apolloLastSync && <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6 }}>Última sync: {new Date(apolloLastSync).toLocaleString("es-CO")}</p>}
              <button style={{ ...S.btn("outline"), justifyContent: "center" }} disabled={apolloSyncing}
                onClick={async () => {
                  setApolloSyncing(true); setApolloSyncResult(null);
                  try {
                    const res = await fetch("/api/import-apollo", { method: "POST" });
                    const data = await res.json();
                    if (data.error) { toast.error(data.error); return; }
                    setApolloSyncResult(data); setApolloLastSync(data.lastSync);
                    toast.success(`Apollo sync: ${data.inserted} contactos importados`);
                  } catch { toast.error("Error al importar Apollo CSV"); }
                  finally { setApolloSyncing(false); }
                }}>
                {apolloSyncing ? <><RefreshCw size={12} className="animate-spin" />Importando…</> : "Sincronizar Apollo CSV"}
              </button>
              {apolloSyncResult && <p style={{ fontSize: 11, color: "#22c55e", marginTop: 6 }}>✓ {apolloSyncResult.inserted} nuevos · {apolloSyncResult.skipped} omitidos</p>}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Estado de conexión</span>
            <StatusBadge connected={false} />
          </div>
        )}
      </IntSection>

      {/* Google Workspace — Calendar + Gmail */}
      <IntSection title="Google Workspace — Calendar + Gmail" icon={<span style={{ fontSize: 14, color: "#4285f4" }}>G</span>}>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 14 }}>
          Conecta tu cuenta <code>@blackscale.consulting</code> para sincronizar el calendario y enviar
          secuencias de email desde tu bandeja vía Gmail. Reconecta si agregaste nuevos permisos (ej. <code>gmail.send</code>).
        </p>
        {googleConn === null ? (
          <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Verificando…</span>
        ) : googleConn.connected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <StatusBadge connected={true} />
            {googleConn.email && (
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{googleConn.email}</span>
            )}
            <button style={S.btn("outline")} onClick={handleGoogleConnect} disabled={googleBusy}>
              <RefreshCw size={13} /> Reconectar
            </button>
            <button style={S.btn("outline")} onClick={handleGoogleDisconnect} disabled={googleBusy}>
              {googleBusy ? <RefreshCw size={13} className="animate-spin" /> : <><Trash2 size={13} /> Desconectar</>}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <StatusBadge connected={false} />
            <button style={S.btn()} onClick={handleGoogleConnect} disabled={googleBusy}>
              <Link2 size={13} /> Conectar Google
            </button>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Calendar + envío de secuencias por Gmail</span>
          </div>
        )}
      </IntSection>

      {/* Webhook */}
      {/* GA4 */}
      <IntSection title="Google Analytics 4" icon={<span style={{ fontSize: 14, color: "#ea4335" }}>G</span>}>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 14 }}>
          Conecta tu cuenta Google para ver métricas de Analytics en el CRM. Property ID: <strong>530528809</strong>
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {ga4Connected === null ? (
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Verificando...</span>
          ) : ga4Connected ? (
            <>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>CONECTADO</span>
              <button
                style={{ ...S.btn("outline") }}
                disabled={ga4Checking}
                onClick={async () => {
                  setGa4Checking(true);
                  await fetch("/api/ga4?bypass=1");
                  setGa4Checking(false);
                  toast.success("Cache de GA4 actualizado");
                }}>
                {ga4Checking ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Refrescar datos
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>NO CONECTADO</span>
              <button
                style={{ ...S.btn() }}
                onClick={() => { window.location.href = "/api/auth/signin/google?callbackUrl=/settings"; }}>
                Conectar GA4
              </button>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Re-autentica con Google para otorgar acceso a Analytics</span>
            </>
          )}
        </div>
      </IntSection>

      <IntSection title="Webhook de leads" icon={<span style={{ fontSize: 14 }}>⚡</span>}>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 12 }}>
          Recibe leads automáticamente desde Typeform, Tally, formularios web, etc.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code style={{ flex: 1, fontSize: 12, background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: 7, border: "1px solid var(--border)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            POST {typeof window !== "undefined" ? window.location.origin : "https://nexus.blackscale.consulting"}/api/webhook
          </code>
          {isSuperadmin && (
            <button style={S.btn()} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/webhook`); toast.success("URL copiada"); }}>
              <Copy size={13} /> Copiar
            </button>
          )}
        </div>
      </IntSection>

      <SlackSettings role={role} />

      {/* Dapta AI */}
      <DaptaSettings role={role} />

      {role === "superadmin" && (
        <div style={S.card}>
          <ApiTokensSettings />
        </div>
      )}
    </div>
  );
}

// ─── Tab: Pipeline ─────────────────────────────────────────────────────────────

type Stage = { id: string; name: string; color: string; order: number; isWon: boolean; isLost: boolean };

function TabPipeline({ role }: { role: string }) {
  const canEdit = role === "superadmin";
  const [stages, setStages] = useState<Stage[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#64748b");
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#64748b");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    fetch("/api/pipeline").then(r => r.json()).then((data: Stage[]) => {
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => a.order - b.order) : [];
      setStages(sorted);
    }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const startEdit = (stage: Stage) => {
    setEditId(stage.id);
    setEditName(stage.name);
    setEditColor(stage.color);
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/pipeline/stages/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, color: editColor }),
      });
      const d = await res.json();
      if (d.error) { toast.error(d.error); return; }
      toast.success("Etapa actualizada");
      setEditId(null);
      load();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const deleteStage = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/pipeline/stages/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (d.error) { toast.error(d.error); return; }
      toast.success("Etapa eliminada");
      load();
    } catch { toast.error("Error al eliminar"); }
    finally { setDeleting(null); }
  };

  const addStage = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/pipeline/stages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      const d = await res.json();
      if (d.error) { toast.error(d.error); return; }
      toast.success("Etapa creada");
      setShowAdd(false); setNewName(""); setNewColor("#64748b");
      load();
    } catch { toast.error("Error al crear etapa"); }
    finally { setAdding(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {canEdit && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button style={S.btn("primary")} onClick={() => setShowAdd(v => !v)}>+ Nueva etapa</button>
        </div>
      )}

      {showAdd && (
        <div style={{ ...S.card, background: "rgba(195,154,76,0.05)", border: "1px solid rgba(195,154,76,0.2)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Nueva etapa del pipeline</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
              style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer", borderRadius: 6 }} />
            <input style={{ ...S.input, flex: 1 }} placeholder="Nombre de la etapa" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addStage()} />
            <button style={S.btn("primary")} onClick={addStage} disabled={adding || !newName.trim()}>
              {adding ? <RefreshCw size={13} className="animate-spin" /> : "Crear"}
            </button>
            <button style={S.btn("ghost")} onClick={() => setShowAdd(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Kanban size={15} /> Etapas del pipeline
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stages.map((stage) => (
            <div key={stage.id}>
              {editId === stage.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--primary)", background: "rgba(195,154,76,0.05)" }}>
                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                    style={{ width: 30, height: 30, border: "none", background: "none", cursor: "pointer", borderRadius: 6, flexShrink: 0 }} />
                  <input style={{ ...S.input, flex: 1, padding: "5px 10px" }} value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(stage.id); if (e.key === "Escape") cancelEdit(); }} />
                  <button style={S.btn("primary")} onClick={() => saveEdit(stage.id)} disabled={saving}>
                    {saving ? <RefreshCw size={12} className="animate-spin" /> : "Guardar"}
                  </button>
                  <button style={S.btn("ghost")} onClick={cancelEdit}>Cancelar</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: stage.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{stage.name}</span>
                  {stage.isWon && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>Ganado</span>}
                  {stage.isLost && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>Perdido</span>}
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4 }}>#{stage.order}</span>
                  {canEdit && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...S.btn("ghost"), padding: "3px 8px", fontSize: 11 }} onClick={() => startEdit(stage)}>Editar</button>
                      <button
                        style={{ ...S.btn("danger"), padding: "3px 8px", fontSize: 11, opacity: deleting === stage.id ? 0.6 : 1 }}
                        onClick={() => deleteStage(stage.id)}
                        disabled={deleting === stage.id}
                      >
                        {deleting === stage.id ? <RefreshCw size={11} className="animate-spin" /> : "Eliminar"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {!canEdit && (
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 14 }}>
            Solo superadmin puede editar las etapas del pipeline.
          </p>
        )}
      </div>

      <CloseReasonsSettings role={role} />

      <div style={S.card}>
        <DuplicateDetector />
      </div>
    </div>
  );
}

// ─── Tab: Notificaciones ──────────────────────────────────────────────────────

function TabNotificaciones() {
  const { data: notifSession } = useSession();
  const notifRole = (notifSession?.user as { role?: string })?.role ?? "sales";
  const DEFAULTS: NotifPrefs = {
    browserEnabled: true, emailEnabled: true, emailDigestFrequency: "daily",
    digestHour: 6, alertLeadHot: true, alertHotThreshold: 70,
    alertFollowupOverdue: true, alertHandoffPending: true,
    alertDealMoved: true, alertCampaignPerf: true, campaignPerfThreshold: 50,
  };
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications").then(r => r.json()).then(d => {
      if (d && !d.error) setPrefs({ ...DEFAULTS, ...d });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof NotifPrefs>(k: K, v: NotifPrefs[K]) => setPrefs(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/notifications", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      toast.success("Preferencias de notificación guardadas");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const Toggle = ({ value, onChange, label, description }: { value: boolean; onChange: (v: boolean) => void; label: string; description?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{description}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", transition: "background 0.2s",
        background: value ? "var(--primary)" : "rgba(255,255,255,0.12)", position: "relative", flexShrink: 0,
      }}>
        <span style={{ position: "absolute", top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Canales</div>
        <Toggle value={prefs.browserEnabled} onChange={v => set("browserEnabled", v)} label="Notificaciones del navegador" description="Push notifications en tiempo real" />
        <Toggle value={prefs.emailEnabled} onChange={v => set("emailEnabled", v)} label="Resumen por email" />
        {prefs.emailEnabled && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
            <Field label="Frecuencia">
              <select style={S.input} value={prefs.emailDigestFrequency} onChange={e => set("emailDigestFrequency", e.target.value)}>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="never">Nunca</option>
              </select>
            </Field>
            <Field label="Hora de envío">
              <input type="number" style={S.input} min={0} max={23} value={prefs.digestHour} onChange={e => set("digestHour", parseInt(e.target.value))} />
            </Field>
            <Field label="Email destino">
              <input style={S.input} type="email" value={prefs.digestEmail || ""} onChange={e => set("digestEmail", e.target.value)} placeholder="tu@correo.com" />
            </Field>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <NotificationToggle />
        </div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Alertas</div>
        <Toggle value={prefs.alertLeadHot} onChange={v => set("alertLeadHot", v)} label="Lead caliente" description={`Score ≥ ${prefs.alertHotThreshold}`} />
        {prefs.alertLeadHot && (
          <div style={{ marginLeft: 0, padding: "8px 0" }}>
            <Field label="Threshold de score caliente">
              <input type="number" style={{ ...S.input, width: 100 }} min={1} max={100} value={prefs.alertHotThreshold} onChange={e => set("alertHotThreshold", parseInt(e.target.value))} />
            </Field>
          </div>
        )}
        <Toggle value={prefs.alertFollowupOverdue} onChange={v => set("alertFollowupOverdue", v)} label="Seguimiento vencido" />
        <Toggle value={prefs.alertHandoffPending} onChange={v => set("alertHandoffPending", v)} label="Handoff pendiente +48h" />
        <Toggle value={prefs.alertDealMoved} onChange={v => set("alertDealMoved", v)} label="Deal movido de etapa" />
        <Toggle value={prefs.alertCampaignPerf} onChange={v => set("alertCampaignPerf", v)} label="Rendimiento de campaña" description={`Open rate supera ${prefs.campaignPerfThreshold}%`} />
        {prefs.alertCampaignPerf && (
          <div style={{ padding: "8px 0" }}>
            <Field label="Threshold open rate (%)">
              <input type="number" style={{ ...S.input, width: 100 }} min={1} max={100} value={prefs.campaignPerfThreshold} onChange={e => set("campaignPerfThreshold", parseInt(e.target.value))} />
            </Field>
          </div>
        )}
      </div>

      <SaveBtn saving={saving} onClick={handleSave} label="Guardar notificaciones" />
      <DealAgingSettings />
      <div style={S.card}>
        <DigestScheduleSettings role={notifRole} />
      </div>
    </div>
  );
}

// ─── Tab: Cliente (Portal Editor) ─────────────────────────────────────────────

interface PortalRow {
  id: string;
  token: string;
  contactId: string;
  title: string;
  createdAt: string | number;
  configJson?: string;
  clientCompany?: string | null;
  contactName?: string;
  contactCompany?: string;
}

function TabCliente() {
  const [portals, setPortals] = useState<PortalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; company?: string }[]>([]);
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string; company?: string } | null>(null);
  const [portalTitle, setPortalTitle] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [config, setConfig] = useState<PortalConfig>({ ...DEFAULT_PORTAL_CONFIG, widgets: [...DEFAULT_PORTAL_CONFIG.widgets] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portals");
      if (res.ok) setPortals(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!v.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts?search=${encodeURIComponent(v)}`);
        if (!res.ok) {
          console.warn("[TabCliente] contact search failed", res.status);
          return;
        }
        const data = await res.json();
        const list: { id: string; name: string; company?: string }[] = Array.isArray(data) ? data : (data.contacts || data.data || []);
        setSearchResults(list.slice(0, 6));
      } catch (err) {
        console.warn("[TabCliente] contact search error", err);
      }
    }, 300);
  };

  const resetForm = () => {
    setSearch("");
    setSearchResults([]);
    setSelectedContact(null);
    setPortalTitle("");
    setClientCompany("");
    setConfig({ ...DEFAULT_PORTAL_CONFIG, widgets: [...DEFAULT_PORTAL_CONFIG.widgets] });
    setEditingId(null);
    setEditingToken(null);
  };

  const handleSave = async () => {
    if (!editingId && !selectedContact) {
      toast.error("Selecciona un contacto antes de guardar");
      return;
    }
    if (config.widgets.length === 0) {
      toast.error("Selecciona al menos un widget para el dashboard");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/portals/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: portalTitle || "Portal del Cliente",
            configJson: JSON.stringify(config),
            clientCompany: clientCompany || null,
          }),
        });
        if (res.ok) {
          const savedId = editingId;
          toast.success("Portal actualizado");
          resetForm();
          await load();
          // Highlight the just-saved row and scroll list into view
          setHighlightId(savedId);
          setTimeout(() => {
            listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
          setTimeout(() => setHighlightId(null), 2600);
        } else {
          const data = await res.json() as { error?: string };
          toast.error(data.error || "Error al actualizar portal");
        }
      } else {
        const res = await fetch("/api/portals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: selectedContact!.id,
            title: portalTitle || "Portal del Cliente",
            configJson: JSON.stringify(config),
            clientCompany: clientCompany || null,
          }),
        });
        if (res.ok) {
          const created = await res.json() as { id?: string };
          toast.success("Portal creado");
          resetForm();
          await load();
          if (created?.id) setHighlightId(created.id);
          setTimeout(() => {
            listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
          setTimeout(() => setHighlightId(null), 2600);
        } else {
          const data = await res.json() as { error?: string };
          toast.error(data.error || "Error al crear portal");
        }
      }
    } catch { toast.error("Error de red"); }
    setSaving(false);
  };

  const handleEdit = (p: PortalRow) => {
    setEditingId(p.id);
    setEditingToken(p.token);
    setSelectedContact({ id: p.contactId, name: p.contactName || "Contacto", company: p.contactCompany });
    setSearch(p.contactName || "");
    setPortalTitle(p.title);
    setClientCompany(p.clientCompany || "");
    try {
      const parsed = p.configJson ? JSON.parse(p.configJson) as Partial<PortalConfig> : {};
      setConfig({
        widgets: Array.isArray(parsed.widgets) && parsed.widgets.length > 0 ? parsed.widgets : [...DEFAULT_PORTAL_CONFIG.widgets],
        branding: parsed.branding || {},
        reportCadence: parsed.reportCadence || "monthly",
        kpiTargets: parsed.kpiTargets,
      });
    } catch {
      setConfig({ ...DEFAULT_PORTAL_CONFIG, widgets: [...DEFAULT_PORTAL_CONFIG.widgets] });
    }
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePreview = () => {
    if (!editingId || !editingToken) {
      toast.info("Guarda el portal primero para previsualizarlo");
      return;
    }
    window.open(`/portal/${editingToken}`, "_blank", "noopener,noreferrer");
  };

  const resetWidgetsToDefaults = () => {
    setConfig(prev => ({
      ...prev,
      widgets: [...DEFAULT_PORTAL_CONFIG.widgets],
    }));
    toast.success("Widgets restablecidos");
  };

  // KPI target helpers: store cents internally; surface COP to the user.
  const setKpiTarget = (key: "monthlyRevenueTarget" | "monthlyLeadsTarget" | "pipelineCoverageTarget", value: number | undefined) => {
    setConfig(prev => ({
      ...prev,
      kpiTargets: { ...(prev.kpiTargets || {}), [key]: value },
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este portal?")) return;
    try {
      const res = await fetch(`/api/portals/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Portal eliminado");
        setPortals(p => p.filter(x => x.id !== id));
        if (editingId === id) resetForm();
      } else {
        toast.error("Error al eliminar");
      }
    } catch { toast.error("Error de red"); }
  };

  const copyLink = (token: string, rowId: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(rowId);
      toast.success("Enlace copiado");
      setTimeout(() => setCopiedId(prev => (prev === rowId ? null : prev)), 1800);
    });
  };

  const toggleWidget = (id: string) => {
    setConfig(prev => {
      const has = prev.widgets.includes(id);
      return { ...prev, widgets: has ? prev.widgets.filter(w => w !== id) : [...prev.widgets, id] };
    });
  };

  // Compute requirements from selected widgets
  const requirementIds = (() => {
    const base = new Set<string>(["logo", "brand-colors", "primary-contact", "report-cadence"]);
    for (const wId of config.widgets) {
      const w = PORTAL_WIDGETS.find(x => x.id === wId);
      if (w?.requires) for (const r of w.requires) base.add(r);
    }
    return Array.from(base);
  })();

  const salesWidgets = PORTAL_WIDGETS.filter(w => w.category === "sales");
  const mktWidgets = PORTAL_WIDGETS.filter(w => w.category === "marketing");

  const renderWidgetRow = (widget: typeof PORTAL_WIDGETS[number]) => {
    const enabled = config.widgets.includes(widget.id);
    const isMkt = widget.category === "marketing";
    return (
      <label
        key={widget.id}
        style={{
          display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8,
          border: `1px solid ${enabled ? "rgba(195,154,76,0.3)" : "var(--border)"}`,
          background: enabled
            ? "rgba(195,154,76,0.06)"
            : isMkt ? "rgba(99,102,241,0.06)" : "transparent",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => toggleWidget(widget.id)}
          style={{ accentColor: "#C39A4C", marginTop: 2 }}
        />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{widget.label}</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{widget.description}</div>
        </div>
      </label>
    );
  };

  return (
    <div style={S.section}>
      {/* Top: contact + title + company */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Globe size={14} style={{ color: "var(--muted-foreground)" }} />
          {editingId ? "Editar portal de cliente" : "Crear portal de cliente"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div style={{ position: "relative" }}>
            <span style={S.label}>Contacto</span>
            {selectedContact ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(209,156,21,0.07)", border: "1px solid rgba(209,156,21,0.25)", borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: "var(--foreground)", flex: 1 }}>
                  {selectedContact.name}{selectedContact.company ? ` — ${selectedContact.company}` : ""}
                </span>
                {!editingId && (
                  <button onClick={() => { setSelectedContact(null); setSearch(""); }} style={{ ...S.btn("ghost"), padding: "2px 6px", fontSize: 11 }}>
                    Cambiar
                  </button>
                )}
              </div>
            ) : (
              <>
                <input
                  style={S.input}
                  placeholder="Buscar contacto..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 20, marginTop: 2, overflow: "hidden" }}>
                    {searchResults.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedContact(c); setSearch(c.name); setSearchResults([]); }}
                        style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", textAlign: "left", cursor: "pointer", color: "var(--foreground)", fontSize: 13 }}
                      >
                        {c.name}{c.company ? <span style={{ color: "var(--muted-foreground)", marginLeft: 6 }}>— {c.company}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <span style={S.label}>Título del portal</span>
            <input
              style={S.input}
              placeholder="Portal del Cliente"
              value={portalTitle}
              onChange={e => setPortalTitle(e.target.value)}
            />
            {!portalTitle.trim() && (
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
                Si lo dejas vacío usaremos &quot;Portal del Cliente&quot;.
              </div>
            )}
          </div>
          <div>
            <span style={S.label}>Empresa del cliente</span>
            <input
              style={S.input}
              placeholder="Nombre comercial"
              value={clientCompany}
              onChange={e => setClientCompany(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Dashboard editor 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        {/* LEFT: widget toggles */}
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Módulos del dashboard</div>
            <button
              type="button"
              onClick={resetWidgetsToDefaults}
              style={{ ...S.btn("ghost"), padding: "4px 10px", fontSize: 11 }}
              title="Restablecer widgets a los valores por defecto"
            >
              <RefreshCw size={11} /> Restablecer
            </button>
          </div>
          {config.widgets.length === 0 && (
            <div style={{
              fontSize: 11, color: "#f59e0b",
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
              padding: "8px 10px", borderRadius: 8, marginBottom: 12,
            }}>
              Selecciona al menos un widget para que el portal del cliente muestre contenido.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Ventas</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {salesWidgets.map(renderWidgetRow)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Marketing</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mktWidgets.map(renderWidgetRow)}
              </div>
            </div>
          </div>

          {/* Cadence */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <span style={S.label}>Cadencia de reporte</span>
            <div style={{ display: "flex", gap: 12 }}>
              {(["weekly", "monthly", "quarterly"] as const).map(c => (
                <label key={c} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "var(--foreground)" }}>
                  <input
                    type="radio"
                    name="cadence"
                    checked={config.reportCadence === c}
                    onChange={() => setConfig(prev => ({ ...prev, reportCadence: c }))}
                    style={{ accentColor: "#C39A4C" }}
                  />
                  {c === "weekly" ? "Semanal" : c === "monthly" ? "Mensual" : "Trimestral"}
                </label>
              ))}
            </div>
          </div>

          {/* KPI Targets */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Target size={12} style={{ color: "#C39A4C" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Metas del portal</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 10 }}>
              Opcionales. Se muestran junto a los KPIs del cliente.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <span style={S.label}>Revenue mensual (COP)</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="500000"
                  style={S.input}
                  value={
                    config.kpiTargets?.monthlyRevenueTarget !== undefined
                      ? Math.round((config.kpiTargets.monthlyRevenueTarget) / 100)
                      : ""
                  }
                  onChange={e => {
                    const v = e.target.value.trim();
                    if (v === "") return setKpiTarget("monthlyRevenueTarget", undefined);
                    const n = Number(v);
                    if (!Number.isFinite(n) || n < 0) return;
                    setKpiTarget("monthlyRevenueTarget", Math.round(n * 100));
                  }}
                />
              </div>
              <div>
                <span style={S.label}>Leads / mes</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="25"
                  style={S.input}
                  value={config.kpiTargets?.monthlyLeadsTarget ?? ""}
                  onChange={e => {
                    const v = e.target.value.trim();
                    if (v === "") return setKpiTarget("monthlyLeadsTarget", undefined);
                    const n = Number(v);
                    if (!Number.isFinite(n) || n < 0) return;
                    setKpiTarget("monthlyLeadsTarget", Math.round(n));
                  }}
                />
              </div>
              <div>
                <span style={S.label}>Cobertura pipeline (x)</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="3"
                  style={S.input}
                  value={config.kpiTargets?.pipelineCoverageTarget ?? ""}
                  onChange={e => {
                    const v = e.target.value.trim();
                    if (v === "") return setKpiTarget("pipelineCoverageTarget", undefined);
                    const n = Number(v);
                    if (!Number.isFinite(n) || n < 0) return;
                    setKpiTarget("pipelineCoverageTarget", n);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: requirements checklist */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Lo que necesitamos del cliente</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 12 }}>
            Lista auto-generada según los módulos seleccionados.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {requirementIds.map(rId => {
              const req = REQUIREMENTS_MAP[rId];
              if (!req) return null;
              const isOptional = rId === "kpi-targets";
              return (
                <div
                  key={rId}
                  style={{
                    display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "rgba(215,210,203,0.03)",
                  }}
                >
                  {isOptional
                    ? <Info size={14} style={{ color: "var(--muted-foreground)", marginTop: 2, flexShrink: 0 }} />
                    : <CircleAlert size={14} style={{ color: "#C39A4C", marginTop: 2, flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{req.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{req.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Branding */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Palette size={14} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Apariencia del portal</span>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 4 }}>
            — logo, color y nombre de empresa visibles solo por el cliente
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div>
            <span style={S.label}>Nombre de empresa (portal)</span>
            <input
              style={S.input}
              placeholder="Ej: Acme Corp"
              value={config.branding?.companyName ?? ""}
              onChange={e => setConfig(prev => ({ ...prev, branding: { ...prev.branding, companyName: e.target.value || undefined } }))}
            />
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
              Se muestra en el encabezado del dashboard del cliente.
            </div>
          </div>
          <div>
            <span style={S.label}>URL del logo (SVG o PNG)</span>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                style={{ ...S.input, flex: 1 }}
                placeholder="https://..."
                value={config.branding?.logoUrl ?? ""}
                onChange={e => setConfig(prev => ({ ...prev, branding: { ...prev.branding, logoUrl: e.target.value || undefined } }))}
              />
              {config.branding?.logoUrl && (
                <div style={{ width: 34, height: 34, borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={config.branding.logoUrl} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
              URL pública de la imagen. Dejar vacío para usar el logo de BlackScale.
            </div>
          </div>
          <div>
            <span style={S.label}>Color primario</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                style={{ ...S.input, flex: 1, fontFamily: "monospace", textTransform: "uppercase" }}
                placeholder="#D19C15"
                maxLength={7}
                value={config.branding?.primaryColor ?? ""}
                onChange={e => {
                  const v = e.target.value;
                  setConfig(prev => ({ ...prev, branding: { ...prev.branding, primaryColor: v || undefined } }));
                }}
              />
              <input
                type="color"
                value={config.branding?.primaryColor && /^#[0-9a-fA-F]{6}$/.test(config.branding.primaryColor) ? config.branding.primaryColor : "#D19C15"}
                onChange={e => setConfig(prev => ({ ...prev, branding: { ...prev.branding, primaryColor: e.target.value } }))}
                style={{ width: 34, height: 34, borderRadius: 6, border: "1px solid var(--border)", padding: 2, cursor: "pointer", background: "var(--card)", flexShrink: 0 }}
                title="Elegir color"
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
              Acento de botones y badges en el portal del cliente.
            </div>
          </div>
        </div>
        {(config.branding?.primaryColor && /^#[0-9a-fA-F]{6}$/.test(config.branding.primaryColor)) && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, border: `1px solid ${config.branding.primaryColor}40`, background: `${config.branding.primaryColor}0d`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: config.branding.primaryColor, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: config.branding.primaryColor, fontWeight: 600 }}>
              Vista previa — {config.branding.companyName || "Empresa del cliente"}
            </span>
            {config.branding.logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={config.branding.logoUrl} alt="" style={{ height: 18, objectFit: "contain", marginLeft: "auto", opacity: 0.85 }} />
            )}
          </div>
        )}
      </div>

      {/* Save button */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          style={S.btn("primary")}
          onClick={handleSave}
          disabled={saving || (!editingId && !selectedContact)}
        >
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Globe size={13} />}
          {saving ? (editingId ? "Guardando..." : "Creando...") : (editingId ? "Guardar cambios" : "Crear portal")}
        </button>
        <button
          type="button"
          style={S.btn("outline")}
          onClick={handlePreview}
          disabled={saving}
          title={editingId ? "Abrir el portal en una pestaña nueva" : "Guarda el portal primero para previsualizarlo"}
        >
          <Eye size={13} /> Previsualizar
        </button>
        {editingId && (
          <button style={S.btn("outline")} onClick={resetForm} disabled={saving}>
            Cancelar edición
          </button>
        )}
      </div>

      {/* List */}
      <div ref={listRef} style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Portales existentes</div>
        {loading ? (
          <BSLoading label="Cargando portales…" />
        ) : portals.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--muted-foreground)", fontSize: 13 }}>No hay portales creados</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {portals.map(p => {
              const isHighlight = highlightId === p.id;
              const isCopied = copiedId === p.id;
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px",
                    background: isHighlight ? "rgba(195,154,76,0.14)" : "rgba(215,210,203,0.03)",
                    border: `1px solid ${isHighlight ? "rgba(195,154,76,0.55)" : "var(--border)"}`,
                    borderRadius: 8,
                    transition: "background 0.6s, border-color 0.6s",
                    boxShadow: isHighlight ? "0 0 0 1px rgba(195,154,76,0.25)" : "none",
                  }}
                >
                  <Globe size={14} style={{ color: isHighlight ? "#C39A4C" : "var(--muted-foreground)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {p.clientCompany || p.contactCompany || p.contactName || "Contacto"}
                      {p.contactName && (p.clientCompany || p.contactCompany) ? ` — ${p.contactName}` : ""}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      /portal/{p.token}
                    </div>
                  </div>
                  <button onClick={() => handleEdit(p)} style={S.btn("outline")} title="Editar portal">
                    Editar
                  </button>
                  <button
                    onClick={() => window.open(`/portal/${p.token}`, "_blank", "noopener,noreferrer")}
                    style={S.btn("outline")}
                    title="Abrir portal del cliente"
                  >
                    <Eye size={12} /> Ver
                  </button>
                  <button
                    onClick={() => copyLink(p.token, p.id)}
                    style={{
                      ...S.btn("outline"),
                      ...(isCopied ? { background: "rgba(34,197,94,0.12)", color: "#22c55e", borderColor: "rgba(34,197,94,0.35)" } : {}),
                    }}
                    title="Copiar enlace"
                  >
                    {isCopied ? <><CheckCircle size={12} /> Copiado</> : <><Link2 size={12} /> Copiar enlace</>}
                  </button>
                  <button onClick={() => handleDelete(p.id)} style={S.btn("danger")} title="Eliminar portal">
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode; roles?: string[] }[] = [
  { id: "perfil",         label: "Perfil",          icon: <User size={14} /> },
  { id: "apariencia",     label: "Apariencia",       icon: <Palette size={14} /> },
  { id: "negocio",        label: "Negocio",          icon: <Briefcase size={14} />, roles: ["superadmin","marketing"] },
  { id: "usuarios",       label: "Usuarios",         icon: <Users size={14} />,    roles: ["superadmin"] },
  { id: "objetivos",        label: "Objetivos",          icon: <Target size={14} />,    roles: ["superadmin","marketing"] },
  { id: "scoring",          label: "Scoring ICP",        icon: <BarChart2 size={14} />,  roles: ["superadmin","marketing"] },
  { id: "automatizaciones", label: "Automatizaciones",   icon: <Zap size={14} />,        roles: ["superadmin","marketing"] },
  { id: "campos",           label: "Campos",             icon: <ListPlus size={14} />,   roles: ["superadmin"] },
  { id: "integraciones",    label: "Integraciones",      icon: <Plug size={14} /> },
  { id: "pipeline",         label: "Pipeline",           icon: <Kanban size={14} /> },
  { id: "notificaciones",   label: "Notificaciones",     icon: <Bell size={14} /> },
  { id: "cliente",          label: "Cliente",            icon: <Globe size={14} />,      roles: ["superadmin"] },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || "sales";
  const userId = (session?.user as { id?: string })?.id || "";

  const visibleTabs = TABS.filter(t => !t.roles || t.roles.includes(userRole));
  const [activeTab, setActiveTab] = useState<Tab>("perfil");

  // Honor deep-links like /settings?tab=integraciones and surface the Google connect result.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && TABS.some(t => t.id === tab)) setActiveTab(tab as Tab);
    if (params.get("google") === "connected") toast.success("Google Workspace conectado (Calendar + Gmail)");
    const gErr = params.get("google_error");
    if (gErr) toast.error(`No se pudo conectar Google: ${gErr}`);
    if (tab || params.get("google") || gErr) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const current = visibleTabs.find(t => t.id === activeTab) ? activeTab : visibleTabs[0]?.id ?? "perfil";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Configuración</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Perfil, apariencia, integraciones y preferencias del CRM</p>
      </div>

      <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
        {/* Left vertical nav — every option stays visible, never cut off */}
        <nav style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2, position: "sticky", top: 16 }}>
          {visibleTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 8,
                fontSize: 13, fontWeight: current === t.id ? 600 : 500, cursor: "pointer",
                border: `1px solid ${current === t.id ? "var(--border)" : "transparent"}`,
                background: current === t.id ? "var(--card)" : "transparent",
                color: current === t.id ? "var(--foreground)" : "var(--muted-foreground)",
                width: "100%", textAlign: "left", transition: "all 0.12s",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {current === "perfil"         && <TabPerfil session={session} />}
          {current === "apariencia"     && <TabApariencia />}
          {current === "negocio"        && <TabNegocio role={userRole} />}
          {current === "usuarios"       && <TabUsuarios currentUserId={userId} />}
          {current === "objetivos"        && <SalesTargetsSettings currentUserId={userId} />}
          {current === "scoring"          && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <FitScoringSettings role={userRole} />
              <ScoringWeightsSettings role={userRole} />
            </div>
          )}
          {current === "automatizaciones" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={S.card}>
                <WorkflowTriggers role={userRole} />
              </div>
              <HandoffRulesSettings />
            </div>
          )}
          {current === "campos"         && <div style={S.card}><CustomFieldsSettings /></div>}
          {current === "integraciones"  && <TabIntegraciones role={userRole} />}
          {current === "pipeline"       && <TabPipeline role={userRole} />}
          {current === "notificaciones" && <TabNotificaciones />}
          {current === "cliente"        && <TabCliente />}
        </div>
      </div>
    </div>
  );
}
