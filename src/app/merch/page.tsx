/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { MerchCatalogue } from "@/components/MerchCatalogue";
import { SectionHeading } from "@/components/SectionHeading";
import { getPublicProducts } from "@/lib/public-products";
import { buildMetadata } from "@/lib/seo";
import { getPublicSiteContent } from "@/lib/site-content";

export const metadata = {
  ...buildMetadata({
    title: "Merch",
    description: "BLFSC members-only merch lives inside the secure portal.",
    path: "/merch",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MerchPage() {
  const [siteContent, products] = await Promise.all([getPublicSiteContent(), getPublicProducts()]);
  const content = siteContent.merchPage;
  const heroImage = products[0]?.image || "/images/blfsc-tee.jpeg";

  return (
    <>
      <section className="page-shell section-space">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-stretch">
          <div className="card-surface p-7 sm:p-10">
            <p className="eyebrow">{content.heroEyebrow}</p>
            <h1 className="mt-4 text-4xl leading-none sm:text-5xl">{content.heroTitle}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7">{content.heroDescription}</p>
            {content.categories.length ? (
              <div className="mt-8 flex flex-wrap gap-3">
                {content.categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-[var(--line)] bg-white/6 px-4 py-2 text-sm font-semibold text-white/85"
                  >
                    {category}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/portal" className="btn-primary">
                {content.primaryLabel}
              </Link>
              <Link href="/contact" className="btn-secondary">
                {content.secondaryLabel}
              </Link>
            </div>
          </div>

          <div className="card-surface overflow-hidden">
            <div className="relative aspect-[5/4]">
              <img
                src={heroImage}
                alt="BLFSC merch from the current range"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="space-y-3 p-6">
              <p className="eyebrow">{content.featureEyebrow}</p>
              <h2 className="text-3xl leading-none">{content.featureTitle}</h2>
              <p className="text-base leading-7">{content.featureDescription}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell section-space pt-0">
        <SectionHeading
          eyebrow={content.featuredHeading.eyebrow}
          title={content.featuredHeading.title}
          description={content.featuredHeading.description}
        />
        <div className="mt-10">
          {products.length ? (
            <MerchCatalogue products={products} />
          ) : (
            <EmptyState
              title="No merch is live yet."
              description="Use the admin merch manager to publish products and they will appear here automatically."
            />
          )}
        </div>
      </section>

      <section className="page-shell section-space pt-0">
        <SectionHeading
          eyebrow={content.accessHeading.eyebrow}
          title={content.accessHeading.title}
          description={content.accessHeading.description}
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {content.accessNotes.map((note, index) => (
            <article key={`${index}-${note}`} className="card-surface p-6">
              <p className="eyebrow">Step {index + 1}</p>
              <p className="mt-4 text-base leading-7">{note}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
