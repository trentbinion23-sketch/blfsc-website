import type { Metadata } from "next";
import { publicSiteUrl, siteAssets } from "@/lib/site-config";

const siteName = "BLFSC";
const defaultDescription =
  "BLFSC is B.L.F. Social Club, a motorcycle social club site for rides, events, and members-only merch.";
const defaultImage = siteAssets.logo;

type MetadataOptions = {
  title?: string;
  description?: string;
  path?: string;
};

export function buildMetadata({
  title,
  description = defaultDescription,
  path = "/",
}: MetadataOptions = {}): Metadata {
  const fullTitle = title
    ? `${title} | ${siteName}`
    : `${siteName} | Motorcycle social club, rides, merch, and members`;
  const canonical = `${publicSiteUrl}${path}`;

  return {
    metadataBase: new URL(publicSiteUrl),
    title: fullTitle,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName,
      type: "website",
      images: [
        {
          url: defaultImage,
          width: 512,
          height: 512,
          alt: "BLFSC social club logo",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description,
      images: [defaultImage],
    },
    icons: {
      icon: [{ url: siteAssets.logo, type: "image/png" }],
      apple: [{ url: siteAssets.logo, type: "image/png" }],
      shortcut: [siteAssets.logo],
    },
    manifest: "/manifest.webmanifest",
  };
}
