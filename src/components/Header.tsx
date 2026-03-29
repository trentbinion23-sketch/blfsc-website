"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileNav } from "@/components/MobileNav";
import { siteAssets } from "@/lib/site-config";
import { headerNavItems } from "@/lib/site-routes";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface-strong)] backdrop-blur-xl">
      <div className="page-shell flex items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative hidden h-12 w-12 overflow-hidden rounded-full border border-[var(--line)] bg-white/10 sm:block">
            <Image
              src={siteAssets.logo}
              alt="BLFSC logo"
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="space-y-1">
            <div className="relative h-8 w-[130px] sm:h-10 sm:w-[176px]">
              <Image
                src={siteAssets.wordmark}
                alt="BLFSC"
                fill
                sizes="176px"
                priority
                className="object-contain object-left"
              />
            </div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)] sm:text-xs">
              B.L.F. Social Club
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {headerNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-[var(--moss)] text-white shadow-[0_8px_24px_var(--ring)]"
                    : "text-[var(--foreground)] hover:bg-white/8 hover:text-white",
                )}
                data-track-event="nav_click"
                data-track-location="header_nav"
                data-track-label={item.label}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <MobileNav items={[...headerNavItems]} />
      </div>
    </header>
  );
}
