import { normalizeSiteImagePath } from "@/lib/media";

describe("media helpers", () => {
  it("normalizes legacy root image paths into the canonical images folder", () => {
    expect(normalizeSiteImagePath("/blfsc-tee.jpeg", "/images/fallback.png")).toBe(
      "/images/blfsc-tee.jpeg",
    );
  });

  it("rewrites heavy legacy image aliases to optimized variants", () => {
    expect(normalizeSiteImagePath("/images/blfsc-logo.png", "/images/fallback.png")).toBe(
      "/images/blfsc-logo.webp",
    );
    expect(normalizeSiteImagePath("/images/storm-website.png", "/images/fallback.png")).toBe(
      "/images/storm-website.webp",
    );
  });

  it("leaves other canonical and remote image paths alone", () => {
    expect(
      normalizeSiteImagePath(
        "https://tudfdpmrkreucubdtuay.supabase.co/storage/v1/object/public/merch-images/item.png",
        "/images/fallback.png",
      ),
    ).toBe(
      "https://tudfdpmrkreucubdtuay.supabase.co/storage/v1/object/public/merch-images/item.png",
    );
  });
});
