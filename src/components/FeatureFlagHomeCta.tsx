"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

const HOME_PORTAL_PRIORITY_FLAG = "home_portal_priority";

export function FeatureFlagHomeCta() {
  const [portalPriority, setPortalPriority] = useState(false);

  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
    if (!posthogKey) return;

    const syncFlags = () => {
      setPortalPriority(Boolean(posthog.isFeatureEnabled(HOME_PORTAL_PRIORITY_FLAG)));
    };

    posthog.onFeatureFlags(syncFlags);
    syncFlags();
  }, []);

  const href = portalPriority ? "/portal" : "/events";
  const label = portalPriority ? "Jump to member access" : "Explore upcoming rides";
  const description = portalPriority
    ? "Feature flag ON: prioritize member sign-in and private club actions."
    : "Feature flag OFF: prioritize events and discovery for public visitors.";

  return (
    <div className="card-surface interactive-card p-6 sm:p-7">
      <p className="eyebrow text-[var(--sand)]">Smart homepage priority</p>
      <h2 className="mt-3 text-3xl leading-none sm:text-4xl">Adaptive primary path</h2>
      <p className="mt-4 max-w-3xl text-base leading-7">{description}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={href}
          className="btn-primary"
          data-track-event="feature_flag_home_primary_click"
          data-track-location="home_feature_flag_cta"
          data-track-label={label}
        >
          {label}
        </Link>
        <p className="text-sm text-white/70">
          Toggle in PostHog feature flags using key <code>home_portal_priority</code>.
        </p>
      </div>
    </div>
  );
}
