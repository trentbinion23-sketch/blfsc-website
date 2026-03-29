import { ContactForm } from "@/components/ContactForm";
import { SectionHeading } from "@/components/SectionHeading";
import { buildMetadata } from "@/lib/seo";
import { getPublicSiteContent } from "@/lib/site-content";

export const metadata = buildMetadata({
  title: "Contact",
  description: "Send a BLFSC enquiry about rides, merch access, events, or club contact.",
  path: "/contact",
});

export default async function ContactPage() {
  const siteContent = await getPublicSiteContent();
  const content = siteContent.contactPage;

  return (
    <section className="page-shell section-space">
      <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-6">
          <SectionHeading
            eyebrow={content.heroHeading.eyebrow}
            title={content.heroHeading.title}
            description={content.heroHeading.description}
          />
          <div className="space-y-4">
            {content.blocks.map((block) => (
              <article key={block.title} className="card-surface p-6">
                <h2 className="text-2xl leading-none sm:text-3xl">{block.title}</h2>
                <p className="mt-3 text-base leading-7">{block.copy}</p>
              </article>
            ))}
            <article className="card-surface p-6">
              <p className="eyebrow">{content.directEyebrow}</p>
              <h2 className="mt-4 text-2xl leading-none sm:text-3xl">{content.directTitle}</h2>
              <p className="mt-4 text-base leading-7">{content.directDescription}</p>
              <div className="mt-5 space-y-3 text-base leading-7">
                <p>
                  Email:{" "}
                  <a
                    href={`mailto:${siteContent.contact.email}`}
                    className="font-semibold text-white hover:text-[var(--sand)]"
                  >
                    {siteContent.contact.email}
                  </a>
                </p>
                <p>
                  Phone:{" "}
                  <a
                    href={`tel:${siteContent.contact.phone.replaceAll(" ", "")}`}
                    className="font-semibold text-white hover:text-[var(--sand)]"
                  >
                    {siteContent.contact.phone}
                  </a>
                </p>
                <p className="flex flex-wrap gap-3 pt-2">
                  <a href={siteContent.contact.instagramUrl} className="btn-secondary">
                    Instagram
                  </a>
                  <a href={siteContent.contact.facebookUrl} className="btn-secondary">
                    Facebook
                  </a>
                  <a href={siteContent.contact.tiktokUrl} className="btn-secondary">
                    TikTok
                  </a>
                </p>
              </div>
            </article>
          </div>
        </div>

        <ContactForm contactEmail={siteContent.contact.email} />
      </div>
    </section>
  );
}
