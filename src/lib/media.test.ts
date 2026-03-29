import { normalizeSiteImagePath } from "@/lib/media";

describe("media helpers", () => {
  it("normalizes legacy root image paths into the canonical images folder", () => {
    expect(normalizeSiteImagePath("/blfsc-tee.jpeg", "/images/fallback.png")).toBe(
      "/images/blfsc-tee.jpeg",
    );
  });

  it("leaves canonical and remote image paths alone", () => {
    expect(normalizeSiteImagePath("/images/blfsc-logo.png", "/images/fallback.png")).toBe(
      "/images/blfsc-logo.png",
    );
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
