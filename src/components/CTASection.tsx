import Link from "next/link";
import type { ReactNode } from "react";

type Action = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
  trackEvent?: string;
  trackLocation?: string;
};

type CTASectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions: Action[];
  children?: ReactNode;
};

export function CTASection({ eyebrow, title, description, actions, children }: CTASectionProps) {
  return (
    <section className="page-shell section-space">
      <div className="card-surface overflow-hidden bg-[linear-gradient(135deg,rgba(4,9,20,0.98),rgba(11,23,44,0.95))] px-7 py-10 text-white sm:px-10 sm:py-12 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <p className="eyebrow text-[var(--sand)]">{eyebrow}</p>
            <h2 className="text-balance text-3xl leading-none sm:text-4xl lg:text-5xl">{title}</h2>
            <p className="max-w-2xl text-base leading-7 text-white/72 sm:text-lg">{description}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {actions.map((action) => (
                <Link
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  className={action.variant === "secondary" ? "btn-secondary" : "btn-primary"}
                  data-track-event={action.trackEvent}
                  data-track-location={action.trackLocation || "cta_section"}
                  data-track-label={action.label}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
          {children ? (
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-6">{children}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
