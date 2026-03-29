import type { NavItem } from "@/lib/types";

type CanonicalRedirect = {
  source: string;
  destination: string;
};

export const headerNavItems = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Members", href: "/portal" },
] as const satisfies readonly NavItem[];

export const footerNavItems = [
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Contact", href: "/contact" },
  { label: "Members", href: "/portal" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const satisfies readonly NavItem[];

export const canonicalPublicPaths = [
  "/",
  "/about",
  "/events",
  "/merch",
  "/contact",
  "/privacy",
  "/terms",
] as const;

export const canonicalAppPaths = [...canonicalPublicPaths, "/portal"] as const;

export const retiredPathRedirects = [
  { source: "/chapters", destination: "/about" },
] as const satisfies readonly CanonicalRedirect[];

export const legacyHtmlRedirects = [
  { source: "/index.html", destination: "/" },
  { source: "/about.html", destination: "/about" },
  { source: "/events.html", destination: "/events" },
  { source: "/merch.html", destination: "/merch" },
  { source: "/contact.html", destination: "/contact" },
  { source: "/portal.html", destination: "/portal" },
  { source: "/chapters.html", destination: "/about" },
  { source: "/privacy.html", destination: "/privacy" },
  { source: "/terms.html", destination: "/terms" },
] as const satisfies readonly CanonicalRedirect[];

export const canonicalRedirects = [
  ...retiredPathRedirects,
  ...legacyHtmlRedirects,
] as const satisfies readonly CanonicalRedirect[];
