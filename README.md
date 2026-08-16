# KRAVNA BAKERY — Static Ecommerce Frontend

A production-ready, **JSON-driven** static ecommerce website for a Pakistani bakery.
Plain **HTML + CSS + JavaScript** — no frameworks, no build step, no backend, no database.

> **Note on architecture (please read):** this is a *static ecommerce frontend*. There is no
> server-side database or order-processing system. Orders are **confirmed over WhatsApp** — the
> site prepares a structured order message and opens `wa.me` with it pre-filled. The cart and
> wishlist are stored in the browser's `localStorage`, which is **not a secure database** and is
> only intended to make the demo experience work across page refreshes on a single device.

---

## Quick start

There is **no build step**. You can:

1. **Open `index.html` directly** in a browser (works for basic browsing), **or** better —
2. **Serve the folder** with any static server:
   ```bash
   # Python
   python3 -m http.server 8000
   # or Node
   npx serve .
   ```
3. Deploy as-is to **GitHub Pages / Netlify / Vercel** (no configuration needed — it's just static files).

The site fetches `data/*.json` at runtime, so it must be served over HTTP(S) (or opened from a
server), not from `file://`, for the data files to load.

---

## File structure

```
/
├── index.html          Homepage
├── shop.html           Full catalog + search/filters/sort
├── product.html        Product detail (?slug=…)
├── cart.html           Cart
├── checkout.html       Checkout
├── custom-cake.html    Custom cake request form
├── about.html          About
├── contact.html        Contact
├── 404.html            Not found
├── style.css           Design system
├── app.js              All logic (rendering, cart, search, checkout…)
│
├── data/
│   ├── items.json        Product catalog (single source of truth)
│   ├── deals.json        Deals/bundles
│   ├── categories.json   Categories & subcategories
│   └── settings.json     Business info, WhatsApp, hero, checkout, payment methods
│
├── images/
│   ├── products/   one file per product, named by slug  →  products/red-velvet-cake.jpg
│   ├── categories/ one file per category, named by slug →  categories/cakes.jpg
│   ├── banners/    hero carousel images
│   ├── gallery/    (gallery images can live here too)
│   └── logo/       logo + favicon (SVG)
│
└── assets/          (reserved for extra static assets)
```

`_build_data.py` is an **optional maintenance helper** that regenerates the four JSON files from a
compact Python spec. It is not part of the runtime site — you can ignore it, or edit it and re-run
`python3 _build_data.py` when you want to bulk-edit the catalog.

---

## Editing content

**Everything is data-driven.** Edit these files and the site updates everywhere (homepage, shop,
search, product pages, cart, checkout, footer) with **no duplicated copies**:

- **`data/items.json`** — products (`id`, `name`, `slug`, `category`, `subcategory`, `price`,
  `compareAtPrice`, `discount`, `popular`, `featured`, `new`, `available`, `tags`, `variants`,
  `addons`, `images`, …).
- **`data/categories.json`** — categories + subcategories (`parentCategory`, `displayOnHomepage`,
  `sortOrder`).
- **`data/deals.json`** — bundles with `includedItems`, `price`, `compareAtPrice`, `active`.
- **`data/settings.json`** — business name, WhatsApp, phone, email, address, opening hours,
  delivery areas/fee, payment methods, hero slides, gallery, testimonials, currency, developer credit.

### Price rules

- If `compareAtPrice` is set, it is shown as the strikethrough "was" price, and `price` is the sale price.
- `discount` is a **display-only** badge — it is never applied as a second calculation on top of `price`.
- Currency renders as **`Rs. 1,500`** (no decimals, comma thousands separator).

### Variants

Each variant is product-specific — a product only shows the variant groups that exist for it
(`variantType`: e.g. `Size`, `Weight`, `Pack size`, `Flavor`, `Unit`). Options carry
`priceModifier` (or `priceOverride`) and per-option `stock`. An option with `stock: 0` is shown as
**"Currently unavailable"** and disables Add to Cart / Buy Now for that combination.

A product like "cupcakes" can have **both** a `Pack size` variant *and* a standalone **Quantity**
stepper — the variant is labelled by its `variantType` ("Pack size") and the stepper is labelled
"Quantity", so the two never collide.

### Add-ons

`addons` support two types: `"text"` (e.g. a free-text **cake message**) and `"toggle"` (e.g.
candles, knife, topper, with a flat additional `price`).

---

## WhatsApp number

- **Display (local) format:** `0313 3801788` (stored in `settings.json.whatsapp`).
- **`wa.me` links** must use the international format with **no leading zero**:
  `https://wa.me/923133801788`. The code performs this conversion automatically wherever a
  WhatsApp link is generated — **never edit the number in two places**; change it in `settings.json`
  (`whatsapp` and/or `whatsappIntl`) only.

## Developer credit

Must always read exactly **`Designed & Developed by Imran AF`**. It lives in
`settings.json.developerCredit` and is rendered by `app.js` (HTML-escaped, so it displays as
`Designed & Developed by Imran AF`).

---

## Images

Image filenames are **traceable to their data entries**: a product's image is
`images/products/{slug}.jpg` and a category's is `images/categories/{slug}.jpg`.

If a referenced image file is missing (or fails to load), the UI automatically swaps in a **branded
SVG placeholder** (cream background + category icon + product name) — there is never a broken-image
icon or a blank area. To add real photography, simply drop files named by slug into the right folder;
no code changes are required.

> A small set of hero + category photos is included. Product photos are wired up but placeholders
> until you add your own photography to `images/products/`.

---

## Error / empty states

Every failure mode has a designed state:

- JSON file missing/malformed → "Unable to load **products/deals** right now" + retry (never blank).
- No search results → clear "No results for …" state with suggestions.
- Empty cart / empty wishlist / product not found / out-of-stock variant → explicit states.
- `404.html` for unknown pages.

## SEO

Unique page titles & meta descriptions, Open Graph metadata, `schema.org/Product` (with offers) on
product pages, and `schema.org/Bakery` LocalBusiness structured data — populated **only** from
fields that actually exist in `settings.json` (placeholders like `[ADD ADDRESS]` are skipped, never
invented).

## Accessibility & performance

Semantic HTML, labelled controls, full keyboard navigation, visible focus states, WCAG-AA contrast,
alt text on images, `loading="lazy"` for below-the-fold images, and `prefers-reduced-motion` support.
No heavy libraries, no autoplay video.

---

*Designed & Developed by Imran AF*
