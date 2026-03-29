import { CTASection } from "@/components/CTASection";
import { EmptyState } from "@/components/EmptyState";
import { EventCatalogue } from "@/components/EventCatalogue";
import { SectionHeading } from "@/components/SectionHeading";
import { buildMetadata } from "@/lib/seo";
import { getPublicSiteContent } from "@/lib/site-content";

export const metadata = buildMetadata({
  title: "Events",
  description: "Browse upcoming BLFSC rides, social nights, and club activity.",
  path: "/events",
});

export default async function EventsPage() {
  const siteContent = await getPublicSiteContent();
  const content = siteContent.eventsPage;

  return (
    <>
      <section className="page-shell section-space">
        <div className="card-surface p-7 sm:p-10">
          <SectionHeading
            eyebrow={content.heroHeading.eyebrow}
            title={content.heroHeading.title}
            description={content.heroHeading.description}
          />
        </div>
      </section>

      <section className="page-shell pb-16 sm:pb-20">
        {siteContent.events.length ? (
          <EventCatalogue events={siteContent.events} />
        ) : (
          <EmptyState
            title="No events are live right now."
            description="Add upcoming rides or club nights in the admin website editor to publish them here."
          />
        )}
      </section>

      <CTASection
        eyebrow={content.ctaHeading.eyebrow}
        title={content.ctaHeading.title}
        description={content.ctaHeading.description}
        actions={[
          { href: "/contact", label: "Ask about a ride" },
          { href: "/portal", label: "Member sign-in", variant: "secondary" },
        ]}
      />
    </>
  );
}
