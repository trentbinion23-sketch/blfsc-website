"use client";

import { useEffect, useState } from "react";

export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextValue = scrollHeight > 0 ? Math.min(100, (scrollTop / scrollHeight) * 100) : 0;
      setProgress(nextValue);
      frame = 0;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1.5 bg-transparent" aria-hidden="true">
      <div
        className="h-full bg-[linear-gradient(90deg,var(--moss),var(--sand),var(--rust))] shadow-[0_0_14px_rgba(45,109,246,0.55)] transition-[width] duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
