"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Standalone routes render with no CRM chrome (no sidebar/header).
  // Portals are client-facing and must NEVER expose the internal CRM.
  if (pathname === "/login" || pathname.startsWith("/portal")) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 bg-background overflow-auto">
          {children}
        </main>
      </div>
    </>
  );
}
