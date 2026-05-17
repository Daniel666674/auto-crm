"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { NotificationToggle } from "@/components/shared/NotificationToggle";
import { useSession, signOut } from "next-auth/react";
import {
  RefreshCw, CheckCircle, AlertCircle, LogOut, Copy,
  User, Palette, Briefcase, Users, Plug, Kanban, Bell, Lock,
  Upload, Eye, EyeOff, Target, BarChart2,
} from "lucide-react";
import { CloseReasonsSettings } from "@/components/settings/CloseReasonsSettings";
import { SalesTargetsSettings } from "@/components/settings/SalesTargetsSettings";
import { DealAgingSettings } from "@/components/settings/DealAgingSettings";
import { ScoringWeightsSettings } from "@/components/settings/ScoringWeightsSettings";
import { SlackSettings } from "@/components/settings/SlackSettings";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "perfil" | "apariencia" | "negocio" | "usuarios" | "integraciones" | "pipeline" | "notificaciones" | "objetivos" | "scoring" | "cliente";

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
      // Apply immediately
      const root = document.documentElement;
      if (prefs.theme === "light") { root.classList.remove("dark"); root.classList.add("light"); }
      else { root.classList.remove("light"); root.classList.add("dark"); }
      root.style.setProperty("--accent-primary", prefs.accentPrimary);
      root.style.setProperty("--accent-secondary", prefs.accentSecondary);
      root.style.setProperty("--text-primary", prefs.textColor);
      root.style.setProperty("--sidebar-bg-custom", prefs.sidebarBg);
      const radiusMap: Record<string, string> = { sharp: "2px", rounded: "8px", pill: "999px" };
      root.style.setProperty("--border-radius-base", radiusMap[prefs.borderRadius] ?? "8px");
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

  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Cargando…</div>;

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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
              <Field label="Accent primario">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={prefs.accentPrimary} onChange={e => set("accentPrimary", e.target.value)} style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer", borderRadius: 6 }} />
                  <input style={{ ...S.input, flex: 1 }} value={prefs.accentPrimary} onChange={e => set("accentPrimary", e.target.value)} />
                </div>
              </Field>
              <Field label="Accent secundario">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={prefs.accentSecondary} onChange={e => set("accentSecondary", e.target.value)} style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer", borderRadius: 6 }} />
                  <input style={{ ...S.input, flex: 1 }} value={prefs.accentSecondary} onChange={e => set("accentSecondary", e.target.value)} />
                </div>
              </Field>
              <Field label="Color de texto">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={prefs.textColor} onChange={e => set("textColor", e.target.value)} style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer", borderRadius: 6 }} />
                  <input style={{ ...S.input, flex: 1 }} value={prefs.textColor} onChange={e => set("textColor", e.target.value)} />
                </div>
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
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={prefs.sidebarBg} onChange={e => set("sidebarBg", e.target.value)} style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer", borderRadius: 6 }} />
                <input style={S.input} value={prefs.sidebarBg} onChange={e => set("sidebarBg", e.target.value)} />
              </div>
            )}
            {prefs.sidebarBgType === "gradient" && (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input type="color" value={prefs.sidebarBg} onChange={e => set("sidebarBg", e.target.value)} style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer" }} />
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>→</span>
                <input type="color" value={prefs.accentSecondary} onChange={e => set("accentSecondary", e.target.value)} style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer" }} />
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
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>Cargando…</div>
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

  useEffect(() => {
    fetch("/api/ga4")
      .then(r => r.json())
      .then(d => setGa4Connected(d.error !== "ga4_not_connected"))
      .catch(() => setGa4Connected(false));
    fetch("/api/settings/integrations-status")
      .then(r => r.json())
      .then(d => setEnvStatus(d))
      .catch(() => {});
  }, []);

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
    </div>
  );
}

// ─── Tab: Notificaciones ──────────────────────────────────────────────────────

function TabNotificaciones() {
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
    </div>
  );
}

// ─── Tab: Cliente (placeholder) ───────────────────────────────────────────────

function TabCliente() {
  return (
    <div style={{ ...S.card, position: "relative", overflow: "hidden", minHeight: 320 }}>
      <div style={{ filter: "blur(3px)", opacity: 0.35, pointerEvents: "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          {["Contactos activos","Campañas activas","Pipeline value"].map(t => (
            <div key={t} style={{ background: "rgba(195,154,76,0.08)", border: "1px solid rgba(195,154,76,0.15)", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>{t}</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>—</div>
            </div>
          ))}
        </div>
        <div style={{ height: 120, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid var(--border)" }} />
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(195,154,76,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Lock size={22} style={{ color: "#C39A4C" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Vista de Cliente</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 360, lineHeight: 1.6 }}>
            Comparte el rendimiento de estrategia con tus clientes en un dashboard personalizado. Próximamente.
          </div>
        </div>
        <button style={S.btn("outline")} onClick={() => toast.info("Te notificaremos cuando esté disponible.")}>
          Notificarme cuando esté listo
        </button>
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
  { id: "objetivos",      label: "Objetivos",        icon: <Target size={14} />,   roles: ["superadmin","marketing"] },
  { id: "scoring",        label: "Scoring ICP",      icon: <BarChart2 size={14} />, roles: ["superadmin","marketing"] },
  { id: "integraciones",  label: "Integraciones",    icon: <Plug size={14} /> },
  { id: "pipeline",       label: "Pipeline",         icon: <Kanban size={14} /> },
  { id: "notificaciones", label: "Notificaciones",   icon: <Bell size={14} /> },
  { id: "cliente",        label: "Cliente",          icon: <Lock size={14} />,     roles: ["superadmin"] },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || "sales";
  const userId = (session?.user as { id?: string })?.id || "";

  const visibleTabs = TABS.filter(t => !t.roles || t.roles.includes(userRole));
  const [activeTab, setActiveTab] = useState<Tab>("perfil");

  const current = visibleTabs.find(t => t.id === activeTab) ? activeTab : visibleTabs[0]?.id ?? "perfil";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Configuración</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>Perfil, apariencia, integraciones y preferencias del CRM</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {visibleTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "8px 16px", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 500,
              cursor: "pointer", border: "1px solid transparent", display: "flex", alignItems: "center", gap: 6,
              background: current === t.id ? "var(--card)" : "transparent",
              color: current === t.id ? "var(--foreground)" : "var(--muted-foreground)",
              borderColor: current === t.id ? "var(--border)" : "transparent",
              borderBottomColor: current === t.id ? "var(--card)" : "transparent",
              marginBottom: current === t.id ? -1 : 0,
              transition: "all 0.12s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {current === "perfil"         && <TabPerfil session={session} />}
      {current === "apariencia"     && <TabApariencia />}
      {current === "negocio"        && <TabNegocio role={userRole} />}
      {current === "usuarios"       && <TabUsuarios currentUserId={userId} />}
      {current === "objetivos"      && <SalesTargetsSettings currentUserId={userId} />}
      {current === "scoring"        && <ScoringWeightsSettings role={userRole} />}
      {current === "integraciones"  && <TabIntegraciones role={userRole} />}
      {current === "pipeline"       && <TabPipeline role={userRole} />}
      {current === "notificaciones" && <TabNotificaciones />}
      {current === "cliente"        && <TabCliente />}
    </div>
  );
}
