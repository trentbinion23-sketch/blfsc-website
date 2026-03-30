const SHOPIFY_API_VERSION = "2025-01";

export function getShopifyConfig() {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN?.trim() || "";
  const storefrontToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN?.trim() || "";
  return { domain, storefrontToken, apiVersion: SHOPIFY_API_VERSION };
}

type StorefrontResponse<T = unknown> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function storefrontFetch<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<StorefrontResponse<T>> {
  const { domain, storefrontToken, apiVersion } = getShopifyConfig();
  if (!domain || !storefrontToken) {
    throw new Error("Shopify store domain or Storefront token is not configured.");
  }

  const response = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify Storefront API error: ${response.status}`);
  }

  return response.json() as Promise<StorefrontResponse<T>>;
}

// ---------------------------------------------------------------------------
// Product types
// ---------------------------------------------------------------------------

export type ShopifyProduct = {
  id: string;
  title: string;
  description: string;
  productType: string;
  handle: string;
  availableForSale: boolean;
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: { amount: string; currencyCode: string };
        availableForSale: boolean;
      };
    }>;
  };
};

// ---------------------------------------------------------------------------
// Server-side product fetch (used by public merch page SSR)
// ---------------------------------------------------------------------------

const PRODUCTS_QUERY = `
  query Products($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          title
          description
          productType
          handle
          availableForSale
          images(first: 1) {
            edges { node { url altText } }
          }
          variants(first: 20) {
            edges {
              node {
                id
                title
                price { amount currencyCode }
                availableForSale
              }
            }
          }
        }
      }
    }
  }
`;

type ProductsQueryResult = {
  products: { edges: Array<{ node: ShopifyProduct }> };
};

export async function fetchShopifyProducts(first = 50) {
  const result = await storefrontFetch<ProductsQueryResult>(PRODUCTS_QUERY, { first });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join(", "));
  }
  return result.data?.products.edges.map((e) => e.node) ?? [];
}
