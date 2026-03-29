# BLFSC.com Rebuild Project Spec

## Project summary

Rebuild **BLFSC.com** as a modern, mobile-first website for the B.L.F. Social Club.

The site should work as:

1. a strong public-facing brand and chapter website
2. an events and merch discovery site
3. a clear entry point into a future private member portal

This is **Phase 1** of the rebuild, so the member portal should be presented as a polished landing page only. Do **not** implement real authentication or private account logic yet.

---

## Primary goals

- Make the homepage feel strong, clean, and trustworthy
- Improve layout, navigation, spacing, and mobile usability
- Showcase events, merch, and chapters clearly
- Keep the member portal visible and easy to reach
- Build a maintainable codebase that can later support CMS content and real member features

---

## Target user experience

The website should feel:

- bold
- simple
- community-led
- practical
- easy to use on a phone
- visually strong without being cluttered

Avoid a corporate or startup feel. The tone should feel like a real club/community organisation.

---

## Tech stack

Use the following stack unless there is a strong implementation reason not to:

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data:** local mock data files for now
- **Forms:** simple contact form with client-side validation and a clean success state
- **Deployment target:** Vercel-compatible

Keep the architecture modular so CMS integration and auth can be added later.

---

## Routes to build

### Required routes

- `/`
- `/about`
- `/events`
- `/merch`
- `/chapters`
- `/contact`
- `/portal`
- `/privacy`
- `/terms`

### Future-ready routes (do not fully implement yet unless scaffolding is helpful)

- `/events/[slug]`
- `/merch/[slug]`
- `/chapters/[slug]`
- `/gallery`
- `/news`
- `/join`
- `/faqs`

---

## Navigation

### Desktop header

Include:

- Home
- Events
- Merch
- Chapters
- About
- Contact
- Member Portal

### Mobile navigation

Keep mobile navigation tighter:

- Home
- Events
- Merch
- Contact
- Portal

### Footer

Include:

- About
- Chapters
- Events
- Merch
- Contact
- Privacy
- Terms
- Social links

---

## Homepage specification

Build the homepage in this exact section order.

### 1. Hero

Purpose: immediately explain the site and direct visitors to key actions.

Include:

- headline
- short subheadline
- primary CTA: `View Events`
- secondary CTA: `Member Portal`
- optional logo lockup or image area

Suggested headline direction:

> BLFSC — Brotherhood, events, and members’ merch

### 2. Quick links strip

Three feature cards:

- Upcoming Events
- Merch
- Member Portal

Each card should include:

- simple icon or visual marker
- 1 short sentence
- CTA link

### 3. Featured events

Display 3 featured event cards from mock data.

Each card should show:

- title
- date
- location
- chapter
- short description
- CTA

### 4. Featured merch

Display 4 to 6 featured product cards from mock data.

Each card should show:

- image placeholder
- product name
- category
- short descriptor
- CTA

### 5. About BLFSC section

Short club-story section with:

- section heading
- 2 short paragraphs max
- image block or visual panel
- CTA to About page

### 6. Chapters overview

Display chapter cards for current chapter regions.

Each chapter card should include:

- chapter name
- region/state
- short description
- CTA

### 7. Member portal promo section

This must stand out clearly.

Include:

- heading
- short explanation of portal purpose
- strong CTA button to `/portal`

Suggested portal copy direction:

- account updates
- member orders
- notices
- downloads
- future member tools

### 8. Contact/social CTA section

Include:

- brief contact prompt
- CTA to Contact page
- social links or placeholders

---

## About page

Purpose: explain who BLFSC is in a concise, community-focused way.

Sections:

1. page intro/hero
2. club story
3. values/community focus
4. chapter history or timeline block
5. small gallery/image strip placeholder
6. CTA area linking to Events and Contact

Do not write long essay-style copy.

---

## Events page

Purpose: make it easy to discover upcoming events.

Sections:

1. intro hero
2. static filter chips UI
   - All
   - Upcoming
   - Past
   - By Chapter
3. responsive event card grid
4. empty state component
5. enquiry CTA block

### Event data model

```ts
export type Event = {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  chapter: string;
  excerpt: string;
  description: string;
  image: string;
  featured: boolean;
};
```

---

## Merch page

Purpose: make merch feel like a proper catalogue, even before private ordering is added.

Sections:

1. intro hero
2. static category chips UI
   - Tees
   - Hoodies
   - Hats
   - Accessories
3. responsive product grid
4. merch information block for:
   - sizing
   - pickup
   - ordering notes
   - portal note if relevant

### Product data model

```ts
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  excerpt: string;
  description: string;
  image: string;
  featured: boolean;
};
```

---

## Chapters page

Purpose: help visitors find the correct branch/community.

Sections:

1. intro section
2. responsive chapter card grid
3. optional map placeholder
4. connect/contact CTA

### Chapter data model

```ts
export type Chapter = {
  id: string;
  slug: string;
  name: string;
  region: string;
  excerpt: string;
  description: string;
  image: string;
};
```

---

## Contact page

Purpose: make it easy to get in touch and send chapter enquiries.

Sections:

1. intro copy
2. contact form
3. contact info/social blocks
4. success state UI

### Contact form fields

- name
- email
- subject
- message
- chapter dropdown (optional but preferred)

Requirements:

- client-side validation
- accessible form labels
- clear error messages
- clear success state

---

## Portal page

Purpose: act as a polished gateway page for future member features.

This page should **not** implement real login/auth yet.

Include:

- title and short explanation
- login CTA placeholder
- support/contact link
- feature cards for future portal functions:
  - account updates
  - orders
  - notices
  - downloads

This page should make the portal feel real and intentional, even before backend features exist.

---

## Design system

### Overall visual direction

The design should feel:

- strong
- clean
- high contrast
- spacious
- mobile-first
- practical
- community/club-led

### Typography

- strong, bold heading style
- simple readable sans-serif body text
- clear hierarchy
- avoid tiny text

### Layout

- card-based sections
- consistent spacing rhythm
- clear alignment
- single-column mobile stacking
- generous section padding

### Buttons

Use 3 button tiers:

- Primary
- Secondary
- Text link

Buttons should be consistent across the whole site.

### Component list

Build reusable components for:

- Header
- MobileNav
- Footer
- Hero
- SectionHeading
- EventCard
- ProductCard
- ChapterCard
- CTASection
- PortalPromo
- ContactForm
- EmptyState

---

## Accessibility requirements

The build must include:

- semantic HTML
- proper heading hierarchy
- accessible navigation
- labelled form controls
- visible focus states
- sufficient contrast
- keyboard-friendly interactions

---

## SEO requirements

Add basic SEO support for all public pages.

Include:

- page titles
- meta descriptions
- Open Graph basics
- sensible route metadata
- clean heading structure

Keep this lightweight and maintainable.

---

## Content direction

Website copy should be:

- direct
- proud
- short
- plain English
- community-focused
- confident without sounding aggressive

Avoid:

- startup language
- corporate jargon
- long paragraphs
- filler text that says nothing

---

## Phase plan

### Phase 1 — build now

- scaffold app
- create routes
- build reusable components
- add mock data
- implement all required public pages
- polish mobile UX
- polish spacing and hierarchy

### Phase 2 — later

- connect CMS for events, merch, and chapters
- add dynamic detail pages
- connect real contact form backend
- improve social previews and deeper SEO

### Phase 3 — later

- real auth
- member dashboard
- order history
- private notices
- downloads/forms
- chapter admin tools

---

## Repo structure target

```text
/src
  /app
    /about
    /events
    /merch
    /chapters
    /contact
    /portal
    /privacy
    /terms
    /page.tsx
    /layout.tsx
  /components
    Header.tsx
    MobileNav.tsx
    Footer.tsx
    Hero.tsx
    SectionHeading.tsx
    EventCard.tsx
    ProductCard.tsx
    ChapterCard.tsx
    CTASection.tsx
    PortalPromo.tsx
    ContactForm.tsx
    EmptyState.tsx
  /data
    events.ts
    products.ts
    chapters.ts
  /lib
    seo.ts
    utils.ts
```

---

## Implementation rules

### Do

- keep code modular
- use reusable components
- keep styling consistent
- optimise for mobile first
- use mock data for content-driven sections
- keep the portal highly visible
- write code that is easy to extend later

### Do not

- add real authentication in phase 1
- overuse animations
- make the homepage text-heavy
- bury events or merch under too much copy
- create a cluttered nav
- use generic startup copy
- build a visually noisy interface

---

## Definition of done

The project is successful when:

- all required routes exist
- the homepage is polished and easy to navigate
- events, merch, and chapters are clearly presented
- the contact page works well visually and functionally
- the portal page feels intentional even without backend auth
- the site looks strong on mobile and desktop
- code is clean enough for future CMS/auth integration

---

## Suggested execution order for the coding agent

1. scaffold the Next.js + Tailwind project
2. create layout, navigation, and footer
3. create shared design components
4. add mock data models and sample data
5. build homepage
6. build events page
7. build merch page
8. build chapters page
9. build about page
10. build contact page
11. build portal page
12. perform UX, accessibility, and SEO polish pass

---

## Master build prompt

Use this prompt if you want a single handoff to a coding agent:

```text
Build a modern, mobile-first website for BLFSC.com using Next.js App Router, TypeScript, and Tailwind CSS.

Purpose:
BLFSC is a club/community website that needs a strong public-facing site plus a visible member portal entry point. The site should promote events, merch, chapters, and contact information. The private portal will come later, so for now create a polished portal landing page only.

Required pages:
- Home
- About
- Events
- Merch
- Chapters
- Contact
- Portal
- Privacy
- Terms

Design direction:
- bold
- clean
- high contrast
- generous spacing
- strong typography
- card-based layout
- mobile-first
- community/club identity
- no startup/corporate feel

Homepage sections in order:
1. Hero with headline, subheadline, View Events CTA, Member Portal CTA
2. Quick links strip for Events, Merch, Portal
3. Featured Events
4. Featured Merch
5. About section
6. Chapters overview
7. Portal promo section
8. Contact/social CTA

Technical requirements:
- reusable components
- local mock data for events, merch, and chapters
- semantic accessible HTML
- responsive navigation
- clean footer
- metadata/SEO support for each page
- modular maintainable code
- no authentication yet

Implementation rules:
- keep the site mobile-first
- avoid clutter
- avoid long copy blocks
- keep the portal visible
- make events and merch easy to browse
- write code that is easy to extend for CMS and auth later
```
