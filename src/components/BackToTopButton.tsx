"use client";

import { useEffect, useState } from "react";

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 540);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      className="fixed bottom-24 right-4 z-40 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[var(--sand)] md:bottom-6 md:right-6"
      onClick={() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }}
    >
      Top
    </button>
  );
}
