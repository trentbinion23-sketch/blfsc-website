# Shopify + POD — Setup Guide

The BLFSC member merch store uses **Shopify** as the ecommerce backend with a
**print-on-demand** (POD) provider for fulfillment. The BLFSC portal acts as a
**private member gate** — only logged-in approved members can see products and
reach Shopify checkout.

---

## How it works

```
Member → Portal login (Supabase auth)
  → Browse products (fetched from Shopify Storefront API)
  → Add to cart (client-side)
  → Pay Now → Shopify Cart created via Storefront API
  → Redirect to Shopify Checkout (hosted page)
  → Shopify handles payment, shipping, taxes
  → POD provider handles fulfillment
  → Member gets order confirmation email from Shopify
```

Everything after "Pay Now" is handled entirely by Shopify and your POD provider.
No payment data, no order management, and no fulfillment logic lives on the
BLFSC server.

---

## 1. Shopify store setup

### Create a Shopify store

1. Go to <https://www.shopify.com> and create a store
2. Any plan that includes the Storefront API works
3. Set store currency to **AUD**
4. Note your store domain: `your-store.myshopify.com`

### Connect your POD provider

1. Install your POD app from the Shopify App Store (e.g. Printful, Printify,
   Gelato, SPOD, Gooten)
2. Design your merch in the POD provider's mockup tool
3. Publish products to Shopify — the POD app creates products with variants,
   images, and prices automatically
4. Set the **Product type** on each product for portal category filtering:
   `Shirts`, `Outerwear`, `Pants`, `Accessories`, or `Other`

### Create a Storefront API access token

1. In Shopify admin → **Settings** → **Apps and sales channels**
2. Click **Develop apps** → **Create an app**
3. Name it `BLFSC Storefront`
4. Under **Configuration** → **Storefront API access scopes**, enable:
   - `unauthenticated_read_products`
   - `unauthenticated_write_checkouts`
   - `unauthenticated_read_checkouts`
5. Click **Install app**
6. Copy the **Storefront API access token**

---

## 2. Environment variables

Add these to `.env.local` (local dev) and your deployment platform:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` | Your `.myshopify.com` domain |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` | Storefront API access token |

These are **public** by design (the Storefront API is read-only for products
and can only create carts/checkouts — it cannot access admin data).

All other existing env vars (`SUPABASE_*`, `SENTRY_*`, etc.) remain unchanged.

---

## 3. Local development

```bash
npm install
npm run dev
```

Set the two Shopify env vars in `.env.local`. Products will load from Shopify
in the portal. If the vars are empty, products fall back to Supabase.

---

## 4. Deployment checklist

- [ ] Shopify store created and POD provider connected
- [ ] Products published in Shopify with correct product types
- [ ] Storefront API access token created
- [ ] `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` set in production
- [ ] `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` set in production
- [ ] Shopify Payments activated (live mode, AUD)
- [ ] Test a checkout end-to-end
- [ ] Verify order confirmation email arrives

---

## 5. Managing products

All product management happens in **Shopify admin** (or through your POD
provider's dashboard). The BLFSC portal automatically fetches and displays
whatever is published in your Shopify store.

To update the merch range:
1. Create or edit products in your POD provider
2. Sync/publish to Shopify
3. Products appear in the portal automatically

---

## 6. Managing orders

Orders, payments, shipping, and fulfillment are all managed through
**Shopify admin** and your **POD provider**. The BLFSC portal does not
track Shopify orders — members receive email confirmations directly from
Shopify with tracking information from the POD provider.

---

## 7. Phase 2 — public supporter store

The database includes a `member_only` column on the products table for future
use. When a public store is needed:

- Tag public products in Shopify (e.g. `public` tag or a separate collection)
- Build a public storefront at `/shop` or `shop.blfsc.com`
- Member-only products stay behind the portal login gate
- Shopify collections and tags support this separation natively

---

## 8. Fallback

If Shopify env vars are not set, the portal and public merch page automatically
fall back to loading products from Supabase. This means existing Supabase
product data keeps working during the transition to Shopify.
