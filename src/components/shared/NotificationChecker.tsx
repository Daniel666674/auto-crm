"use client";

import { useEffect, useCallback } from "react";

export function NotificationChecker() {
  const checkFollowUps = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("crm-notifications") !== "true") return;
    if (Notification.permission !== "granted") return;

    try {
      const res = await fetch("/api/followups");
      const data = await res.json();
      const overdueCount = data.overdue?.length || 0;

      if (overdueCount > 0) {
        new Notification("BlackScale Nexus", {
          body: `Tienes ${overdueCount} seguimiento${overdueCount > 1 ? "s" : ""} vencido${overdueCount > 1 ? "s" : ""}`,
          icon: "/favicon.ico",
          tag: "crm-followup",
        });
      }
    } catch {
      // Silently fail
    }
  }, []);

  const checkAgingDeals = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("crm-notifications") !== "true") return;
    if (Notification.permission !== "granted") return;

    try {
      const res = await fetch("/api/deals/aging");
      if (!res.ok) return;
      const data = await res.json();
      const count = data.deals?.length || 0;
      if (count > 0) {
        const lastTag = localStorage.getItem("crm-aging-last-notified");
        const nowKey = `${new Date().toDateString()}-${count}`;
        if (lastTag === nowKey) return; // already notified today for this count
        localStorage.setItem("crm-aging-last-notified", nowKey);
        new Notification("BlackScale Nexus — Pipeline", {
          body: `${count} deal${count > 1 ? "s" : ""} sin movimiento por más de ${data.agingDays} día${data.agingDays > 1 ? "s" : ""}`,
          icon: "/favicon.ico",
          tag: "crm-aging",
        });
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    checkFollowUps();
    checkAgingDeals();

    const interval = setInterval(() => {
      checkFollowUps();
      checkAgingDeals();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkFollowUps, checkAgingDeals]);

  return null;
}
