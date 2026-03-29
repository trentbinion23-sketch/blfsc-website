/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { Event } from "@/lib/types";
import { formatLongDate } from "@/lib/utils";

type EventCardProps = {
  event: Event;
};

export function EventCard({ event }: EventCardProps) {
  return (
    <article className="card-surface overflow-hidden">
      <div className="relative aspect-[4/3] bg-[rgba(255,255,255,0.04)]">
        <img
          src={event.image}
          alt={event.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-[rgba(4,9,20,0.9)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sand)]">
          {event.tag}
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-[var(--sand)]">
          <span>{formatLongDate(event.date)}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--moss)]" />
          <span>{event.time}</span>
        </div>
        <div>
          <h3 className="text-3xl leading-none">{event.title}</h3>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            {event.location}
          </p>
        </div>
        <p className="text-base leading-7">{event.excerpt}</p>
        <Link
          href="/contact"
          className="btn-text"
          data-track-event="cta_contact_click"
          data-track-location="event_card"
          data-track-label={event.title}
        >
          Ride details
          <span aria-hidden="true">-&gt;</span>
        </Link>
      </div>
    </article>
  );
}
