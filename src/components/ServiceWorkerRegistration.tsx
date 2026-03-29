"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    const cleanupServiceWorkers = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        } catch {
          // Ignore client cleanup failures and keep the site usable.
        }
      }

      if ("caches" in window) {
        try {
          const cacheNames = await window.caches.keys();
          await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
        } catch {
          // Ignore cache cleanup failures and keep the site usable.
        }
      }
    };

    void cleanupServiceWorkers();
  }, []);

  return null;
}
