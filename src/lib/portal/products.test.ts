import {
  categoryLabel,
  inferCategory,
  normalizeCategory,
  normalizePortalProduct,
  productHasSizes,
} from "@/lib/portal/products";

describe("portal product helpers", () => {
  it("normalizes category aliases into canonical groups", () => {
    expect(normalizeCategory("hoodie")).toBe("outerwear");
    expect(normalizeCategory("trackies")).toBe("pants");
    expect(normalizeCategory("mug")).toBe("accessories");
  });

  it("infers categories from product content when category is missing", () => {
    expect(
      inferCategory({
        name: "Club Run Tee",
        description: "Soft cotton shirt for weekly rides",
      }),
    ).toBe("shirts");

    expect(
      inferCategory({
        name: "Workshop Stubby Holder",
      }),
    ).toBe("accessories");
  });

  it("flags wearable products as size-based by default", () => {
    expect(productHasSizes({ name: "Storm Hoodie" })).toBe(true);
    expect(productHasSizes({ name: "Members Mug" })).toBe(false);
  });

  it("builds normalized portal product display fields", () => {
    expect(
      normalizePortalProduct(
        {
          name: "Club Run Tee",
          description: "Ride tee",
          price: "39.95",
          image_url: "/blfsc-tee.jpeg",
        },
        "/images/blfsc-logo.png",
      ),
    ).toMatchObject({
      price: 39.95,
      active: true,
      hasSizes: true,
      displayImage: "/images/blfsc-tee.jpeg",
      displayDescription: "Ride tee",
      displayCategory: "shirts",
    });
  });

  it("returns human-friendly category labels", () => {
    expect(categoryLabel("shirts")).toBe("Shirts");
    expect(categoryLabel("unexpected")).toBe("Merch");
  });
});
