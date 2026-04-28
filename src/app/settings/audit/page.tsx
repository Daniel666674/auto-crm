"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Shield, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/constants";

const ACTIONS = [
  "login_success", "login_failed", "contact_viewed", "contact_edited",
  "contact_deleted", "data_exported", "deal_created", "deal_edited",
  "deal_stage_changed", "settings_accessed",
];

interface AuditRow {
  id: string;
  userName: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: number | string;
}

export default function AuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (action) params.set("action", action);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then((d) => { setRows(d.rows ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [page, action, from, to]);

  useEffect(() => { load(); }, [load]);

  if (status === "loading") return null;
  if (status === "authenticated" && session.user.role !== "sales" && session.user.role !== "superadmin") {
    router.replace("/");
    return null;
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6" /> Auditoría
        </h1>
        <p className="text-muted-foreground">Registro de actividad del sistema — {total} eventos</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Acción</label>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Desde</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Hasta</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setAction(""); setFrom(""); setTo(""); setPage(1); }}>
          Limpiar filtros
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuario</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Acción</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entidad</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Sin registros</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDate(typeof row.createdAt === "number" ? new Date(row.createdAt * 1000) : new Date(row.createdAt))}
                </td>
                <td className="px-4 py-3">{row.userName}</td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full px-2 py-0.5 text-xs bg-muted text-foreground font-mono">
                    {row.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.entityType && <span>{row.entityType}{row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ""}</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
