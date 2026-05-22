"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";

interface SearchContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  temperature: string;
}

interface SearchDeal {
  id: string;
  title: string;
  value: number;
  stageName: string | null;
}

interface SearchResults {
  contacts: SearchContact[];
  deals: SearchDeal[];
}

const TEMP_COLOR: Record<string, string> = {
  hot: "#ef4444",
  warm: "#f59e0b",
  cold: "var(--muted-foreground)",
};

const QUICK_LINKS = [
  { label: "Nuevo contacto", desc: "Ir a Contactos", href: "/contacts", icon: "+" },
  { label: "Pipeline de ventas", desc: "Ver pipeline", href: "/pipeline", icon: "◆" },
  { label: "Calendario", desc: "Ver calendario", href: "/calendar", icon: "▦" },
  { label: "Secuencias", desc: "Email sequences", href: "/sequences", icon: "⇆" },
  { label: "Campañas", desc: "Email campaigns", href: "/campaigns", icon: "✉" },
  { label: "Ajustes", desc: "Configuración", href: "/settings", icon: "⚙" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ contacts: [], deals: [] });
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults({ contacts: [], deals: [] });
      setCursor(0);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults({ contacts: [], deals: [] }); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  const items = query.length >= 2
    ? [
        ...results.contacts.map(c => ({
          key: `c_${c.id}`,
          label: c.name,
          desc: [c.company, c.email].filter(Boolean).join(" · "),
          badge: c.temperature,
          href: `/contacts/${c.id}`,
          type: "contact" as const,
        })),
        ...results.deals.map(d => ({
          key: `d_${d.id}`,
          label: d.title,
          desc: d.stageName ?? "",
          badge: formatCurrency(d.value),
          href: `/deals/${d.id}`,
          type: "deal" as const,
        })),
      ]
    : QUICK_LINKS.map(l => ({ key: l.href, label: l.label, desc: l.desc, badge: "", href: l.href, icon: l.icon, type: "link" as const }));

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, items.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && items[cursor]) go(items[cursor].href);
  };

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{ width: "100%", maxWidth: 560, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 16, color: "var(--muted-foreground)" }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKey}
            placeholder="Buscar contactos, deals, páginas…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 15, color: "var(--foreground)" }}
          />
          {loading && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>…</span>}
          <kbd style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", color: "var(--muted-foreground)", background: "var(--background)" }}>esc</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {items.length === 0 && query.length >= 2 && !loading && (
            <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Sin resultados para "{query}"</div>
          )}
          {items.length === 0 && query.length < 2 && (
            <div style={{ padding: "8px 0" }}>
              <div style={{ padding: "6px 18px", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Accesos rápidos</div>
              {QUICK_LINKS.map((l, i) => (
                <button key={l.href} onClick={() => go(l.href)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", background: i === cursor ? "var(--primary)15" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={() => setCursor(i)}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{l.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{l.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{l.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {items.length > 0 && query.length >= 2 && (
            <div style={{ padding: "8px 0" }}>
              {results.contacts.length > 0 && (
                <div style={{ padding: "6px 18px 2px", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Contactos</div>
              )}
              {results.contacts.map((c, idx) => (
                <button key={c.id} onClick={() => go(`/contacts/${c.id}`)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", background: idx === cursor ? "var(--primary)15" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={() => setCursor(idx)}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, color: "var(--foreground)" }}>
                    {c.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{[c.company, c.email].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: TEMP_COLOR[c.temperature] ?? "var(--muted-foreground)" }}>
                    {c.temperature === "hot" ? "Caliente" : c.temperature === "warm" ? "Tibio" : "Frío"}
                  </span>
                </button>
              ))}
              {results.deals.length > 0 && (
                <div style={{ padding: "8px 18px 2px", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Deals</div>
              )}
              {results.deals.map((d, idx) => {
                const i = results.contacts.length + idx;
                return (
                  <button key={d.id} onClick={() => go(`/deals/${d.id}`)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", background: i === cursor ? "var(--primary)15" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={() => setCursor(i)}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>◆</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{d.title}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{d.stageName}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>{formatCurrency(d.value)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding: "8px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 16, fontSize: 10, color: "var(--muted-foreground)" }}>
          <span><kbd style={{ fontSize: 10, padding: "1px 4px", borderRadius: 3, border: "1px solid currentColor" }}>↑↓</kbd> navegar</span>
          <span><kbd style={{ fontSize: 10, padding: "1px 4px", borderRadius: 3, border: "1px solid currentColor" }}>↵</kbd> abrir</span>
          <span><kbd style={{ fontSize: 10, padding: "1px 4px", borderRadius: 3, border: "1px solid currentColor" }}>esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}
