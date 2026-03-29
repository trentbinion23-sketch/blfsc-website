"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

type TrackableElement = HTMLElement & {
  dataset: {
    trackEvent?: string;
    trackLocation?: string;
    trackLabel?: string;
  };
};

export function AnalyticsProvider() {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
    if (!posthogKey) return;

    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
    });

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const node = target?.closest("[data-track-event]") as TrackableElement | null;
      if (!node?.dataset.trackEvent) return;
      posthog.capture(node.dataset.trackEvent, {
        location: node.dataset.trackLocation || "unknown",
        label: node.dataset.trackLabel || node.textContent?.trim() || "unknown",
      });
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
