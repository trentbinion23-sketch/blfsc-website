export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function isPastEvent(value: string) {
  const eventDate = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate.getTime() < today.getTime();
}

export function isUpcomingEvent(value: string) {
  return !isPastEvent(value);
}
