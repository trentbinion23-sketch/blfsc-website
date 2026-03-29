import type { MetadataRoute } from "next";
import { buildSiteUrl } from "@/lib/site-config";
import { canonicalPublicPaths } from "@/lib/site-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  return canonicalPublicPaths.map((route) => ({
    url: buildSiteUrl(route),
    lastModified: new Date(),
  }));
}
