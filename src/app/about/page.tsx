import Image from "next/image";
import Link from "next/link";
import { CTASection } from "@/components/CTASection";
import { SectionHeading } from "@/components/SectionHeading";
import { buildMetadata } from "@/lib/seo";
import { getPublicSiteContent } from "@/lib/site-content";

export const metadata = buildMetadata({
  title: "About",
  description: "Learn about BLFSC, the motorcycle social club story, values, and public identity.",
  path: "/about",
});

export default async function AboutPage() {
  const siteContent = await getPublicSiteContent();
  const content = siteContent.aboutPage;

  return (
    <>
      <section className="page-shell section-space">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div className="space-y-5">
            <SectionHeading
              eyebrow={content.heroHeading.eyebrow}
              title={content.heroHeading.title}
              description={content.heroHeading.description}
            />
            <p className="max-w-2xl text-base leading-7">{siteContent.story.paragraphOne}</p>
            <p className="max-w-2xl text-base leading-7">{siteContent.story.paragraphTwo}</p>
          </div>
          <div className="card-surface overflow-hidden">
            <div className="relative aspect-[5/4]">
              <Image
                src="/images/storm-website.png"
                alt="BLFSC club artwork"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell section-space">
        <div className="grid gap-8 lg:grid-cols-2">
          <article className="card-surface p-7 sm:p-8">
            <p className="eyebrow">{content.storyEyebrow}</p>
            <h2 className="mt-4 text-3xl leading-none sm:text-4xl">{siteContent.story.title}</h2>
            <p className="mt-4 text-base leading-7">{content.storyIntro}</p>
          </article>
          <article className="card-surface p-7 sm:p-8">
            <p className="eyebrow">Values</p>
            <h2 className="mt-4 text-3xl leading-none sm:text-4xl">{content.valuesTitle}</h2>
            <ul className="mt-5 space-y-3">
              {content.values.map((value) => (
                <li
                  key={value}
                  className="rounded-[18px] border border-[var(--line)] bg-white/6 px-4 py-4 text-base leading-7 text-white/80"
                >
                  {value}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="page-shell section-space">
        <SectionHeading
          eyebrow={content.timelineHeading.eyebrow}
          title={content.timelineHeading.title}
          description={content.timelineHeading.description}
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {content.timeline.map((item) => (
            <article key={item.year} className="card-surface p-7">
              <p className="eyebrow">{item.year}</p>
              <p className="mt-4 text-base leading-7">{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell section-space">
        <SectionHeading
          eyebrow={content.clubDayHeading.eyebrow}
          title={content.clubDayHeading.title}
          description={content.clubDayHeading.description}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {content.clubDayCards.map((item) => (
            <article key={item.title} className="card-surface p-7">
              <p className="eyebrow">{item.title}</p>
              <p className="mt-4 text-base leading-7">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <CTASection
        eyebrow={content.ctaHeading.eyebrow}
        title={content.ctaHeading.title}
        description={content.ctaHeading.description}
        actions={[
          { href: "/events", label: "See events" },
          { href: "/contact", label: "Contact the club", variant: "secondary" },
        ]}
      >
        <div className="space-y-3 text-sm font-semibold text-white/76">
          <p>{content.ctaNote}</p>
          <Link href="/portal" className="btn-secondary w-full justify-center">
            Member sign-in
          </Link>
        </div>
      </CTASection>
    </>
  );
}
