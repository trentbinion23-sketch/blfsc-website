import { buildMetadata } from "@/lib/seo";
import { getPublicSiteContent } from "@/lib/site-content";

export const metadata = buildMetadata({
  title: "Privacy",
  description: "BLFSC privacy information for enquiries, website use, and members-only features.",
  path: "/privacy",
});

export default async function PrivacyPage() {
  const siteContent = await getPublicSiteContent();
  const content = siteContent.privacyPage;

  return (
    <section className="page-shell section-space">
      <div className="card-surface max-w-4xl p-7 sm:p-10">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 className="mt-4 text-4xl leading-none sm:text-5xl">{content.title}</h1>
        <div className="mt-6 space-y-5 text-base leading-7">
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p>
            If you want to update or remove information you have provided, contact{" "}
            <a
              href={`mailto:${siteContent.contact.email}`}
              className="font-semibold text-white hover:text-[var(--sand)]"
            >
              {siteContent.contact.email}
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
