import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { NotificationChecker } from "@/components/shared/NotificationChecker";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AppShell } from "@/components/shared/AppShell";
import { PrivacyPolicyModal } from "@/components/shared/PrivacyPolicyModal";
import { PushManager } from "@/components/shared/PushManager";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BlackScale Nexus CRM",
  description: "Sistema CRM de BlackScale Consulting",
  manifest: "/manifest.json",
  themeColor: "#1e293b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full flex" suppressHydrationWarning>
        <SessionProvider>
          <TooltipProvider>
            <AppShell>
              {children}
            </AppShell>
            <Toaster />
            <NotificationChecker />
            <PrivacyPolicyModal />
            <PushManager />
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
