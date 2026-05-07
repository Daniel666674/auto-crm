"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function PushManager() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        // Check if already subscribed
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        // Request permission
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
      })
      .catch(() => { /* SW not supported or blocked */ });
  }, [status]);

  return null;
}

