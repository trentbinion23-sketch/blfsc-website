import type { Event } from "@/lib/types";
import { normalizeSiteImagePath } from "@/lib/media";

type RecordValue = Record<string, unknown>;

type SiteQuickLink = {
  label: string;
  copy: string;
  href: string;
  marker: string;
  cta: string;
};

type SiteCopyCard = {
  title: string;
  copy: string;
};

type SiteFeatureCard = {
  eyebrow: string;
  title: string;
  copy: string;
};

type SiteTimelineItem = {
  year: string;
  note: string;
};

type SiteHeadingContent = {
  eyebrow: string;
  title: string;
  description: string;
};

type SitePortalPromo = {
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
  primaryLabel: string;
  secondaryLabel: string;
};

type SiteLegalPage = {
  eyebrow: string;
  title: string;
  paragraphs: string[];
};

export type SiteContent = {
  announcement: {
    enabled: boolean;
    title: string;
    message: string;
    linkLabel: string;
    linkHref: string;
  };
  hero: {
    title: string;
    description: string;
    noticeTitle: string;
    noticeCopy: string;
  };
  story: {
    title: string;
    paragraphOne: string;
    paragraphTwo: string;
  };
  contact: {
    email: string;
    phone: string;
    instagramUrl: string;
    facebookUrl: string;
    tiktokUrl: string;
  };
  footer: {
    title: string;
    copy: string;
    note: string;
  };
  home: {
    quickLinks: SiteQuickLink[];
    signalChips: string[];
    eventsHeading: SiteHeadingContent;
    aboutHeading: SiteHeadingContent;
    aboutCtaLabel: string;
    merchHeading: SiteHeadingContent;
    merchCategories: string[];
    merchLead: string;
    merchPrimaryLabel: string;
    merchSecondaryLabel: string;
    merchFeatureEyebrow: string;
    merchFeatureTitle: string;
    merchFeatureCopy: string;
    pillarsHeading: SiteHeadingContent;
    pillars: SiteFeatureCard[];
    contactHeading: SiteHeadingContent;
  };
  aboutPage: {
    heroHeading: SiteHeadingContent;
    storyEyebrow: string;
    storyIntro: string;
    valuesTitle: string;
    values: string[];
    timelineHeading: SiteHeadingContent;
    timeline: SiteTimelineItem[];
    clubDayHeading: SiteHeadingContent;
    clubDayCards: SiteCopyCard[];
    ctaHeading: SiteHeadingContent;
    ctaNote: string;
  };
  eventsPage: {
    heroHeading: SiteHeadingContent;
    ctaHeading: SiteHeadingContent;
  };
  events: Event[];
  contactPage: {
    heroHeading: SiteHeadingContent;
    blocks: SiteCopyCard[];
    directEyebrow: string;
    directTitle: string;
    directDescription: string;
  };
  merchPage: {
    heroEyebrow: string;
    heroTitle: string;
    heroDescription: string;
    categories: string[];
    primaryLabel: string;
    secondaryLabel: string;
    featureEyebrow: string;
    featureTitle: string;
    featureDescription: string;
    featuredHeading: SiteHeadingContent;
    accessHeading: SiteHeadingContent;
    accessNotes: string[];
  };
  portalPromo: SitePortalPromo;
  privacyPage: SiteLegalPage;
  termsPage: SiteLegalPage;
};

export const siteContentAdvancedKeys = [
  "home",
  "aboutPage",
  "eventsPage",
  "events",
  "contactPage",
  "merchPage",
  "portalPromo",
  "privacyPage",
  "termsPage",
] as const;

type SiteContentAdvancedKey = (typeof siteContentAdvancedKeys)[number];

const defaultEventImage = "/images/blfsc-logo.png";

export const siteContentDefaults: SiteContent = {
  announcement: {
    enabled: true,
    title: "Next ride",
    message:
      "Sunday hills run leaves Gepps Cross at 8:30 AM. Coffee stop in Hahndorf, regroup on arrival, then an easy roll back into town.",
    linkLabel: "Ride details",
    linkHref: "/events",
  },
  hero: {
    title: "B.L.F. Social Club. Adelaide rides, club nights, and a strong social side.",
    description:
      "BLFSC is a motorcycle social club built on turnout, respect, and time together on and off the bike. Find the next run, get in touch, or head to the members portal.",
    noticeTitle: "Sunday hills run",
    noticeCopy:
      "Meet at Gepps Cross, wheels up 8:30 AM. Coffee in Hahndorf, then lunch back toward town.",
  },
  story: {
    title: "Built around the ride and the people who show up.",
    paragraphOne:
      "BLFSC is about bikes, mateship, and the kind of club culture that comes from turning up properly. The runs matter, the social side matters, and the people in it matter.",
    paragraphTwo:
      "Visitors can follow the rides, the club story, and the contact points here. Approved members use the portal for merch, notices, and private club business.",
  },
  contact: {
    email: "blfsc.merch@outlook.com",
    phone: "0417 113 366",
    instagramUrl: "https://instagram.com/blfsc_official",
    facebookUrl: "https://facebook.com/blfsc",
    tiktokUrl: "https://tiktok.com/@blfsc",
  },
  footer: {
    title: "B.L.F. Social Club. Adelaide rides, club nights, member access.",
    copy: "See what's on, get in touch, or head to the members portal.",
    note: "Ride together. Show up properly. Keep the club moving.",
  },
  home: {
    quickLinks: [
      {
        label: "What's on",
        copy: "See the next ride, the next club night, and where BLFSC is heading next.",
        href: "/events",
        marker: "ON",
        cta: "See the calendar",
      },
      {
        label: "About the club",
        copy: "Read who BLFSC is and the club culture behind it.",
        href: "/about",
        marker: "BL",
        cta: "About BLFSC",
      },
      {
        label: "Members",
        copy: "Approved members sign in for merch, notices, chat, and invite links.",
        href: "/portal",
        marker: "MB",
        cta: "Open the portal",
      },
    ],
    signalChips: ["Rides", "Club nights", "Members"],
    eventsHeading: {
      eyebrow: "Upcoming rides",
      title: "What's coming up next.",
      description: "Runs, club nights, and the next chance to catch up with BLFSC.",
    },
    aboutHeading: {
      eyebrow: "About BLFSC",
      title: "Built around the ride and the people who show up.",
      description:
        "BLFSC is built on riding, respect, and time spent together on and off the bike.",
    },
    aboutCtaLabel: "About the club",
    merchHeading: {
      eyebrow: "Members-only merch",
      title: "Members-only merch.",
      description:
        "You can see the line here. Approved members sign in for the full catalogue and ordering.",
    },
    merchCategories: ["Tees", "Hoodies", "Pants", "Headwear", "Accessories"],
    merchLead:
      "Tees, hoodies, pants, headwear, and the extras that end up in the shed or on the bike. The range stays visible. The ordering stays private.",
    merchPrimaryLabel: "See merch range",
    merchSecondaryLabel: "Member sign-in",
    merchFeatureEyebrow: "Private ordering",
    merchFeatureTitle: "Members get the full catalogue.",
    merchFeatureCopy: "Sizes, stock, and orders stay inside the portal where they belong.",
    pillarsHeading: {
      eyebrow: "Around BLFSC",
      title: "What keeps BLFSC moving.",
      description: "Rides, club nights, and the tools that keep the club moving.",
    },
    pillars: [
      {
        eyebrow: "Ride days",
        title: "Runs worth turning up for",
        copy: "From hills rides to coast runs, BLFSC is about getting the bikes out and making a day of it.",
      },
      {
        eyebrow: "Club nights",
        title: "The social side matters too",
        copy: "The catch-up after the ride, the shed night, and the next plan on the table are just as much a part of the club as the run itself.",
      },
      {
        eyebrow: "Member hub",
        title: "Private tools for members",
        copy: "Merch, notices, chat, invites, and club business stay in one secure place.",
      },
    ],
    contactHeading: {
      eyebrow: "Contact and social",
      title: "Need a hand or want to get in touch?",
      description: "Questions about rides, member access, or club contact can all start here.",
    },
  },
  aboutPage: {
    heroHeading: {
      eyebrow: "About BLFSC",
      title: "Built on bikes, respect, and good company.",
      description:
        "BLFSC is a motorcycle social club built around turning up, backing each other, and keeping the social side of riding alive.",
    },
    storyEyebrow: "Club story",
    storyIntro:
      "Some clubs talk big. BLFSC is about the people who show up. The rides are real, the social side matters, and the club carries itself right on and off the bike.",
    valuesTitle: "What BLFSC stands for.",
    values: [
      "Respect on and off the bike",
      "Turn up and back each other",
      "Keep the club social, active, and easy to stand behind",
      "Handle private club business inside the secure members portal",
    ],
    timelineHeading: {
      eyebrow: "Timeline",
      title: "How the club grew.",
      description: "A few good rides turned into something worth backing.",
    },
    timeline: [
      {
        year: "How it started",
        note: "A few riders, regular catch-ups, and a club atmosphere worth backing.",
      },
      {
        year: "What it grew into",
        note: "Weekend runs, club nights, merch, and a club name people recognise around the bikes.",
      },
      {
        year: "Where it stands",
        note: "A motorcycle social club built on turnout, respect, and time spent together on and off the road.",
      },
    ],
    clubDayHeading: {
      eyebrow: "A club day",
      title: "What a good BLFSC day looks like.",
      description: "Roll out, regroup, catch up, and do it again next time.",
    },
    clubDayCards: [
      {
        title: "Roll out",
        copy: "Meet up, fuel up, and get the bikes moving with the rest of the club.",
      },
      {
        title: "Mid-ride stop",
        copy: "Coffee, a regroup, a few laughs, then back on the road.",
      },
      {
        title: "After the ride",
        copy: "Food, catch-up, merch talk, and the next run already getting lined up.",
      },
    ],
    ctaHeading: {
      eyebrow: "Next stop",
      title: "See what's on next.",
      description:
        "The calendar, the contact page, and the member portal are the quickest next stops from here.",
    },
    ctaNote: "Already a member? Head straight to sign-in.",
  },
  eventsPage: {
    heroHeading: {
      eyebrow: "Events",
      title: "Rides, club nights, and the next place to be.",
      description: "The calendar covers upcoming runs, catch-ups, and club events.",
    },
    ctaHeading: {
      eyebrow: "Need ride details?",
      title: "Need a meet point, time, or weather check?",
      description: "Send a message and we will point you the right way before you head out.",
    },
  },
  events: [
    {
      id: "hills-breakfast-run",
      slug: "hills-breakfast-run",
      title: "Adelaide Hills Breakfast Run",
      date: "2026-04-12",
      time: "8:30 AM",
      location: "Gepps Cross to Hahndorf",
      tag: "Ride",
      excerpt:
        "A Sunday morning run through the hills with a coffee regroup in Hahndorf and an easy roll back into town.",
      description:
        "Meet north of the city, roll out as a group, and settle into an Adelaide Hills route built for a clean run, a solid catch-up, and breakfast with the club.",
      image: "/images/storm-website.webp",
      featured: true,
    },
    {
      id: "port-adelaide-social-night",
      slug: "port-adelaide-social-night",
      title: "Port Adelaide Social Night",
      date: "2026-04-24",
      time: "7:00 PM",
      location: "Port Adelaide",
      tag: "Social",
      excerpt:
        "A relaxed Friday night catch-up for members, supporters, and riders keen to meet the club properly.",
      description:
        "The social night keeps the club side of BLFSC moving, with time for ride talk, event plans, merch updates, and meeting new faces without the pressure of a full run day.",
      image: "/images/blfsc-logo.png",
      featured: true,
    },
    {
      id: "southern-coast-run",
      slug: "southern-coast-run",
      title: "Southern Coast Lunch Run",
      date: "2026-05-17",
      time: "9:15 AM",
      location: "Old Noarlunga to Victor Harbor",
      tag: "Ride",
      excerpt:
        "A mid-autumn coastal run with a lunch stop on the foreshore and time to settle in before the ride home.",
      description:
        "This run heads south through the coastal roads, regroups along the way, and finishes with lunch and photos before the staggered ride back.",
      image: "/images/storm-website.webp",
      featured: true,
    },
    {
      id: "barossa-lunch-run",
      slug: "barossa-lunch-run",
      title: "Barossa Lunch Run",
      date: "2026-06-07",
      time: "10:00 AM",
      location: "Gawler to Barossa Valley",
      tag: "Run",
      excerpt:
        "A longer Sunday ride through the north with a lunch stop in the valley and an easy staggered return.",
      description:
        "The Barossa route is built for members and supporters who want a full ride day, open roads, and a proper sit-down meal before the trip back.",
      image: "/images/storm-website.webp",
      featured: false,
    },
    {
      id: "shed-night-recap",
      slug: "shed-night-recap",
      title: "Shed Night and Merch Pick-Up",
      date: "2026-03-14",
      time: "6:30 PM",
      location: "Western suburbs workshop",
      tag: "Club night",
      excerpt:
        "A recent club night with merch pick-ups, event planning, and time to catch up off the bike.",
      description:
        "A practical off-bike night for club updates, merch collection, and getting the next run sheet locked in before the colder months set in.",
      image: "/images/blfsc-logo.png",
      featured: false,
    },
  ],
  contactPage: {
    heroHeading: {
      eyebrow: "Contact BLFSC",
      title: "Need to reach BLFSC?",
      description: "For ride details, member access, or general club contact, start here.",
    },
    blocks: [
      {
        title: "Club enquiries",
        copy: "Questions about the club, upcoming rides, or getting in touch? Start here.",
      },
      {
        title: "Event questions",
        copy: "Need a meet point, departure time, or a weather check before a run? Send it here.",
      },
      {
        title: "Members support",
        copy: "Need help with portal access or merch? We will point you the right way.",
      },
    ],
    directEyebrow: "Direct contact",
    directTitle: "Need the quickest answer?",
    directDescription:
      "Use the club email or phone below if you need a direct response about rides, member access, or merch support.",
  },
  merchPage: {
    heroEyebrow: "Members only",
    heroTitle: "BLFSC merch stays with the members.",
    heroDescription:
      "The range is part of the club. Approved members sign in for the full catalogue, sizes, and ordering.",
    categories: ["Tees", "Hoodies", "Pants", "Headwear", "Accessories"],
    primaryLabel: "Member sign-in",
    secondaryLabel: "Ask about access",
    featureEyebrow: "Secure ordering",
    featureTitle: "See the line. Order through the portal.",
    featureDescription: "You can see the range here. Members handle the buying through the portal.",
    featuredHeading: {
      eyebrow: "Featured range",
      title: "A look at the current line.",
      description: "Some of the core pieces members can get through the latest merch run.",
    },
    accessHeading: {
      eyebrow: "Merch access",
      title: "Getting merch.",
      description: "See the range, sign in if you have access, and order inside the portal.",
    },
    accessNotes: [
      "The range shows the style and the core pieces members can get.",
      "Approved members sign in for the full catalogue, sizes, and live order list.",
      "Need access or a stock answer? Contact the club and we will sort it out.",
    ],
  },
  portalPromo: {
    eyebrow: "Already a member?",
    title: "Head straight to the portal.",
    description: "Sign in for merch, notices, member chat, invite links, and account updates.",
    features: ["Merch orders", "Club notices", "Member chat", "Invite links"],
    primaryLabel: "Open member portal",
    secondaryLabel: "Need access?",
  },
  privacyPage: {
    eyebrow: "Privacy",
    title: "Privacy information for BLFSC website visitors and members.",
    paragraphs: [
      "BLFSC collects the information you choose to provide through contact enquiries, member access requests, merch orders, and other club services connected to this website.",
      "That information is used to reply to enquiries, help with member access, manage club notices, and handle merch or event-related communication. BLFSC does not publish or sell personal information provided through the site.",
      "Where needed, information may be handled through trusted service providers used to run the website, member tools, or club communications. Access is limited to what is reasonably required to operate those services.",
    ],
  },
  termsPage: {
    eyebrow: "Terms",
    title: "Site use, event, and merch terms for BLFSC.",
    paragraphs: [
      "Information published on the BLFSC website is provided as a general guide for visitors and members. Event times, meet points, and club details may change, so the latest information should always be confirmed before attending.",
      "Riders are responsible for their own conduct, licensing, registration, insurance, and roadworthiness when attending any club ride or event. Participation is at your own risk and subject to local laws and safe riding expectations.",
      "Merchandise listed through BLFSC is intended for approved members unless otherwise stated. Availability, sizing, and fulfilment times may vary between product runs.",
      "Members are responsible for keeping their portal access private and for using club tools respectfully.",
    ],
  },
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(source: RecordValue, key: string, fallback = "") {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeRelativePath(value: string, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (/\s/.test(value)) return fallback;
  return value;
}

function normalizeHttpsUrl(value: string, fallback: string, allowedHosts: string[]) {
  if (!value) return fallback;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return fallback;
    if (!allowedHosts.includes(parsed.hostname.toLowerCase())) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

function readStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean);
}

function readBoolean(source: RecordValue, key: string, fallback: boolean) {
  return typeof source[key] === "boolean" ? source[key] : fallback;
}

function readArray<T>(
  value: unknown,
  fallback: T[],
  normalizeEntry: (entry: unknown, index: number) => T | null,
) {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((entry, index) => normalizeEntry(entry, index))
    .filter((entry): entry is T => entry !== null);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || ""
  );
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function normalizeQuickLink(entry: unknown) {
  if (!isRecord(entry)) return null;
  const label = readString(entry, "label");
  const href = readString(entry, "href");
  if (!label || !href) return null;
  return {
    label,
    copy: readString(entry, "copy"),
    href,
    marker: readString(entry, "marker", label.slice(0, 2).toUpperCase()),
    cta: readString(entry, "cta", "Learn more"),
  };
}

function normalizeCopyCard(entry: unknown) {
  if (!isRecord(entry)) return null;
  const title = readString(entry, "title");
  if (!title) return null;
  return {
    title,
    copy: readString(entry, "copy"),
  };
}

function normalizeFeatureCard(entry: unknown) {
  if (!isRecord(entry)) return null;
  const title = readString(entry, "title");
  if (!title) return null;
  return {
    eyebrow: readString(entry, "eyebrow"),
    title,
    copy: readString(entry, "copy"),
  };
}

function normalizeTimelineItem(entry: unknown) {
  if (!isRecord(entry)) return null;
  const year = readString(entry, "year");
  const note = readString(entry, "note");
  if (!year || !note) return null;
  return { year, note };
}

function normalizeHeading(entry: unknown, fallback: SiteHeadingContent) {
  if (!isRecord(entry)) return fallback;
  return {
    eyebrow: readString(entry, "eyebrow", fallback.eyebrow),
    title: readString(entry, "title", fallback.title),
    description: readString(entry, "description", fallback.description),
  };
}

function normalizeLegalPage(entry: unknown, fallback: SiteLegalPage) {
  if (!isRecord(entry)) return fallback;
  return {
    eyebrow: readString(entry, "eyebrow", fallback.eyebrow),
    title: readString(entry, "title", fallback.title),
    paragraphs: readStringArray(entry.paragraphs, fallback.paragraphs),
  };
}

function normalizePortalPromo(entry: unknown, fallback: SitePortalPromo) {
  if (!isRecord(entry)) return fallback;
  return {
    eyebrow: readString(entry, "eyebrow", fallback.eyebrow),
    title: readString(entry, "title", fallback.title),
    description: readString(entry, "description", fallback.description),
    features: readStringArray(entry.features, fallback.features),
    primaryLabel: readString(entry, "primaryLabel", fallback.primaryLabel),
    secondaryLabel: readString(entry, "secondaryLabel", fallback.secondaryLabel),
  };
}

function normalizeEventEntry(entry: unknown, index: number) {
  if (!isRecord(entry)) return null;

  const title = readString(entry, "title");
  const date = readString(entry, "date");
  const time = readString(entry, "time");
  const location = readString(entry, "location");
  if (!title || !date || !time || !location) return null;

  const slug = readString(entry, "slug") || slugify(title);
  const id = readString(entry, "id") || slug || `event-${index + 1}`;
  const description = readString(entry, "description");
  const excerpt = readString(entry, "excerpt", description);

  return {
    id,
    slug: slug || id,
    title,
    date,
    time,
    location,
    tag: readString(entry, "tag", "Event"),
    excerpt: excerpt || truncateText(description || title, 140),
    description: description || excerpt || title,
    image: normalizeSiteImagePath(readString(entry, "image"), defaultEventImage),
    featured: readBoolean(entry, "featured", false),
  } satisfies Event;
}

export function cloneSiteContent(payload: SiteContent = siteContentDefaults) {
  return mergeSiteContent(payload);
}

export function pickSiteContentAdvanced(
  payload: SiteContent,
): Pick<SiteContent, SiteContentAdvancedKey> {
  const content = mergeSiteContent(payload);
  return {
    home: content.home,
    aboutPage: content.aboutPage,
    eventsPage: content.eventsPage,
    events: content.events,
    contactPage: content.contactPage,
    merchPage: content.merchPage,
    portalPromo: content.portalPromo,
    privacyPage: content.privacyPage,
    termsPage: content.termsPage,
  };
}

export function mergeSiteContent(payload: unknown): SiteContent {
  if (!isRecord(payload)) return siteContentDefaults;

  const announcement = isRecord(payload.announcement) ? payload.announcement : {};
  const hero = isRecord(payload.hero) ? payload.hero : {};
  const story = isRecord(payload.story) ? payload.story : {};
  const contact = isRecord(payload.contact) ? payload.contact : {};
  const footer = isRecord(payload.footer) ? payload.footer : {};
  const home = isRecord(payload.home) ? payload.home : {};
  const aboutPage = isRecord(payload.aboutPage) ? payload.aboutPage : {};
  const eventsPage = isRecord(payload.eventsPage) ? payload.eventsPage : {};
  const contactPage = isRecord(payload.contactPage) ? payload.contactPage : {};
  const merchPage = isRecord(payload.merchPage) ? payload.merchPage : {};

  return {
    announcement: {
      enabled: readBoolean(announcement, "enabled", siteContentDefaults.announcement.enabled),
      title: readString(announcement, "title", siteContentDefaults.announcement.title),
      message: readString(announcement, "message", siteContentDefaults.announcement.message),
      linkLabel: readString(announcement, "linkLabel", siteContentDefaults.announcement.linkLabel),
      linkHref: normalizeRelativePath(
        readString(announcement, "linkHref", siteContentDefaults.announcement.linkHref),
        siteContentDefaults.announcement.linkHref,
      ),
    },
    hero: {
      title: readString(hero, "title", siteContentDefaults.hero.title),
      description: readString(hero, "description", siteContentDefaults.hero.description),
      noticeTitle: readString(hero, "noticeTitle", siteContentDefaults.hero.noticeTitle),
      noticeCopy: readString(hero, "noticeCopy", siteContentDefaults.hero.noticeCopy),
    },
    story: {
      title: readString(story, "title", siteContentDefaults.story.title),
      paragraphOne: readString(story, "paragraphOne", siteContentDefaults.story.paragraphOne),
      paragraphTwo: readString(story, "paragraphTwo", siteContentDefaults.story.paragraphTwo),
    },
    contact: {
      email: readString(contact, "email", siteContentDefaults.contact.email),
      phone: readString(contact, "phone", siteContentDefaults.contact.phone),
      instagramUrl: normalizeHttpsUrl(
        readString(contact, "instagramUrl", siteContentDefaults.contact.instagramUrl),
        siteContentDefaults.contact.instagramUrl,
        ["instagram.com", "www.instagram.com"],
      ),
      facebookUrl: normalizeHttpsUrl(
        readString(contact, "facebookUrl", siteContentDefaults.contact.facebookUrl),
        siteContentDefaults.contact.facebookUrl,
        ["facebook.com", "www.facebook.com", "m.facebook.com"],
      ),
      tiktokUrl: normalizeHttpsUrl(
        readString(contact, "tiktokUrl", siteContentDefaults.contact.tiktokUrl),
        siteContentDefaults.contact.tiktokUrl,
        ["tiktok.com", "www.tiktok.com"],
      ),
    },
    footer: {
      title: readString(footer, "title", siteContentDefaults.footer.title),
      copy: readString(footer, "copy", siteContentDefaults.footer.copy),
      note: readString(footer, "note", siteContentDefaults.footer.note),
    },
    home: {
      quickLinks: readArray(
        home.quickLinks,
        siteContentDefaults.home.quickLinks,
        normalizeQuickLink,
      ),
      signalChips: readStringArray(home.signalChips, siteContentDefaults.home.signalChips),
      eventsHeading: normalizeHeading(home.eventsHeading, siteContentDefaults.home.eventsHeading),
      aboutHeading: normalizeHeading(home.aboutHeading, siteContentDefaults.home.aboutHeading),
      aboutCtaLabel: readString(home, "aboutCtaLabel", siteContentDefaults.home.aboutCtaLabel),
      merchHeading: normalizeHeading(home.merchHeading, siteContentDefaults.home.merchHeading),
      merchCategories: readStringArray(
        home.merchCategories,
        siteContentDefaults.home.merchCategories,
      ),
      merchLead: readString(home, "merchLead", siteContentDefaults.home.merchLead),
      merchPrimaryLabel: readString(
        home,
        "merchPrimaryLabel",
        siteContentDefaults.home.merchPrimaryLabel,
      ),
      merchSecondaryLabel: readString(
        home,
        "merchSecondaryLabel",
        siteContentDefaults.home.merchSecondaryLabel,
      ),
      merchFeatureEyebrow: readString(
        home,
        "merchFeatureEyebrow",
        siteContentDefaults.home.merchFeatureEyebrow,
      ),
      merchFeatureTitle: readString(
        home,
        "merchFeatureTitle",
        siteContentDefaults.home.merchFeatureTitle,
      ),
      merchFeatureCopy: readString(
        home,
        "merchFeatureCopy",
        siteContentDefaults.home.merchFeatureCopy,
      ),
      pillarsHeading: normalizeHeading(
        home.pillarsHeading,
        siteContentDefaults.home.pillarsHeading,
      ),
      pillars: readArray(home.pillars, siteContentDefaults.home.pillars, normalizeFeatureCard),
      contactHeading: normalizeHeading(
        home.contactHeading,
        siteContentDefaults.home.contactHeading,
      ),
    },
    aboutPage: {
      heroHeading: normalizeHeading(
        aboutPage.heroHeading,
        siteContentDefaults.aboutPage.heroHeading,
      ),
      storyEyebrow: readString(
        aboutPage,
        "storyEyebrow",
        siteContentDefaults.aboutPage.storyEyebrow,
      ),
      storyIntro: readString(aboutPage, "storyIntro", siteContentDefaults.aboutPage.storyIntro),
      valuesTitle: readString(aboutPage, "valuesTitle", siteContentDefaults.aboutPage.valuesTitle),
      values: readStringArray(aboutPage.values, siteContentDefaults.aboutPage.values),
      timelineHeading: normalizeHeading(
        aboutPage.timelineHeading,
        siteContentDefaults.aboutPage.timelineHeading,
      ),
      timeline: readArray(
        aboutPage.timeline,
        siteContentDefaults.aboutPage.timeline,
        normalizeTimelineItem,
      ),
      clubDayHeading: normalizeHeading(
        aboutPage.clubDayHeading,
        siteContentDefaults.aboutPage.clubDayHeading,
      ),
      clubDayCards: readArray(
        aboutPage.clubDayCards,
        siteContentDefaults.aboutPage.clubDayCards,
        normalizeCopyCard,
      ),
      ctaHeading: normalizeHeading(aboutPage.ctaHeading, siteContentDefaults.aboutPage.ctaHeading),
      ctaNote: readString(aboutPage, "ctaNote", siteContentDefaults.aboutPage.ctaNote),
    },
    eventsPage: {
      heroHeading: normalizeHeading(
        eventsPage.heroHeading,
        siteContentDefaults.eventsPage.heroHeading,
      ),
      ctaHeading: normalizeHeading(
        eventsPage.ctaHeading,
        siteContentDefaults.eventsPage.ctaHeading,
      ),
    },
    events: readArray(payload.events, siteContentDefaults.events, normalizeEventEntry),
    contactPage: {
      heroHeading: normalizeHeading(
        contactPage.heroHeading,
        siteContentDefaults.contactPage.heroHeading,
      ),
      blocks: readArray(
        contactPage.blocks,
        siteContentDefaults.contactPage.blocks,
        normalizeCopyCard,
      ),
      directEyebrow: readString(
        contactPage,
        "directEyebrow",
        siteContentDefaults.contactPage.directEyebrow,
      ),
      directTitle: readString(
        contactPage,
        "directTitle",
        siteContentDefaults.contactPage.directTitle,
      ),
      directDescription: readString(
        contactPage,
        "directDescription",
        siteContentDefaults.contactPage.directDescription,
      ),
    },
    merchPage: {
      heroEyebrow: readString(merchPage, "heroEyebrow", siteContentDefaults.merchPage.heroEyebrow),
      heroTitle: readString(merchPage, "heroTitle", siteContentDefaults.merchPage.heroTitle),
      heroDescription: readString(
        merchPage,
        "heroDescription",
        siteContentDefaults.merchPage.heroDescription,
      ),
      categories: readStringArray(merchPage.categories, siteContentDefaults.merchPage.categories),
      primaryLabel: readString(
        merchPage,
        "primaryLabel",
        siteContentDefaults.merchPage.primaryLabel,
      ),
      secondaryLabel: readString(
        merchPage,
        "secondaryLabel",
        siteContentDefaults.merchPage.secondaryLabel,
      ),
      featureEyebrow: readString(
        merchPage,
        "featureEyebrow",
        siteContentDefaults.merchPage.featureEyebrow,
      ),
      featureTitle: readString(
        merchPage,
        "featureTitle",
        siteContentDefaults.merchPage.featureTitle,
      ),
      featureDescription: readString(
        merchPage,
        "featureDescription",
        siteContentDefaults.merchPage.featureDescription,
      ),
      featuredHeading: normalizeHeading(
        merchPage.featuredHeading,
        siteContentDefaults.merchPage.featuredHeading,
      ),
      accessHeading: normalizeHeading(
        merchPage.accessHeading,
        siteContentDefaults.merchPage.accessHeading,
      ),
      accessNotes: readStringArray(
        merchPage.accessNotes,
        siteContentDefaults.merchPage.accessNotes,
      ),
    },
    portalPromo: normalizePortalPromo(payload.portalPromo, siteContentDefaults.portalPromo),
    privacyPage: normalizeLegalPage(payload.privacyPage, siteContentDefaults.privacyPage),
    termsPage: normalizeLegalPage(payload.termsPage, siteContentDefaults.termsPage),
  };
}
