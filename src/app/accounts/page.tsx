import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import { buildAccountSummaries } from "../api/accounts/route";
import { AccountsTable } from "@/components/accounts/AccountsTable";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const accounts = buildAccountSummaries();

  const totalPipeline = accounts.reduce((s, a) => s + a.pipelineValue, 0);
  const totalWon = accounts.reduce((s, a) => s + a.wonValue, 0);
  const totalContacts = accounts.reduce((s, a) => s + a.contactCount, 0);

  const rows = accounts.map(a => ({
    company: a.company,
    contactCount: a.contactCount,
    industry: a.industry,
    pipelineValue: a.pipelineValue,
    wonValue: a.wonValue,
    openDealsCount: a.openDealsCount,
    lastActivityAt: a.lastActivityAt,
    pipelineLabel: formatCurrency(a.pipelineValue),
    wonLabel: formatCurrency(a.wonValue),
  }));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
          Cuentas (vista por empresa)
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          Vista B2B: contactos agrupados por empresa
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <SummaryCard label="Empresas" value={String(accounts.length)} />
        <SummaryCard label="Contactos totales" value={String(totalContacts)} />
        <SummaryCard label="Pipeline" value={formatCurrency(totalPipeline)} accent="var(--primary)" />
        <SummaryCard label="Cerrado ganado" value={formatCurrency(totalWon)} accent="#22c55e" />
      </div>

      {accounts.length === 0 ? (
        <div style={{
          borderRadius: 10,
          padding: "48px 24px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Sin cuentas todavía
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Crea contactos con el campo &ldquo;empresa&rdquo; para agruparlos por cuenta.
          </div>
        </div>
      ) : (
        <AccountsTable rows={rows} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
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
