"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Activity,
  Settings,
  Briefcase,
  BarChart3,
  LogOut,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["sales", "marketing", "superadmin"] },
  { href: "/pipeline", label: "Pipeline", icon: Kanban, roles: ["sales", "superadmin"] },
  { href: "/contacts", label: "Contactos", icon: Users, roles: ["sales", "marketing", "superadmin"] },
  { href: "/deals", label: "Deals", icon: Briefcase, roles: ["sales", "superadmin"] },
  { href: "/activities", label: "Actividades", icon: Activity, roles: ["sales", "marketing", "superadmin"] },
  { href: "/marketing", label: "Marketing", icon: Megaphone, roles: ["marketing", "superadmin"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["sales", "marketing", "superadmin"] },
  { href: "/settings", label: "Configuracion", icon: Settings, roles: ["sales", "marketing", "superadmin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] min-h-screen">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-[var(--sidebar-border)]">
        <Briefcase className="h-6 w-6 text-[var(--sidebar-primary)]" />
        <span className="text-lg font-bold tracking-tight">BlackScale Nexus</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems
          .filter((item) => !item.roles || item.roles.includes(role))
          .map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
                    : "text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="px-4 py-4 border-t border-[var(--sidebar-border)] space-y-3">
        {session?.user && (
          <div className="px-1">
            <p className="text-xs font-medium text-[var(--sidebar-foreground)]/80 truncate">
              {session.user.email}
            </p>
            <p className="text-xs text-[var(--sidebar-foreground)]/50 capitalize">{role}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-[var(--sidebar-foreground)]/60 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
