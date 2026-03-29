import {
  cloneSiteContent,
  mergeSiteContent,
  pickSiteContentAdvanced,
  siteContentDefaults,
} from "@/lib/site-content-contract";

describe("site content contract", () => {
  it("falls back to defaults when payload is invalid", () => {
    expect(mergeSiteContent(null)).toEqual(siteContentDefaults);
  });

  it("merges partial payloads without dropping defaults", () => {
    expect(
      mergeSiteContent({
        announcement: {
          enabled: false,
          title: "Club notice",
        },
        contact: {
          email: "hello@blfsc.com",
        },
      }),
    ).toMatchObject({
      announcement: {
        ...siteContentDefaults.announcement,
        enabled: false,
        title: "Club notice",
      },
      contact: {
        ...siteContentDefaults.contact,
        email: "hello@blfsc.com",
      },
      home: siteContentDefaults.home,
      merchPage: siteContentDefaults.merchPage,
    });
  });

  it("normalizes advanced arrays and image paths", () => {
    const content = mergeSiteContent({
      events: [
        {
          title: "Custom ride",
          date: "2026-07-01",
          time: "9:00 AM",
          location: "Adelaide",
          tag: "Ride",
          excerpt: "A custom event.",
          description: "A custom event with admin-managed content.",
          image: "/storm-website.png",
          featured: true,
        },
      ],
      aboutPage: {
        values: ["Show up", "Look after each other"],
      },
      home: {
        quickLinks: [],
      },
    });

    expect(content.events).toEqual([
      {
        id: "custom-ride",
        slug: "custom-ride",
        title: "Custom ride",
        date: "2026-07-01",
        time: "9:00 AM",
        location: "Adelaide",
        tag: "Ride",
        excerpt: "A custom event.",
        description: "A custom event with admin-managed content.",
        image: "/images/storm-website.png",
        featured: true,
      },
    ]);
    expect(content.aboutPage.values).toEqual(["Show up", "Look after each other"]);
    expect(content.home.quickLinks).toEqual([]);
  });

  it("returns a stable advanced payload for the admin editor", () => {
    const cloned = cloneSiteContent();
    expect(pickSiteContentAdvanced(cloned)).toEqual({
      home: cloned.home,
      aboutPage: cloned.aboutPage,
      eventsPage: cloned.eventsPage,
      events: cloned.events,
      contactPage: cloned.contactPage,
      merchPage: cloned.merchPage,
      portalPromo: cloned.portalPromo,
      privacyPage: cloned.privacyPage,
      termsPage: cloned.termsPage,
    });
  });
});
