"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type MerchCatalogueProps = {
  products: Product[];
};

export function MerchCatalogue({ products }: MerchCatalogueProps) {
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const dynamicCategories = Array.from(
      new Set(products.map((product) => product.category).filter(Boolean)),
    );
    return ["All", ...dynamicCategories];
  }, [products]);
  const activeCategory = categories.includes(category) ? category : "All";

  const visibleProducts = useMemo(() => {
    if (activeCategory === "All") return products;
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory, products]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={cn("chip-button", activeCategory === item && "chip-button-active")}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {visibleProducts.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No merch is showing in that category."
          description="That range is currently between drops. Switch categories or head to the portal for the latest member stock."
        />
      )}
    </div>
  );
}
