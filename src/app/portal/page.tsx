import type { Metadata } from "next";
import { PortalBootstrap } from "@/app/portal/PortalBootstrap";
import { portalMarkup } from "@/app/portal/portal-markup";
import { buildMetadata } from "@/lib/seo";
import { buildSiteUrl, publicSiteUrl } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Members Portal",
    description: "Private BLFSC members portal for secure merchandise ordering and account access.",
    path: "/portal",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

const renderedPortalMarkup = portalMarkup
  .replaceAll("__PUBLIC_SITE_URL__", publicSiteUrl)
  .replaceAll("__PORTAL_URL__", buildSiteUrl("/portal"));

export default function PortalPage() {
  return (
    <>
      <PortalBootstrap />
      <div
        className="portal-body"
        dangerouslySetInnerHTML={{ __html: renderedPortalMarkup }}
        suppressHydrationWarning
      />
    </>
  );
}
