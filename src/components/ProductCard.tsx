/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { Product } from "@/lib/types";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="card-surface overflow-hidden">
      <div className="relative aspect-[4/3] bg-black/5">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-[rgba(200,163,110,0.18)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rust)]">
            {product.category}
          </span>
        </div>
        <div>
          <h3 className="text-3xl leading-none">{product.name}</h3>
          <p className="mt-3 text-base leading-7">{product.excerpt}</p>
        </div>
        <Link
          href="/portal"
          className="btn-text"
          data-track-event="cta_portal_click"
          data-track-location="product_card"
          data-track-label={product.name}
        >
          Member sign-in
          <span aria-hidden="true">-&gt;</span>
        </Link>
      </div>
    </article>
  );
}
