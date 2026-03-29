"use client";

import { useEffect } from "react";

export function PortalBootstrap() {
  useEffect(() => {
    void import("./portal-runtime.js").catch((error) => {
      console.error("Portal runtime failed to load", error);
      const status = document.getElementById("auth-status");
      if (status) {
        status.textContent = "Portal is temporarily unavailable. Please try again shortly.";
      }
    });
  }, []);

  return <span id="portal-bootstrap-anchor" hidden aria-hidden="true" />;
}
