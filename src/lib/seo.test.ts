import { describe, expect, it } from "vitest";
import { buildMetadata } from "./seo";

describe("buildMetadata", () => {
  it("builds canonical and title for custom page", () => {
    const metadata = buildMetadata({
      title: "Events",
      path: "/events",
    });

    expect(metadata.title).toBe("Events | BLFSC");
    expect(metadata.alternates?.canonical).toBe("https://blfsc.com/events");
    expect(metadata.openGraph?.url).toBe("https://blfsc.com/events");
  });

  it("uses default site title when page title is not provided", () => {
    const metadata = buildMetadata();

    expect(metadata.title).toBe("BLFSC | Motorcycle social club, rides, merch, and members");
    expect(metadata.manifest).toBe("/manifest.webmanifest");
  });
});
