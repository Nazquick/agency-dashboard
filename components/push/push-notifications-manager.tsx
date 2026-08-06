"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "dyor_push_banner_dismissed";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

async function subscribe(): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  return res.ok;
}

// Only offers push notifications once the site is running as an installed
// (home-screen) PWA — a regular browser tab never shows this banner, per
// the original ask.
export function PushNotificationsManager() {
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;

    if (Notification.permission === "granted") {
      subscribe();
      return;
    }

    if (Notification.permission === "default" && !localStorage.getItem(DISMISSED_KEY)) {
      queueMicrotask(() => setShowBanner(true));
    }
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await subscribe();
      }
    } finally {
      setLoading(false);
      setShowBanner(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b bg-secondary/60 px-4 py-2 text-sm">
      <span>Get notified when you&apos;re assigned a task.</span>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" disabled={loading} onClick={handleEnable}>
          {loading ? "Enabling…" : "Enable"}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
}
