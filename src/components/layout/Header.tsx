"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Bell, Menu, LogOut, Settings, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileNav } from "./MobileNav";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  const userName = session?.user?.name || "Usuario";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <Sheet>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="md:hidden cursor-pointer" />}
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <MobileNav />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contactos, deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
      </div>

      <Button variant="ghost" size="icon" className="relative cursor-pointer">
        <Bell className="h-5 w-5" />
      </Button>

      {/* User dropdown */}
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px", borderRadius: 8,
            border: "1px solid transparent", background: "transparent",
            cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
        >
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt={userName}
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#C39A4C", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#0a0a0a", fontWeight: 700, fontSize: 12,
              flexShrink: 0,
            }}>{userInitials}</div>
          )}
          <div style={{ textAlign: "left", display: "none" }} className="md:block">
            <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName.split(" ")[0]}
            </div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {dropdownOpen && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)",
            width: 220, background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 50,
            overflow: "hidden",
          }}>
            {/* Profile info */}
            <div style={{
              padding: "14px 16px 12px",
              borderBottom: "1px solid hsl(var(--border))",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userImage} alt={userName} style={{ width: 36, height: 36, borderRadius: "50%" }} />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "#C39A4C", display: "flex", alignItems: "center",
                    justifyContent: "center", color: "#0a0a0a", fontWeight: 700, fontSize: 13,
                  }}>{userInitials}</div>
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>{userName}</div>
                  <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 1 }}>{userEmail}</div>
                </div>
              </div>
              <div style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, display: "inline-block",
                background: "rgba(195,154,76,0.15)", color: "#C39A4C",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {(session?.user as { role?: string })?.role === "superadmin" ? "Admin" :
                  (session?.user as { role?: string })?.role === "marketing" ? "Marketing" : "Sales"}
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: "6px" }}>
              <Link href="/settings" onClick={() => setDropdownOpen(false)} style={{ textDecoration: "none" }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                  borderRadius: 8, width: "100%", border: "none", background: "transparent",
                  color: "hsl(var(--foreground))", fontSize: 13, cursor: "pointer",
                  textAlign: "left", transition: "background 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--muted))"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  Configuración
                </button>
              </Link>

              <Link href="/settings" onClick={() => setDropdownOpen(false)} style={{ textDecoration: "none" }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                  borderRadius: 8, width: "100%", border: "none", background: "transparent",
                  color: "hsl(var(--foreground))", fontSize: 13, cursor: "pointer",
                  textAlign: "left", transition: "background 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--muted))"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  Perfil
                </button>
              </Link>

              <div style={{ margin: "4px 0", borderTop: "1px solid hsl(var(--border))" }} />

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                  borderRadius: 8, width: "100%", border: "none", background: "transparent",
                  color: "#ef4444", fontSize: 13, cursor: "pointer",
                  textAlign: "left", transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
