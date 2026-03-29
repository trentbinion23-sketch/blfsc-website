import { CTASection } from "@/components/CTASection";
import { getPublicSiteContent } from "@/lib/site-content";

export async function PortalPromo() {
  const siteContent = await getPublicSiteContent();
  const content = siteContent.portalPromo;

  return (
    <CTASection
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      actions={[
        {
          href: "/portal",
          label: content.primaryLabel,
          trackEvent: "cta_portal_click",
          trackLocation: "portal_promo",
        },
        {
          href: "/contact",
          label: content.secondaryLabel,
          variant: "secondary",
          trackEvent: "cta_contact_click",
          trackLocation: "portal_promo",
        },
      ]}
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {content.features.map((feature) => (
          <li
            key={feature}
            className="rounded-[18px] border border-white/10 bg-white/6 px-4 py-4 text-sm font-semibold text-white/80"
          >
            {feature}
          </li>
        ))}
      </ul>
    </CTASection>
  );
}
