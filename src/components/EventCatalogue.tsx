"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { EventCard } from "@/components/EventCard";
import type { Event } from "@/lib/types";
import { cn, isPastEvent, isUpcomingEvent } from "@/lib/utils";

type EventCatalogueProps = {
  events: Event[];
};

const filters = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Past", value: "past" },
] as const;

export function EventCatalogue({ events }: EventCatalogueProps) {
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");

  const visibleEvents = useMemo(() => {
    if (filter === "upcoming") return events.filter((event) => isUpcomingEvent(event.date));
    if (filter === "past") return events.filter((event) => isPastEvent(event.date));
    return events;
  }, [events, filter]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            className={cn("chip-button", filter === item.value && "chip-button-active")}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visibleEvents.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No events match that view."
          description="Try another filter or check back soon for fresh ride dates and social nights."
        />
      )}
    </div>
  );
}
