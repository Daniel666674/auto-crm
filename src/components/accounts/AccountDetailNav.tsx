"use client";
import { useRouter } from "next/navigation";

export function AccountDetailNav() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/accounts")}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 8, marginBottom: 18,
        border: "1px solid var(--border)", background: "var(--card)",
        fontSize: 12, color: "var(--muted-foreground)", cursor: "pointer",
      }}
    >
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="m15 18-6-6 6-6"/>
      </svg>
      Cuentas
    </button>
  );
}
