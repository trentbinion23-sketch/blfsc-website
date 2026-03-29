import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type HeroAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
  trackEvent?: string;
  trackLocation?: string;
};

type HeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions: HeroAction[];
  aside?: ReactNode;
};

export function Hero({ eyebrow, title, description, actions, aside }: HeroProps) {
  return (
    <section className="page-shell section-space">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <div className="card-surface interactive-card image-panel relative overflow-hidden border-[var(--line)] bg-[linear-gradient(135deg,rgba(7,14,26,0.98),rgba(5,12,22,0.94))] p-7 text-white sm:p-10 lg:p-12">
          <div className="absolute inset-0">
            <Image
              src="/images/storm-website.webp"
              alt=""
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="image-panel-media object-cover opacity-20 mix-blend-screen"
              priority
            />
            <div className="image-panel-overlay absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,109,246,0.26),transparent_38%),linear-gradient(135deg,rgba(4,9,20,0.9),rgba(7,14,26,0.7))]" />
          </div>
          <div className="relative max-w-2xl space-y-6">
            <p className="eyebrow text-[var(--sand)]">{eyebrow}</p>
            <h1 className="text-balance text-4xl leading-none sm:text-5xl lg:text-6xl">{title}</h1>
            <p className="readable-copy max-w-xl text-base leading-8 text-white/74 sm:text-lg">
              {description}
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              {actions.map((action) => (
                <Link
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  className={action.variant === "secondary" ? "btn-secondary" : "btn-primary"}
                  data-track-event={action.trackEvent}
                  data-track-location={action.trackLocation || "hero"}
                  data-track-label={action.label}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="card-surface overflow-hidden bg-[linear-gradient(180deg,rgba(4,9,20,0.98),rgba(12,22,39,0.94))] p-6 text-white sm:p-8">
          {aside}
        </div>
      </div>
    </section>
  );
}
