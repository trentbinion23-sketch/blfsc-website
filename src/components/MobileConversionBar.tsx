"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileConversionBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/portal")) return null;

  return (
    <>
      <div className="h-20 md:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(4,9,20,0.96)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-3">
          <Link
            href="/portal"
            className="btn-primary"
            data-track-event="sticky_mobile_cta_click"
            data-track-location="mobile_conversion_bar"
            data-track-label="Join Members"
          >
            Join Members
          </Link>
          <Link
            href="/contact"
            className="btn-secondary"
            data-track-event="sticky_mobile_cta_click"
            data-track-location="mobile_conversion_bar"
            data-track-label="Contact Club"
          >
            Contact Club
          </Link>
        </div>
      </div>
    </>
  );
}
