"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  items: NavItem[];
};

export function MobileNav({ items }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="btn-secondary px-4 py-2"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close" : "Menu"}
      </button>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/35 transition",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />

      <div
        id="mobile-nav-panel"
        className={cn(
          "fixed right-4 top-20 z-50 w-[min(90vw,22rem)] rounded-[28px] border border-[var(--line)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-soft)] transition",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0",
        )}
      >
        <nav aria-label="Mobile navigation">
          <ul className="space-y-2">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-2xl px-4 py-3 text-base font-semibold transition",
                      active ? "bg-[#2559cf] text-white" : "hover:bg-white/8",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
