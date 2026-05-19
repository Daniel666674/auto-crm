import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import { loadAccountDetail } from "../../api/accounts/[name]/route";
import { AccountDetailNav } from "@/components/accounts/AccountDetailNav";

export const dynamic = "force-dynamic";

const TEMP_CFG: Record<string, { label: string; color: string; bg: string }> = {
  hot: { label: "Caliente", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  warm: { label: "Tibio", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  cold: { label: "Frío", color: "var(--muted-foreground)", bg: "rgba(255,255,255,0.06)" },
};

const LIFECYCLE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  subscriber: { label: "Suscriptor", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  lead: { label: "Lead", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  MQL: { label: "MQL", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  SQL: { label: "SQL", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  opportunity: { label: "Oportunidad", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  customer: { label: "Cliente", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  evangelist: { label: "Evangelista", color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
};

function fDate(ts: number | null): string {
  if (!ts || !Number.isFinite(ts)) return "—";
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtRelative(ts: number | null): string {
  if (!ts || !Number.isFinite(ts)) return "—";
  const diff = Date.now() - ts;
  if (diff < 0) return "Hoy";
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
  if (days < 365) return `Hace ${Math.floor(days / 30)} m`;
  return `Hace ${Math.floor(days / 365)} a`;
}

function computeHealth(detail: NonNullable<ReturnType<typeof loadAccountDetail>>): {
  score: number;
  label: string;
  color: string;
} {
  const { contacts: cs, summary } = detail;
  const hot = cs.filter(c => c.temperature === "hot").length;
  const warm = cs.filter(c => c.temperature === "warm").length;
  const cold = cs.filter(c => c.temperature === "cold").length;
  const total = cs.length || 1;
  const warmRatio = (hot + warm) / total;
  const coldRatio = cold / total;
  // 10M COP threshold = 1_000_000_000 cents
  const HIGH_PIPELINE = 1_000_000_000;
  const pipelineOk = summary.pipelineValue > HIGH_PIPELINE;

  let score = 5;
  if (warmRatio >= 0.8 && pipelineOk) score = 9;
  else if (warmRatio >= 0.8) score = 8;
  else if (warmRatio >= 0.5 && pipelineOk) score = 8;
  else if (warmRatio >= 0.5) score = 7;
  else if (warmRatio >= 0.3) score = 6;
  else if (coldRatio > 0.7) score = 3;
  else score = 5;

  const color = score >= 8 ? "#22c55e" : score >= 6 ? "#f59e0b" : "#ef4444";
  const label = score >= 8 ? "Saludable" : score >= 6 ? "Estable" : "En riesgo";
  return { score, label, color };
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { name: rawName } = await params;
  const decoded = decodeURIComponent(rawName);
  const detail = loadAccountDetail(decoded);
  if (!detail) notFound();

  const { summary, contacts: contactRows, deals: dealRows, activities: activityRows } = detail;
  const health = computeHealth(detail);

  const openDeals = dealRows.filter(d => !d.isWon && !d.isLost);
  const wonDeals = dealRows.filter(d => d.isWon);

  return (
    <div>
      <AccountDetailNav />

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
          {summary.company}
        </h1>
        <div style={{
          fontSize: 13,
          color: "var(--muted-foreground)",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}>
          <span>{summary.contactCount} contacto{summary.contactCount !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{summary.industry ?? "Sin industria"}</span>
          <span>·</span>
          <span style={{ color: "var(--primary)", fontWeight: 600 }}>
            {formatCurrency(summary.pipelineValue)} pipeline
          </span>
          <span>·</span>
          <span style={{ color: health.color, fontWeight: 600 }}>
            Health {health.score}/10 · {health.label}
          </span>
          {summary.lastActivityAt && (
            <>
              <span>·</span>
              <span>Última actividad {fmtRelative(summary.lastActivityAt)}</span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
        <StatCard label="Pipeline abierto" value={formatCurrency(summary.pipelineValue)} accent="var(--primary)" />
        <StatCard label="Cerrado ganado" value={formatCurrency(summary.wonValue)} accent="#22c55e" />
        <StatCard label="Deals abiertos" value={String(summary.openDealsCount)} />
        <StatCard label="Score total" value={String(summary.totalScore)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
        {/* Contacts */}
        <div style={{
          borderRadius: 10,
          padding: "16px 18px",
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            Contactos ({contactRows.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {contactRows.map(c => {
              const temp = TEMP_CFG[c.temperature] ?? TEMP_CFG.cold;
              const lc = LIFECYCLE_CFG[c.lifecycleStage ?? "lead"] ?? LIFECYCLE_CFG.lead;
              return (
                <a
                  key={c.id}
                  href={`/contacts/${c.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 7,
                    background: "transparent",
                    border: "1px solid var(--border)",
                    textDecoration: "none",
                    color: "var(--foreground)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title || "—"}{c.email ? ` · ${c.email}` : ""}
                    </div>
                  </div>
                  <span style={{
                    padding: "2px 7px",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 600,
                    background: lc.bg,
                    color: lc.color,
                    whiteSpace: "nowrap",
                  }}>
                    {lc.label}
                  </span>
                  <span style={{
                    padding: "3px 8px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: temp.bg,
                    color: temp.color,
                    whiteSpace: "nowrap",
                  }}>
                    {temp.label}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", width: 30, textAlign: "right" }}>
                    {c.score}
                  </span>
                </a>
              );
            })}
            {contactRows.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sin contactos</div>
            )}
          </div>
        </div>

        {/* Deals */}
        <div style={{
          borderRadius: 10,
          padding: "16px 18px",
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            Deals ({dealRows.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...openDeals, ...wonDeals].map(d => (
              <a
                key={d.id}
                href={`/deals/${d.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 7,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                  color: "var(--foreground)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {d.contactName} · {fDate(d.expectedClose)}
                  </div>
                </div>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 600,
                  background: `${d.stageColor}22`,
                  color: d.stageColor,
                  whiteSpace: "nowrap",
                }}>
                  {d.stageName}
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: d.isWon ? "#22c55e" : "var(--primary)",
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 90,
                  textAlign: "right",
                }}>
                  {formatCurrency(d.value)}
                </span>
              </a>
            ))}
            {dealRows.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sin deals</div>
            )}
          </div>
        </div>
      </div>

      {/* Activity timeline */}
      <div style={{
        borderRadius: 10,
        padding: "16px 18px",
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          Actividad reciente
        </h3>
        {activityRows.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sin actividad registrada.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {activityRows.map(a => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 12,
                }}
              >
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  alignSelf: "flex-start",
                }}>
                  {a.type}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "var(--foreground)" }}>{a.description}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                    {a.contactName} · {fmtRelative(a.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      borderRadius: 10,
      padding: "14px 18px",
      background: "var(--card)",
      border: "1px solid var(--border)",
    }}>
      <div style={{
        fontSize: 11,
        color: "var(--muted-foreground)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent || "var(--foreground)" }}>
        {value}
      </div>
    </div>
  );
}
