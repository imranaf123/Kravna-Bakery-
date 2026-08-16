/* ==========================================================================
   KRAVNA BAKERY — app.js
   JSON-driven static ecommerce frontend. No backend, no build step.
   Data source of truth: data/{settings,categories,items,deals}.json
   Cart & wishlist persisted in localStorage (client-side only — not a
   secure database; see README note in footer/credit).
   ========================================================================== */
(function () {
  "use strict";

  /* ================= STATE ================= */
  const S = {
    settings: null, categories: [], items: [], deals: [],
    errors: {}, loading: true,
    page: document.body.dataset.page || "home"
  };

  const LS_CART = "kravna_cart";
  const LS_WISHLIST = "kravna_wishlist";
  const LS_LAST = "kravna_lastorder";

  /* ================= DOM helpers ================= */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ================= Formatting ================= */
  function currency() {
    const c = (S.settings && S.settings.currency) || { symbol: "Rs.", thousandSep: "," };
    return c;
  }
  function fmt(n) {
    const c = currency();
    const v = Math.round(Number(n) || 0);
    const grouped = v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, c.thousandSep || ",");
    return (c.symbol || "Rs.") + " " + grouped;
  }

  /* WhatsApp number: local display -> international for wa.me (strip spaces/leading 0, prefix 92) */
  function waIntl() {
    if (S.settings && S.settings.whatsappIntl) return S.settings.whatsappIntl;
    const raw = (S.settings && S.settings.whatsapp) || "0313 3801788";
    const digits = String(raw).replace(/[^0-9]/g, "").replace(/^0/, "");
    return "92" + digits;
  }
  function waLink(message) {
    return "https://wa.me/" + waIntl() + "?text=" + encodeURIComponent(message);
  }

  /* ================= Branded SVG placeholder (fallback when a photo is missing) ================= */
  function placeholderFor(catSlug, label) {
    const icon = '<path d="M4 21h16"/><path d="M5 21v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/><path d="M8 15v-3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/><circle cx="12" cy="6.4" r="1.4"/>';
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">' +
      '<rect width="600" height="600" fill="#f0e9dd"/>' +
      '<g fill="#e4d8c5"><circle cx="120" cy="120" r="70"/><circle cx="520" cy="430" r="90"/><circle cx="540" cy="90" r="40"/></g>' +
      '<circle cx="300" cy="250" r="120" fill="#f7f2ea" stroke="#dccfb9" stroke-width="3"/>' +
      '<g transform="translate(176,150) scale(10.2)" fill="none" stroke="#a6665b" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + icon + '</g>' +
      '<text x="300" y="470" font-family="Arial, sans-serif" font-weight="700" font-size="30" fill="#2b211b" text-anchor="middle">' +
      (esc(label || "").slice(0, 28) || "Kravna Bakery") +
      "</text>" +
      '<text x="300" y="510" font-family="Arial, sans-serif" font-size="20" fill="#8a7f74" text-anchor="middle">KRAVNA BAKERY</text>' +
      "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* Global image fallback: any broken image becomes a branded placeholder */
  document.addEventListener("error", function (e) {
    const t = e.target;
    if (t && t.tagName === "IMG" && !t.dataset.fb) {
      t.dataset.fb = "1";
      t.src = placeholderFor(t.dataset.cat || "", t.dataset.label || t.alt || "");
    }
  }, true);

  /* ================= Storage ================= */
  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function getCart() { return loadJSON(LS_CART, []); }
  function setCart(c) { saveJSON(LS_CART, c); renderCartCount(); }
  function getWishlist() { return loadJSON(LS_WISHLIST, []); }
  function setWishlist(w) { saveJSON(LS_WISHLIST, w); renderWishCount(); }

  /* ================= Data loading ================= */
  async function loadData() {
    const files = [
      ["settings", "data/settings.json"],
      ["categories", "data/categories.json"],
      ["items", "data/items.json"],
      ["deals", "data/deals.json"]
    ];
    const results = await Promise.allSettled(files.map(([, url]) => fetch(url).then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })));
    results.forEach((res, i) => {
      const [key] = files[i];
      if (res.status === "fulfilled") { S[key] = res.value; }
      else { S.errors[key] = true; }
    });
    S.loading = false;
  }

  /* ================= Lookups ================= */
  function catBySlug(slug) { return S.categories.find((c) => c.slug === slug); }
  function catById(id) { return S.categories.find((c) => c.id === id); }
  function catName(slug) { const c = catBySlug(slug); return c ? c.name : (slug || "Bakery"); }
  function itemById(id) { return S.items.find((i) => i.id === id); }
  function itemBySlug(slug) { return S.items.find((i) => i.slug === slug); }
  function topCategories() {
    return S.categories.filter((c) => !c.parentCategory).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  function subCategories(parentSlug) {
    return S.categories.filter((c) => c.parentCategory === parentSlug).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /* ================= Variant helpers ================= */
  function isZeroStock(v) { return v === 0 || v === "0"; }
  function defaultOptions(p) {
    const out = {};
    (p.variants || []).forEach((v) => {
      // prefer the base option (no price modifier) that is in stock
      const base = (v.options || []).find((o) =>
        !isZeroStock(o.stock) && (Number(o.priceModifier) || 0) === 0 && (Number(o.priceOverride) || 0) === 0);
      const first = (v.options || []).find((o) => !isZeroStock(o.stock));
      const pick = base || first || (v.options && v.options[0]);
      if (pick) out[v.variantType] = pick.label;
    });
    return out;
  }
  function unitPrice(p, sel, addons) {
    let price = Number(p.price) || 0;
    (p.variants || []).forEach((v) => {
      const chosen = sel[v.variantType];
      const opt = (v.options || []).find((o) => o.label === chosen);
      if (opt) price += (Number(opt.priceModifier) || 0) + (Number(opt.priceOverride) || 0);
    });
    (addons || []).forEach((a) => { price += Number(a.price) || 0; });
    return price;
  }
  function isOOS(p, sel) {
    let oos = false;
    (p.variants || []).forEach((v) => {
      const opt = (v.options || []).find((o) => o.label === sel[v.variantType]);
      if (opt && isZeroStock(opt.stock)) oos = true;
    });
    return oos;
  }
  function variantSummary(p) {
    if (!p.variants || !p.variants.length) return "";
    return p.variants.map((v) => {
      const labels = v.options.map((o) => o.label);
      return labels.join(" / ");
    }).join(" · ");
  }
  function signature(p, sel, addons) {
    const v = (p.variants || []).map((vv) => vv.variantType + ":" + (sel[vv.variantType] || "")).join("|");
    const a = (addons || []).map((aa) => aa.id).sort().join(",");
    return p.id + "::" + v + "::" + a;
  }
  function describeItem(p, sel, addons) {
    const parts = [];
    (p.variants || []).forEach((v) => { if (sel[v.variantType]) parts.push(sel[v.variantType]); });
    (addons || []).forEach((a) => { if (a.type === "text" && a.value) parts.push('"' + a.value + '"'); else if (a.type === "toggle") parts.push(a.label); });
    return parts.join(" · ");
  }

  /* ================= Cart ================= */
  function addToCart(p, sel, addons, qty) {
    const cart = getCart();
    const sig = signature(p, sel, addons);
    const existing = cart.find((c) => c.key === sig);
    if (existing) { existing.qty += qty; }
    else {
      cart.push({
        key: sig, id: p.id, slug: p.slug, name: p.name,
        image: p.images && p.images[0], cat: p.category,
        sel: sel, addons: addons, qty: qty,
        unitPrice: unitPrice(p, sel, addons)
      });
    }
    setCart(cart);
    toast("Added to cart", "View cart", "cart.html");
  }
  function updateCartQty(key, qty) {
    let cart = getCart();
    const it = cart.find((c) => c.key === key);
    if (it) { it.qty = Math.max(1, qty); setCart(cart); }
  }
  function removeFromCart(key) {
    let cart = getCart().filter((c) => c.key !== key);
    setCart(cart);
  }
  function replaceCartItem(oldKey, newItem) {
    let cart = getCart().filter((c) => c.key !== oldKey);
    const existing = cart.find((c) => c.key === newItem.key);
    if (existing) { existing.qty += newItem.qty; }
    else { cart.push(newItem); }
    setCart(cart);
  }
  function cartCount() { return getCart().reduce((s, c) => s + c.qty, 0); }
  function cartTotals() {
    const cart = getCart();
    const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
    const discount = 0;
    const fee = (S.settings && Number(S.settings.deliveryFee)) || 0;
    return { subtotal, discount, fee, total: subtotal + fee };
  }

  /* ================= Wishlist ================= */
  function toggleWishlist(id) {
    let w = getWishlist();
    if (w.includes(id)) { w = w.filter((x) => x !== id); toast("Removed from wishlist"); }
    else { w.push(id); toast("Saved to wishlist"); }
    setWishlist(w);
    renderWishButtons();
  }
  function isWished(id) { return getWishlist().includes(id); }

  /* ================= Toast ================= */
  function toast(msg, actionLabel, actionHref) {
    let wrap = $(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; wrap.setAttribute("aria-live", "polite"); document.body.appendChild(wrap); }
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = '<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg></span><span>' + esc(msg) + "</span>" +
      (actionLabel ? '<button type="button" data-href="' + esc(actionHref || "") + '">' + esc(actionLabel) + "</button>" : "");
    wrap.appendChild(el);
    const btn = el.querySelector("button");
    if (btn) btn.addEventListener("click", () => { location.href = btn.dataset.href; });
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 320); }, 2800);
  }

  /* ================= Cart / wishlist count badges ================= */
  function renderCartCount() {
    const n = cartCount();
    $$("[data-cart-count]").forEach((el) => { el.textContent = n || ""; });
  }
  function renderWishCount() {
    const n = getWishlist().length;
    $$("[data-wish-count]").forEach((el) => { el.textContent = n || ""; });
  }

  /* ================= NAV ================= */
  const NAV = [
    { label: "Home", href: "index.html", type: "page", key: "home" },
    { label: "Shop", href: "shop.html", type: "page", key: "shop" },
    { label: null, href: "shop.html?category=cakes", type: "cat", slug: "cakes" },
    { label: "Custom Cakes", href: "custom-cake.html", type: "page", key: "custom-cake" },
    { label: null, href: "shop.html?category=breads-buns", type: "cat", slug: "breads-buns" },
    { label: "Deals", href: "shop.html?view=deals", type: "page", key: "deals" }
  ];

  function resolveNavLabel(n) {
    if (n.label) return n.label;
    const c = catBySlug(n.slug);
    return c ? c.name : n.slug;
  }

  function renderHeader() {
    const host = $("#site-header");
    if (!host) return;
    const s = S.settings || {};
    const logoName = (s.shortName || "KRAVNA");
    const nav = NAV.map((n) => {
      const isActive = isNavActive(n);
      return '<a href="' + n.href + '"' + (isActive ? ' class="is-active" aria-current="page"' : "") + ">" + esc(resolveNavLabel(n)) + "</a>";
    }).join("");

    host.innerHTML =
      '<div class="topbar"><div class="container">' +
      '<div class="topbar__left"><svg class="dot-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 3v2h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg> Delivery &amp; Pickup Available <span class="dot">•</span> Freshly Made Every Day</div>' +
      '<div class="topbar__right">' +
      '<a href="shop.html?view=deals">Track Order</a>' +
      '<a href="about.html">About Us</a>' +
      '<a href="contact.html">Contact Us</a>' +
      "</div></div></div>" +
      '<header class="site-header"><div class="container">' +
      '<a class="logo" href="index.html" aria-label="' + esc(s.businessName || "Kravna Bakery") + ' home">' +
      '<span class="logo__mark">' + LOGO_MARK + "</span>" +
      '<span class="logo__text"><span class="logo__name">' + esc(logoName) + '</span><span class="logo__sub">Bakery</span></span>' +
      "</a>" +
      '<nav class="main-nav" aria-label="Primary">' + nav + "</nav>" +
      '<div class="header-actions">' +
      '<button class="icon-btn" id="search-btn" aria-label="Search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></button>' +
      '<button class="icon-btn" id="wish-btn" aria-label="Wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg><span class="count" data-wish-count></span></button>' +
      '<a class="icon-btn" href="cart.html" aria-label="Cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg><span class="count" data-cart-count></span></a>' +
      '<a class="btn btn--primary btn--sm" href="shop.html">Order Now</a>' +
      '<button class="icon-btn menu-toggle" id="menu-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
      "</div></div></header>";
    const mn = $("#mobile-nav");
    if (mn) {
      mn.innerHTML =
        '<div class="mobile-nav__head">' +
        '<span class="mobile-nav__brand">' + LOGO_MARK + "<b>" + esc(logoName) + "</b></span>" +
        '<button class="mobile-nav__close" aria-label="Close menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        "</div>" +
        '<div class="mobile-nav__links">' + nav + "</div>";
    }
    bindHeader();
  }

  function isNavActive(n) {
    if (n.type === "cat") {
      const q = new URLSearchParams(location.search);
      return S.page === "shop" && q.get("category") === n.slug;
    }
    if (n.key === "home") return S.page === "home";
    if (n.key === "shop") return S.page === "shop" && !location.search;
    if (n.key === "deals") return S.page === "shop" && new URLSearchParams(location.search).get("view") === "deals";
    return S.page === n.key;
  }

  function bindHeader() {
    const toggle = $("#menu-toggle");
    if (toggle) toggle.addEventListener("click", () => { openMobileNav(); });
    const backdrop = $("#nav-backdrop");
    if (backdrop) backdrop.addEventListener("click", () => { openMobileNav(false); });
    const mn = $("#mobile-nav");
    if (mn) {
      const closeBtn = mn.querySelector(".mobile-nav__close");
      if (closeBtn) closeBtn.addEventListener("click", () => { openMobileNav(false); });
      // clicking any link navigates AND closes the drawer (no preventDefault)
      mn.addEventListener("click", (e) => { if (e.target.closest("a")) openMobileNav(false); });
    }
    const sb = $("#search-btn");
    if (sb) sb.addEventListener("click", () => { openSearch(); });
    const wb = $("#wish-btn");
    if (wb) wb.addEventListener("click", () => { openSheet("wishlist"); });
  }

  function openMobileNav(force) {
    const nav = $("#mobile-nav");
    const toggle = $("#menu-toggle");
    const backdrop = $("#nav-backdrop");
    if (!nav) return;
    const open = (force === undefined) ? !nav.classList.contains("is-open") : force;
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
    if (backdrop) backdrop.classList.toggle("is-open", open);
  }

  function renderFooter() {
    const host = $("#site-footer");
    if (!host) return;
    host.className = "site-footer";
    const s = S.settings || {};
    const shopCats = topCategories().slice(0, 7).map((c) =>
      '<li><a href="shop.html?category=' + c.slug + '">' + esc(c.name) + "</a></li>").join("");
    const payments = (s.paymentMethods || []).filter((p) => p.enabled)
      .map((p) => '<span class="pm">' + esc(p.name) + "</span>").join("");
    const credit = esc(s.developerCredit || "Designed & Developed by Imran AF");
    const wa = esc(s.whatsapp || "0313 3801788");

    host.innerHTML =
      '<div class="container footer-grid">' +
      '<div class="footer-brand">' +
      '<a class="logo" href="index.html"><span class="logo__mark">' + LOGO_MARK + '</span>' +
      '<span class="logo__text"><span class="logo__name">' + esc(s.shortName || "KRAVNA") + '</span><span class="logo__sub">Bakery</span></span></a>' +
      "<p>" + esc(s.tagline || "Cakes, desserts & celebrations") + " — baked fresh every day, made for every celebration.</p>" +
      "</div>" +
      '<div class="footer-col"><h4>Shop</h4><ul>' + shopCats + "</ul></div>" +
      '<div class="footer-col"><h4>Help</h4><ul>' +
      '<li><a href="shop.html?view=deals">Track Order</a></li>' +
      '<li><a href="custom-cake.html">Custom Cakes</a></li>' +
      '<li><a href="cart.html">Cart</a></li>' +
      '<li><a href="contact.html">FAQs</a></li>' +
      '<li><a href="about.html">About Us</a></li>' +
      "</ul></div>" +
      '<div class="footer-col"><h4>Customer Care</h4><ul class="footer-contact">' +
      '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.9-.9L3 20l1-5.1a8.4 8.4 0 1 1 17-3.4z"/></svg><a href="' + waLink("Hi Kravna Bakery! I have a question.") + '" target="_blank" rel="noopener">WhatsApp: ' + wa + "</a></li>" +
      '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg><span>Phone: ' + esc(s.phone || "[ADD PHONE NUMBER]") + "</span></li>" +
      '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg><span>Email: ' + esc(s.email || "[ADD EMAIL]") + "</span></li>" +
      "</ul></div>" +
      '<div class="footer-col"><h4>Bakery Info</h4><ul class="footer-contact">' +
      '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>' + esc(s.address || "[ADD ADDRESS]") + ", " + esc(s.city || "") + "</span></li>" +
      '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>' + esc(s.openingHours || "Mon – Sun: 8:00 AM – 10:00 PM") + "</span></li>" +
      "</ul></div></div>" +
      '<div class="footer-bottom"><div class="container">' +
      '<div class="footer-pay"><span class="fp-label">We accept</span>' + payments + "</div>" +
      '<div class="footer-credit"><b>' + credit + "</b></div>" +
      "</div></div>";
  }

  function renderBottomNav() {
    const host = $("#bottom-nav");
    if (!host) return;
    host.className = "bottom-nav";
    const items = [
      { label: "Home", href: "index.html", icon: '<path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>', key: "home" },
      { label: "Shop", href: "shop.html", icon: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>', key: "shop" },
      { label: "Deals", href: "shop.html?view=deals", icon: '<path d="M20 12v8H4v-8"/><path d="M22 7H2v5h20z"/><path d="M12 22V7"/><path d="M12 7s-3-2-3-5h6c0 3-3 5-3 5z"/>', key: "deals" },
      { label: "Cart", href: "cart.html", icon: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>', key: "cart", count: true },
      { label: "Account", href: "#account", icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', key: "account" }
    ];
    host.innerHTML = items.map((it) => {
      const active = (it.key === "account") ? false : isBottomNavActive(it.key);
      return '<a href="' + it.href + '"' + (active ? ' class="is-active"' : "") +
        (it.key === "account" ? ' data-account' : "") + ">" +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + it.icon + "</svg>" +
        "<span>" + it.label + "</span>" +
        (it.count ? '<span class="count" data-cart-count></span>' : "") +
        "</a>";
    }).join("");
    const acc = host.querySelector("[data-account]");
    if (acc) acc.addEventListener("click", (e) => { e.preventDefault(); openSheet("account"); });
  }
  function isBottomNavActive(key) {
    if (key === "home") return S.page === "home";
    if (key === "shop") return S.page === "shop" && !location.search;
    if (key === "deals") return S.page === "shop" && new URLSearchParams(location.search).get("view") === "deals";
    if (key === "cart") return S.page === "cart";
    return false;
  }

  /* ================= Search overlay ================= */
  function openSearch() {
    ensureOverlays();
    const o = $("#search-overlay");
    o.classList.add("is-open");
    const input = o.querySelector("input");
    input.value = "";
    renderSearchResults("");
    input.focus();
  }
  function renderSearchResults(q) {
    const box = $("#search-results");
    if (!box) return;
    const nq = q.trim().toLowerCase();
    if (!S.items.length) {
      box.innerHTML = '<div class="search-empty">Search is unavailable right now.</div>';
      return;
    }
    if (!nq) {
      const popular = S.items.filter((i) => i.popular).slice(0, 6);
      box.innerHTML = popular.map(searchRow).join("") || '<div class="search-empty">Start typing to search.</div>';
      return;
    }
    const hits = S.items.filter((i) => {
      const hay = [i.name, i.category, i.subcategory, (i.tags || []).join(" "), i.description, i.shortDescription]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(nq);
    }).slice(0, 30);
    if (!hits.length) {
      box.innerHTML = '<div class="search-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><p>No results for “' + esc(q) + '”.</p><p class="hint">Try “red velvet”, “patties” or “nimco”.</p></div>';
      return;
    }
    const count = hits.length === 30 ? hits.length + "+" : hits.length;
    box.innerHTML = '<div class="search-hint">' + count + " result" + (hits.length === 1 ? "" : "s") + ' for “' + esc(q) + "”</div>" + hits.map((i) => searchRow(i, nq)).join("");
  }
  function searchRow(i, q) {
    const name = highlight(i.name, q);
    return '<a class="search-result" href="product.html?slug=' + i.slug + '">' +
      '<img src="' + i.images[0] + '" alt="' + esc(i.name) + '" data-cat="' + i.category + '" data-label="' + esc(i.name) + '" loading="lazy">' +
      '<span class="t"><b>' + name + "</b><span>" + esc(catName(i.category)) + "</span></span>" +
      '<span class="price">' + fmt(i.price) + "</span></a>";
  }
  function highlight(text, q) {
    const t = esc(text);
    if (!q) return t;
    const idx = t.toLowerCase().indexOf(q);
    if (idx === -1) return t;
    return t.slice(0, idx) + "<mark>" + t.slice(idx, idx + q.length) + "</mark>" + t.slice(idx + q.length);
  }
  function bindSearch() {
    const o = $("#search-overlay");
    if (!o) return;
    const input = o.querySelector("input");
    input.addEventListener("input", () => renderSearchResults(input.value));
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSearch(); });
    o.querySelector(".search-close").addEventListener("click", closeSearch);
    o.addEventListener("click", (e) => { if (e.target === o) closeSearch(); });
  }
  function closeSearch() { const o = $("#search-overlay"); if (o) o.classList.remove("is-open"); }

  /* ================= Sheets (wishlist / account) ================= */
  function openSheet(kind) {
    ensureOverlays();
    const backdrop = $("#sheet-backdrop");
    const sheets = $$(".sheet");
    sheets.forEach((s) => s.classList.remove("is-open"));
    const sheet = $("#sheet-" + kind);
    if (!sheet) return;
    if (kind === "wishlist") renderWishlistSheet();
    if (kind === "account") renderAccountSheet();
    sheet.classList.add("is-open");
    backdrop.classList.add("is-open");
  }
  function closeSheets() {
    $$(".sheet").forEach((s) => s.classList.remove("is-open"));
    const b = $("#sheet-backdrop"); if (b) b.classList.remove("is-open");
  }
  function renderWishlistSheet() {
    const body = $("#sheet-wishlist .sheet__body");
    const w = getWishlist();
    if (!w.length) {
      body.innerHTML = '<div class="empty" style="padding:40px 10px"><div class="empty__icon">' + HEART_ICON + '</div><h2>Your wishlist is empty</h2><p>Tap the heart on any product to save it here.</p><a class="btn btn--primary" href="shop.html">Browse products</a></div>';
      return;
    }
    body.innerHTML = w.map((id) => {
      const p = itemById(id);
      if (!p) return "";
      return '<div class="sheet-item">' +
        '<a href="product.html?slug=' + p.slug + '"><img src="' + p.images[0] + '" alt="' + esc(p.name) + '" data-cat="' + p.category + '" data-label="' + esc(p.name) + '"></a>' +
        '<span class="t"><a href="product.html?slug=' + p.slug + '"><b>' + esc(p.name) + "</b></a><span>" + fmt(p.price) + "</span></span>" +
        '<button class="remove-btn" data-add="' + p.id + '" aria-label="Add ' + esc(p.name) + ' to cart" style="color:var(--red)">' + PLUS_ICON + "</button>" +
        '<button class="remove-btn" data-remove="' + p.id + '" aria-label="Remove from wishlist">' + TRASH_ICON + "</button>" +
        "</div>";
    }).join("");
    body.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => {
      const p = itemById(b.dataset.add);
      addToCart(p, defaultOptions(p), [], 1);
      renderWishlistSheet();
    }));
    body.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => {
      toggleWishlist(b.dataset.remove);
      renderWishlistSheet();
    }));
  }
  function renderAccountSheet() {
    const body = $("#sheet-account .sheet__body");
    const s = S.settings || {};
    const last = loadJSON(LS_LAST, null);
    body.innerHTML =
      '<div style="padding:8px 0">' +
      '<h3 style="margin-bottom:14px">My Account</h3>' +
      '<div class="why-card" style="margin-bottom:14px"><div class="ico">' + USER_ICON + '</div>' +
      "<h3>Hello, guest</h3><p>This is a demo storefront — orders are placed via WhatsApp and stored locally in your browser only.</p></div>" +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<a class="btn btn--outline btn--block" href="#" data-go-wish>View wishlist (' + getWishlist().length + ")</a>" +
      (last ? '<div class="summary__row"><span>Last order</span><b>' + esc(last.ref) + "</b></div>" : "") +
      '<a class="btn btn--primary btn--block" href="' + waLink("Hi Kravna Bakery! I need help with my order.") + '" target="_blank" rel="noopener">WhatsApp support</a>' +
      '<p style="font-size:12.5px;color:var(--muted);text-align:center">' + esc(s.openingHours || "") + "</p>" +
      "</div></div>";
    const gw = body.querySelector("[data-go-wish]");
    if (gw) gw.addEventListener("click", (e) => { e.preventDefault(); closeSheets(); openSheet("wishlist"); });
  }

  function ensureOverlays() {
    if ($("#search-overlay")) return;
    const wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="search-overlay" id="search-overlay" role="dialog" aria-modal="true" aria-label="Search products">' +
      '<div class="search-panel"><div class="search-panel__input">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
      '<input type="search" placeholder="Search cakes, patties, nimco, mithai…" aria-label="Search products">' +
      '<button class="icon-btn search-close" aria-label="Close search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      "</div><div class=\"search-panel__results\" id=\"search-results\"></div></div></div>" +
      '<div class="sheet-backdrop" id="sheet-backdrop"></div>' +
      '<div class="sheet" id="sheet-wishlist" role="dialog" aria-modal="true" aria-label="Wishlist">' +
      '<div class="sheet__head"><h2>Wishlist</h2><button class="close" data-close aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="sheet__body"></div></div>' +
      '<div class="sheet" id="sheet-account" role="dialog" aria-modal="true" aria-label="Account">' +
      '<div class="sheet__head"><h2>Account</h2><button class="close" data-close aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="sheet__body"></div></div>';
    document.body.appendChild(wrap);
    $("#sheet-backdrop").addEventListener("click", closeSheets);
    $$("[data-close]").forEach((b) => b.addEventListener("click", closeSheets));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeSearch(); closeSheets(); openMobileNav(false); } });
    bindSearch();
  }

  /* ================= ICONS ================= */
  const LOGO_MARK = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#190f0b"/><rect x="14" y="43" width="36" height="6" rx="2.5" fill="#901817"/><path d="M14 43 L21 25 L28 34 L32 17 L36 34 L43 25 L50 43 Z" fill="#c99a54"/><circle cx="32" cy="14.5" r="2" fill="#f5f1ea"/><circle cx="21" cy="22.5" r="1.7" fill="#f5f1ea"/><circle cx="43" cy="22.5" r="1.7" fill="#f5f1ea"/></svg>';
  const PLUS_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>';
  const CART_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>';
  const HEART_ICON = '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  const TRASH_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>';
  const USER_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>';

  /* ================= PRODUCT CARD ================= */
  function card(p, opts) {
    opts = opts || {};
    const onDark = opts.onDark ? " on-dark" : "";
    const flags = [];
    if (p.popular) flags.push('<span class="badge badge--popular">Popular</span>');
    if (p.new) flags.push('<span class="badge badge--new">New</span>');
    if (p.discount) flags.push('<span class="badge badge--off">' + p.discount + "% OFF</span>");
    const wished = isWished(p.id) ? " is-active" : "";
    const summary = variantSummary(p);
    const hasVariant = p.variants && p.variants.length;
    const addBtn = hasVariant
      ? '<button class="product-card__add" data-goto="' + p.slug + '" aria-label="Choose options for ' + esc(p.name) + '">' + PLUS_ICON + "</button>"
      : '<button class="product-card__add" data-add="' + p.id + '" aria-label="Add ' + esc(p.name) + ' to cart">' + PLUS_ICON + "</button>";
    return '<article class="product-card' + onDark + '">' +
      '<div class="product-card__media">' +
      '<a href="product.html?slug=' + p.slug + '" aria-label="' + esc(p.name) + '">' +
      '<img src="' + p.images[0] + '" alt="' + esc(p.name) + '" data-cat="' + p.category + '" data-label="' + esc(p.name) + '" loading="lazy">' +
      "</a>" +
      '<div class="product-card__flags">' + flags.join("") + "</div>" +
      '<button class="product-card__wish' + wished + '" data-wish="' + p.id + '" aria-label="Toggle wishlist for ' + esc(p.name) + '" aria-pressed="' + (wished ? "true" : "false") + '">' + HEART_ICON + "</button>" +
      "</div>" +
      '<div class="product-card__body">' +
      '<span class="product-card__cat">' + esc(catName(p.category)) + "</span>" +
      '<h3 class="product-card__name"><a href="product.html?slug=' + p.slug + '">' + esc(p.name) + "</a></h3>" +
      (summary ? '<span class="product-card__meta">' + esc(summary) + "</span>" : "") +
      '<div class="product-card__foot">' +
      '<span class="price"><span class="cur">' + esc(currency().symbol) + "</span>" + Math.round(p.price).toLocaleString("en-US") +
      (p.compareAtPrice ? '<span class="price--compare">' + fmt(p.compareAtPrice) + "</span>" : "") +
      "</span>" + addBtn + "</div></div></article>";
  }

  function bindCards(scope) {
    (scope ? $$("[data-add], [data-wish], [data-goto]", scope) : $$("[data-add], [data-wish], [data-goto]")).forEach((b) => {
      if (b.dataset.add) b.addEventListener("click", () => {
        const p = itemById(b.dataset.add);
        if (!p) return;
        addToCart(p, defaultOptions(p), [], 1);
      });
      if (b.dataset.wish) b.addEventListener("click", () => toggleWishlist(b.dataset.wish));
      if (b.dataset.goto) b.addEventListener("click", () => { location.href = "product.html?slug=" + b.dataset.goto; });
    });
  }
  function renderWishButtons() {
    $$("[data-wish]").forEach((b) => {
      const on = isWished(b.dataset.wish);
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  /* ================= Error state helper ================= */
  function renderError(host, what, retryFn) {
    host.innerHTML = '<div class="error-state">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>' +
      "<p>Unable to load " + esc(what) + " right now.</p>" +
      '<button class="btn btn--outline btn--sm retry" type="button">Try again</button></div>';
    host.querySelector(".retry").addEventListener("click", () => { location.reload(); });
  }

  /* ==========================================================================
     PAGE: HOME
     ========================================================================== */
  function initHome() {
    if (S.errors.settings || S.errors.items) {
      renderError($("#home-root"), "products", null);
      return;
    }
    const s = S.settings;
    renderHero(s);
    renderCategories();
    renderWhyChoose();
    renderOccasions();
    renderBestsellers();
    renderDeals();
    renderCustomStrip();
    renderTreats();
    renderSavory();
    renderPakistani();
    renderGallery();
    renderTestimonials();
    renderFinalCta();
    injectLocalBusiness();
  }

  function renderHero(s) {
    const host = $("#hero");
    if (!host) return;
    const slides = (s.heroSettings && s.heroSettings.slides) || [];
    if (!slides.length) { host.innerHTML = ""; return; }
    const badges = (s.heroSettings.trustBadges || []).map((b) =>
      '<span class="tbadge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + trustIcon(b.icon) + "</svg>" + esc(b.label) + "</span>").join("");
    host.innerHTML =
      '<div class="hero__track" id="hero-track">' +
      slides.map((sl) =>
        '<div class="hero__slide"><div class="hero__bg"><img src="' + sl.image + '" alt="' + esc(sl.alt || "") + '" data-cat="cakes" data-label="Kravna Bakery"></div>' +
        '<div class="container hero__inner"><div class="hero__copy">' +
        '<span class="eyebrow">' + esc(sl.eyebrow || "") + "</span>" +
        '<h1 class="hero-headline">' + heroHeadline(sl.headline) + "</h1>" +
        '<p class="sub">' + esc(sl.subtext || "") + "</p>" +
        '<div class="hero__ctas">' +
        '<a class="btn btn--primary btn--lg" href="' + esc(sl.ctaPrimary.href) + '">' + esc(sl.ctaPrimary.label) + "</a>" +
        '<a class="btn btn--outline-light btn--lg" href="' + esc(sl.ctaSecondary.href) + '">' + esc(sl.ctaSecondary.label) + "</a>" +
        "</div>" +
        '<div class="hero__trust">' + badges + "</div>" +
        "</div>" +
        '<div class="hero__visual"><div class="frame"><img src="' + sl.image + '" alt="' + esc(sl.alt || "") + '" data-cat="cakes"></div>' +
        '<div class="float-card float-1"><span class="ico">' + CART_ICON + '</span><div><b>Delivery & Pickup</b><span>Available daily</span></div></div>' +
        '<div class="float-card float-2"><span class="ico">' + HEART_ICON + '</span><div><b>Custom Designs</b><span>Made to order</span></div></div>' +
        "</div></div></div>").join("") +
      "</div>" +
      '<div class="hero__dots" id="hero-dots">' + slides.map((_, i) => '<button type="button" data-slide="' + i + '" aria-label="Go to slide ' + (i + 1) + '"></button>').join("") + "</div>";
    initCarousel(slides.length, (s.heroSettings && s.heroSettings.carouselIntervalMs) || 6000);
  }
  function heroHeadline(h) {
    // Force exactly 2 lines with a literal <br>; line 2 wrapped in a red span.
    const lines = String(h || "").split("\n");
    const l1 = lines[0] || "";
    const l2 = lines.slice(1).join(" ");
    let html = esc(l1);
    if (l2) html += '<br><span style="color:#901817;">' + esc(l2) + "</span>";
    return html;
  }
  function trustIcon(icon) {
    const map = {
      sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
      star: '<path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z"/>',
      cake: '<path d="M4 21h16M5 21v-8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8M12 11V8m-3-1h6m-6 0c0-1.5 1.5-2 3-2s3 .5 3 2m-6 0v0"/>',
      chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.9-.9L3 20l1-5.1a8.4 8.4 0 1 1 17-3.4z"/>'
    };
    return map[icon] || map.star;
  }
  function initCarousel(count, interval) {
    const track = $("#hero-track");
    const dots = $$("#hero-dots button");
    if (!track) return;
    let idx = 0, timer;
    function go(i) {
      idx = (i + count) % count;
      track.style.transform = "translateX(-" + idx * 100 + "%)";
      dots.forEach((d, di) => d.classList.toggle("is-active", di === idx));
    }
    function play() { stop(); timer = setInterval(() => go(idx + 1), interval); }
    function stop() { if (timer) clearInterval(timer); }
    dots.forEach((d) => d.addEventListener("click", () => { go(Number(d.dataset.slide)); play(); }));
    const hero = $("#hero");
    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", play);
    hero.addEventListener("focusin", stop);
    hero.addEventListener("focusout", play);
    go(0); play();
  }

  function renderCategories() {
    const host = $("#home-categories");
    if (!host) return;
    const cats = topCategories().filter((c) => c.displayOnHomepage).slice(0, 9);
    if (!cats.length) { host.innerHTML = ""; return; }
    host.innerHTML = cats.map((c) =>
      '<a class="cat-tile" href="shop.html?category=' + c.slug + '">' +
      '<img src="' + (c.image || "") + '" alt="' + esc(c.name) + '" data-cat="' + c.slug + '" data-label="' + esc(c.name) + '" loading="lazy">' +
      '<span class="cat-tile__label"><b>' + esc(c.name) + "</b><span>Shop now</span></span></a>").join("");
  }

  const OCCASIONS = [
    { label: "All", tag: null, icon: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 14l.9 2.6 2.6.4-2.6.9L19 20.5l-.9-2.6-2.6-.4 2.6-.9z"/>' },
    { label: "Birthday", tag: "birthday", icon: '<path d="M4 21h16"/><path d="M5 21v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/><path d="M8 15v-3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/><circle cx="12" cy="6" r="1.6"/>' },
    { label: "Anniversary", tag: "anniversary", icon: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>' },
    { label: "Wedding", tag: "wedding", icon: '<circle cx="9" cy="13.5" r="5.2"/><circle cx="15" cy="13.5" r="5.2"/><path d="M12 6.5l1.3 2 2.2.3-1.6 1.6.4 2.2-2.3-1.2-2.3 1.2.4-2.2L8.5 8.8l2.2-.3z"/>' },
    { label: "Eid", tag: "eid", icon: '<path d="M20 12.5A8 8 0 1 1 11.5 4a6.5 6.5 0 0 0 8.5 8.5z"/><path d="M18 3l.6 1.7L20.5 5l-1.9.3L18 7l-.6-1.7L15.5 5l1.9-.3z"/>' },
    { label: "Graduation", tag: "graduation", icon: '<path d="M12 4 2 9l10 5 10-5z"/><path d="M6 11.5V16c0 1.6 2.7 3 6 3s6-1.4 6-3v-4.5"/><path d="M22 9v4"/>' },
    { label: "Baby Celebration", tag: "baby", icon: '<circle cx="12" cy="7.5" r="4.5"/><path d="M12 12v9"/><path d="M8.5 21h7"/>' }
  ];
  function renderWhyChoose() {
    const host = $("#home-why");
    if (!host) return;
    const s = S.settings || {};
    const badges = (s.heroSettings && s.heroSettings.trustBadges) || [];
    const desc = {
      "Freshly Made": "Baked the same day, never stale.",
      "Premium Ingredients": "Only the best goes into every bake.",
      "Custom Designs": "Your idea, made into a real cake.",
      "WhatsApp Support": "Order and confirm quickly on WhatsApp."
    };
    host.innerHTML = badges.map((b) =>
      '<div class="why-card"><div class="ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + trustIcon(b.icon) + "</svg></div>" +
      "<h3>" + esc(b.label) + "</h3><p>" + esc(desc[b.label] || "A promise we keep with every order.") + "</p></div>").join("");
  }

  function renderOccasions() {
    const host = $("#home-occasions");
    if (!host) return;
    const tabs = $("#occasion-tabs");
    if (tabs) {
      tabs.innerHTML = OCCASIONS.map((o, i) =>
        '<button type="button" data-tag="' + (o.tag || "") + '" class="' + (i === 0 ? "is-active" : "") + '" aria-pressed="' + (i === 0) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + o.icon + "</svg>" +
        esc(o.label) + "</button>").join("");
      tabs.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
        tabs.querySelectorAll("button").forEach((x) => { x.classList.remove("is-active"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("is-active"); b.setAttribute("aria-pressed", "true");
        renderOccasionResults(b.dataset.tag);
      }));
    }
    renderOccasionResults(null);
  }
  function renderOccasionResults(tag) {
    const host = $("#home-occasions");
    const grid = host.querySelector(".occasions__results") || $("#occasion-results");
    if (!grid) return;
    let list = tag ? S.items.filter((i) => (i.tags || []).includes(tag)) : S.items.filter((i) => i.featured || i.popular);
    list = list.slice(0, 8);
    if (!list.length) { grid.innerHTML = '<p class="sub" style="grid-column:1/-1">No products found for this occasion yet.</p>'; return; }
    grid.innerHTML = list.map((i) => card(i)).join("");
    bindCards(grid);
  }

  function renderBestsellers() {
    const host = $("#home-bestsellers");
    if (!host) return;
    const list = S.items.filter((i) => i.popular).slice(0, 8);
    if (!list.length) { host.innerHTML = ""; return; }
    host.innerHTML = list.map((i) => card(i)).join("");
    bindCards(host);
  }

  function renderDeals() {
    const host = $("#home-deals");
    if (!host) return;
    if (S.errors.deals) { renderError(host, "deals", null); return; }
    const active = S.deals.filter((d) => {
      if (!d.active) return false;
      const now = Date.now();
      if (d.startDate && new Date(d.startDate).getTime() > now) return false;
      if (d.endDate && new Date(d.endDate).getTime() < now) return false;
      return true;
    }).slice(0, 6);
    if (!active.length) { host.innerHTML = '<p class="sub">No active deals right now — check back soon!</p>'; return; }
    host.innerHTML = active.map((d) => {
      const items = (d.includedItems || []).map((id) => itemById(id)).filter(Boolean).map((i) => esc(i.name));
      const off = d.compareAtPrice ? Math.round((1 - d.price / d.compareAtPrice) * 100) : null;
      return '<article class="deal-card">' +
        '<div class="deal-card__media"><img src="' + d.image + '" alt="' + esc(d.title) + '" data-cat="cakes" data-label="' + esc(d.title) + '" loading="lazy">' +
        (off ? '<span class="badge badge--deal deal-card__badge">' + off + "% OFF</span>" : "") +
        "</div>" +
        '<div class="deal-card__body"><h3 class="deal-card__title">' + esc(d.title) + "</h3>" +
        '<p class="deal-card__desc">' + esc(d.description || "") + "</p>" +
        '<div class="deal-card__items">' + items.map((n) => "<span>" + n + "</span>").join("") + "</div>" +
        '<div class="deal-card__foot"><span class="price price--lg">' + fmt(d.price) + "</span>" +
        '<a class="btn btn--primary btn--sm" href="cart.html" data-deal-add=\'' + JSON.stringify(d.includedItems || []).replace(/'/g, "&#39;") + '\'>Order Now</a></div>' +
        "</div></article>";
    }).join("");
    host.querySelectorAll("[data-deal-add]").forEach((b) => b.addEventListener("click", (e) => {
      e.preventDefault();
      let ids = [];
      try { ids = JSON.parse(b.dataset.dealAdd); } catch (err) { ids = []; }
      ids.forEach((id) => { const p = itemById(id); if (p) addToCart(p, defaultOptions(p), [], 1); });
      if (ids.length) { toast("Deal added to cart", "View cart", "cart.html"); }
    }));
  }

  function renderCustomStrip() {
    const host = $("#home-custom");
    if (!host) return;
    const examples = ["Kids", "Character", "Photo", "Floral", "Wedding", "Anniversary", "Theme"];
    host.innerHTML =
      '<div class="split"><div class="split__media"><img src="images/categories/custom-cakes.jpg" alt="Custom decorated cakes" data-cat="custom-cakes" data-label="Custom cakes" loading="lazy"></div>' +
      '<div class="split__copy"><h2>Your Idea. Our Cake.</h2>' +
      "<p>Tell us your dream cake — a character, a photo, a theme — and our bakers will bring it to life, fresh and on time.</p>" +
      '<div class="chip-list">' + examples.map((x) => "<span>" + esc(x) + "</span>").join("") + "</div>" +
      '<a class="btn btn--primary btn--lg" href="custom-cake.html">Create your custom cake</a></div></div>';
  }

  function renderTreats() {
    const host = $("#home-treats");
    if (!host) return;
    const ids = ["chocolate-brownie", "chocolate-chip-cookies", "cupcakes", "chocolate-pastry", "donuts", "cake-slice"];
    const list = ids.map(itemById).filter(Boolean);
    host.innerHTML = list.map((i) => card(i)).join("");
    bindCards(host);
  }

  function renderSavory() {
    const host = $("#home-savory");
    if (!host) return;
    const ids = ["chicken-patties", "chicken-samosa", "chicken-rolls", "chicken-bread", "mini-pizza", "sandwich"];
    const list = ids.map(itemById).filter(Boolean);
    host.innerHTML = list.map((i) => card(i)).join("");
    bindCards(host);
  }

  function renderPakistani() {
    const host = $("#home-pakistani");
    if (!host) return;
    const cats = ["nimco-snacks", "rusks", "mithai", "biscuits-cookies", "breads-buns"];
    const ids = ["mixed-nimco", "cake-rusk", "nankhatai", "khatai", "sheermal", "bakarkhani", "gulab-jamun", "gajar-halwa"];
    const list = ids.map(itemById).filter(Boolean);
    host.innerHTML = '<div class="chips-row">' + cats.map((c) => '<a class="chip" href="shop.html?category=' + c + '">' + esc(catName(c)) + "</a>").join("") + "</div>" +
      '<div class="shelf">' + list.map((i) => card(i, { onDark: true })).join("") + "</div>";
    bindCards(host);
  }

  function renderGallery() {
    const host = $("#home-gallery");
    if (!host) return;
    const g = (S.settings && S.settings.gallery) || [];
    if (!g.length) { host.innerHTML = ""; return; }
    host.innerHTML = g.map((x) =>
      '<figure><img src="' + x.image + '" alt="' + esc(x.caption || "Kravna Bakery") + '" data-cat="cakes" data-label="' + esc(x.caption || "") + '" loading="lazy"><figcaption>' + esc(x.caption || "") + "</figcaption></figure>").join("");
  }

  function renderTestimonials() {
    const host = $("#home-testimonials");
    if (!host) return;
    const t = (S.settings && S.settings.testimonials) || [];
    if (!t.length) { host.innerHTML = ""; return; }
    host.innerHTML = t.map((x) =>
      '<article class="testi-card"><div class="stars" aria-hidden="true">★★★★★</div>' +
      "<blockquote>" + esc(x.text) + "</blockquote>" +
      '<div class="who"><span class="avatar">' + esc((x.name || "A")[0]) + '</span><div><b>' + esc(x.name) + "</b>" +
      (x.note ? '<span>' + esc(x.note) + "</span>" : "") + "</div></div></article>").join("");
  }

  function renderFinalCta() {
    const host = $("#home-final-cta");
    if (!host) return;
    host.innerHTML =
      '<div class="final-cta"><h2>Ready to make it sweet?</h2>' +
      "<p>Order your favourite cakes and treats for delivery or pickup today.</p>" +
      '<div class="ctas"><a class="btn btn--primary btn--lg" href="shop.html">Order Now</a>' +
      '<a class="btn btn--outline-light btn--lg" href="' + waLink("Hi Kravna Bakery! I'd like to place an order.") + '" target="_blank" rel="noopener">WhatsApp Kravna</a></div></div>';
  }

  /* ==========================================================================
     PAGE: SHOP
     ========================================================================== */
  const SHOP_STATE = {
    q: "", cat: null, sub: null, flags: { popular: false, featured: false, new: false, instock: false, sale: false },
    min: null, max: null, sort: "featured", view: null, page: 1
  };
  const PER_PAGE = 12;

  function initShop() {
    const params = new URLSearchParams(location.search);
    SHOP_STATE.q = params.get("q") || "";
    SHOP_STATE.cat = params.get("category") || null;
    SHOP_STATE.sub = params.get("subcategory") || null;
    SHOP_STATE.view = params.get("view") || null;
    SHOP_STATE.sort = params.get("sort") || "featured";
    if (params.get("popular") === "1") SHOP_STATE.flags.popular = true;
    if (params.get("featured") === "1") SHOP_STATE.flags.featured = true;

    if (S.errors.items || S.errors.categories) {
      renderError($("#shop-grid"), "products", null);
      return;
    }

    const title = $("#shop-title");
    if (SHOP_STATE.view === "deals") {
      if (title) title.textContent = "Sweet Deals";
      renderShopFilters(true);
      renderDealsGrid();
      return;
    }
    if (SHOP_STATE.cat) {
      const c = catBySlug(SHOP_STATE.cat);
      if (title) title.textContent = c ? c.name : "Shop";
    } else if (SHOP_STATE.q) {
      if (title) title.textContent = "Search";
    }
    renderShopFilters();
    bindShopToolbar();
    applyShop();
  }

  function bindShopToolbar() {
    const sortSel = $("#shop-sort");
    if (sortSel) {
      sortSel.value = SHOP_STATE.sort;
      sortSel.addEventListener("change", () => { SHOP_STATE.sort = sortSel.value; SHOP_STATE.page = 1; applyShop(); });
    }
    const ft = $("#filter-toggle");
    if (ft) ft.addEventListener("click", () => {
      const side = $("#shop-side");
      side.classList.toggle("open");
      ft.setAttribute("aria-expanded", String(side.classList.contains("open")));
    });
    const fc = $("#shop-side");
    if (fc) {
      const closeBtn = fc.querySelector(".filter-close");
      if (closeBtn) closeBtn.addEventListener("click", () => { fc.classList.remove("open"); });
    }
  }

  function renderShopFilters(dealsOnly) {
    const side = $("#shop-side");
    if (!side) return;
    if (dealsOnly) { side.innerHTML = '<a class="btn btn--dark btn--block" href="shop.html">← Back to shop</a>'; return; }

    const tops = topCategories();
    const catsHTML = tops.map((c) => {
      const count = S.items.filter((i) => i.category === c.slug).length;
      return '<li><label><input type="radio" name="cat" value="' + c.slug + '"' + (SHOP_STATE.cat === c.slug ? " checked" : "") + "><span>" + esc(c.name) + '</span><span class="count">' + count + "</span></label></li>";
    }).join("");

    let subHTML = "";
    if (SHOP_STATE.cat) {
      const subs = subCategories(SHOP_STATE.cat);
      if (subs.length) subHTML = subs.map((c) =>
        '<li><label><input type="checkbox" name="sub" value="' + c.slug + '"' + (SHOP_STATE.sub === c.slug ? " checked" : "") + "><span>" + esc(c.name) + "</span></label></li>").join("");
    }

    const flagDefs = [
      ["popular", "Popular"], ["featured", "Featured"], ["new", "New"], ["instock", "In stock"], ["sale", "On sale"]
    ];
    const flagsHTML = flagDefs.map(([k, l]) =>
      '<li><label><input type="checkbox" name="flag" value="' + k + '"' + (SHOP_STATE.flags[k] ? " checked" : "") + "><span>" + l + "</span></label></li>").join("");

    side.innerHTML =
      '<button class="btn btn--dark btn--block filter-close" type="button">Close filters</button>' +
      '<div class="filter-group"><h3>Category</h3><ul>' + catsHTML + '<li><label><input type="radio" name="cat" value=""' + (!SHOP_STATE.cat ? " checked" : "") + "><span>All categories</span></label></li></ul></div>" +
      (subHTML ? '<div class="filter-group"><h3>Sub-category</h3><ul>' + subHTML + "</ul></div>" : "") +
      '<div class="filter-group"><h3>Filter</h3><ul>' + flagsHTML + "</ul></div>" +
      '<div class="filter-group"><h3>Price (Rs.)</h3><div class="price-range">' +
      '<div class="inputs"><input type="number" id="price-min" placeholder="Min" min="0" value="' + (SHOP_STATE.min != null ? SHOP_STATE.min : "") + '"><span>–</span><input type="number" id="price-max" placeholder="Max" min="0" value="' + (SHOP_STATE.max != null ? SHOP_STATE.max : "") + '"></div>' +
      '<button class="btn btn--outline btn--sm" id="price-apply" type="button">Apply</button></div></div>' +
      '<button class="btn btn--ghost btn--block" id="clear-filters" type="button">Clear all filters</button>';

    side.querySelectorAll("input[name='cat']").forEach((r) => r.addEventListener("change", () => {
      SHOP_STATE.cat = r.value || null; SHOP_STATE.sub = null; SHOP_STATE.page = 1;
      renderShopFilters(); applyShop();
    }));
    side.querySelectorAll("input[name='sub']").forEach((r) => r.addEventListener("change", () => {
      SHOP_STATE.sub = r.checked ? r.value : null; SHOP_STATE.page = 1; applyShop();
    }));
    side.querySelectorAll("input[name='flag']").forEach((r) => r.addEventListener("change", () => {
      SHOP_STATE.flags[r.value] = r.checked; SHOP_STATE.page = 1; applyShop();
    }));
    $("#price-apply").addEventListener("click", () => {
      SHOP_STATE.min = $("#price-min").value ? Number($("#price-min").value) : null;
      SHOP_STATE.max = $("#price-max").value ? Number($("#price-max").value) : null;
      SHOP_STATE.page = 1; applyShop();
    });
    $("#clear-filters").addEventListener("click", () => {
      Object.keys(SHOP_STATE.flags).forEach((k) => SHOP_STATE.flags[k] = false);
      SHOP_STATE.cat = null; SHOP_STATE.sub = null; SHOP_STATE.min = null; SHOP_STATE.max = null;
      SHOP_STATE.q = ""; SHOP_STATE.page = 1;
      renderShopFilters(); applyShop();
    });
  }

  function filterProducts() {
    let list = S.items.slice();
    if (SHOP_STATE.cat) list = list.filter((i) => i.category === SHOP_STATE.cat);
    if (SHOP_STATE.sub) list = list.filter((i) => i.subcategory === SHOP_STATE.sub);
    if (SHOP_STATE.q) {
      const q = SHOP_STATE.q.toLowerCase();
      list = list.filter((i) => [i.name, i.category, i.subcategory, (i.tags || []).join(" "), i.description]
        .filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    if (SHOP_STATE.flags.popular) list = list.filter((i) => i.popular);
    if (SHOP_STATE.flags.featured) list = list.filter((i) => i.featured);
    if (SHOP_STATE.flags.new) list = list.filter((i) => i.new);
    if (SHOP_STATE.flags.instock) list = list.filter((i) => i.available !== false);
    if (SHOP_STATE.flags.sale) list = list.filter((i) => i.compareAtPrice || i.discount);
    if (SHOP_STATE.min != null) list = list.filter((i) => Number(i.price) >= SHOP_STATE.min);
    if (SHOP_STATE.max != null) list = list.filter((i) => Number(i.price) <= SHOP_STATE.max);
    return list;
  }

  function sortProducts(list) {
    const s = SHOP_STATE.sort;
    const by = { featured: (i) => (i.featured ? 2 : 0) + (i.popular ? 1 : 0), "price-low": (i) => i.price, "price-high": (i) => -i.price, name: (i) => i.name, newest: (i) => (i.new ? 0 : 1) };
    return list.slice().sort((a, b) => {
      if (s === "name") return a.name.localeCompare(b.name);
      if (s === "price-low") return by[s](a) - by[s](b);
      if (s === "price-high") return by[s](a) - by[s](b);
      if (s === "newest") return by[s](a) - by[s](b);
      return by.featured(b) - by.featured(a);
    });
  }

  function applyShop() {
    const grid = $("#shop-grid");
    if (!grid) return;
    const filtered = filterProducts();
    const sorted = sortProducts(filtered);
    const count = sorted.length;
    $("#shop-count").innerHTML = "<b>" + count + "</b> product" + (count === 1 ? "" : "s") + (SHOP_STATE.q ? ' for “' + esc(SHOP_STATE.q) + "”" : "");
    renderActiveChips();

    if (!count) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty__icon">' + HEART_ICON + '</div><h2>No products found</h2><p>Try a different search or clear your filters.</p><button class="btn btn--primary" id="shop-clear">Clear filters</button></div>';
      $("#shop-clear").addEventListener("click", () => {
        Object.keys(SHOP_STATE.flags).forEach((k) => SHOP_STATE.flags[k] = false);
        SHOP_STATE.cat = null; SHOP_STATE.sub = null; SHOP_STATE.min = null; SHOP_STATE.max = null; SHOP_STATE.q = ""; SHOP_STATE.page = 1;
        renderShopFilters(); applyShop();
      });
      $("#load-more").style.display = "none";
      return;
    }

    const pageItems = sorted.slice(0, SHOP_STATE.page * PER_PAGE);
    grid.innerHTML = pageItems.map((i) => card(i)).join("");
    bindCards(grid);
    const more = $("#load-more");
    more.style.display = sorted.length > pageItems.length ? "inline-flex" : "none";
    more.onclick = () => { SHOP_STATE.page++; applyShop(); window.scrollTo({ top: document.body.scrollHeight * 0.7, behavior: "smooth" }); };
  }

  function renderActiveChips() {
    const host = $("#active-chips");
    if (!host) return;
    const chips = [];
    if (SHOP_STATE.cat) chips.push({ label: catName(SHOP_STATE.cat), clear: () => { SHOP_STATE.cat = null; SHOP_STATE.sub = null; } });
    if (SHOP_STATE.sub) chips.push({ label: catName(SHOP_STATE.sub), clear: () => { SHOP_STATE.sub = null; } });
    if (SHOP_STATE.q) chips.push({ label: '“' + SHOP_STATE.q + '”', clear: () => { SHOP_STATE.q = ""; } });
    if (SHOP_STATE.min != null || SHOP_STATE.max != null) chips.push({ label: "Price: " + (SHOP_STATE.min != null ? SHOP_STATE.min : "0") + "–" + (SHOP_STATE.max != null ? SHOP_STATE.max : "∞"), clear: () => { SHOP_STATE.min = null; SHOP_STATE.max = null; } });
    Object.keys(SHOP_STATE.flags).forEach((k) => { if (SHOP_STATE.flags[k]) chips.push({ label: k, clear: () => { SHOP_STATE.flags[k] = false; } }); });
    if (!chips.length) { host.innerHTML = ""; return; }
    host.innerHTML = chips.map((c, i) =>
      '<span class="chip">' + esc(c.label) + '<button type="button" data-clear="' + i + '" aria-label="Remove filter ' + esc(c.label) + '">✕</button></span>').join("");
    host.querySelectorAll("[data-clear]").forEach((b) => b.addEventListener("click", () => {
      chips[Number(b.dataset.clear)].clear(); SHOP_STATE.page = 1; renderShopFilters(); applyShop();
    }));
  }

  function renderDealsGrid() {
    const grid = $("#shop-grid");
    $("#shop-count").innerHTML = "";
    $("#load-more").style.display = "none";
    const active = S.deals.filter((d) => d.active);
    $("#shop-grid").innerHTML = '<div class="deals-grid" style="grid-column:1/-1">' + active.map((d) => {
      const items = (d.includedItems || []).map((id) => itemById(id)).filter(Boolean).map((i) => esc(i.name));
      return '<article class="deal-card"><div class="deal-card__media"><img src="' + d.image + '" alt="' + esc(d.title) + '" data-cat="cakes" data-label="' + esc(d.title) + '" loading="lazy"><span class="badge badge--deal deal-card__badge">Deal</span></div>' +
        '<div class="deal-card__body"><h3 class="deal-card__title">' + esc(d.title) + '</h3><p class="deal-card__desc">' + esc(d.description || "") + "</p>" +
        '<div class="deal-card__items">' + items.map((n) => "<span>" + n + "</span>").join("") + "</div>" +
        '<div class="deal-card__foot"><span class="price price--lg">' + fmt(d.price) + "</span>" +
        '<a class="btn btn--primary btn--sm" href="cart.html" data-deal-add=\'' + JSON.stringify(d.includedItems || []).replace(/'/g, "&#39;") + '\'>Order Now</a></div></div></article>';
    }).join("") + "</div>";
    grid.querySelectorAll("[data-deal-add]").forEach((b) => b.addEventListener("click", (e) => {
      e.preventDefault();
      let ids = [];
      try { ids = JSON.parse(b.dataset.dealAdd); } catch (err) { ids = []; }
      ids.forEach((id) => { const p = itemById(id); if (p) addToCart(p, defaultOptions(p), [], 1); });
      if (ids.length) { toast("Deal added to cart", "View cart", "cart.html"); }
    }));
  }

  /* ==========================================================================
     PAGE: PRODUCT
     ========================================================================== */
  let PDP = null;

  function initProduct() {
    const params = new URLSearchParams(location.search);
    const slug = params.get("slug");
    const p = itemBySlug(slug);
    const root = $("#product-root");
    if (!p) {
      root.innerHTML = '<div class="notfound"><div class="code">404</div><h1>Product not found</h1><p>This product may have been removed or the link is wrong.</p><a class="btn btn--primary" href="shop.html">Browse shop</a></div>';
      document.title = "Product not found — Kravna Bakery";
      return;
    }
    PDP = { p, sel: defaultOptions(p), addons: [], qty: 1, editKey: params.get("edit") || null };
    // pre-load from edit
    if (PDP.editKey) {
      const item = getCart().find((c) => c.key === PDP.editKey);
      if (item) { PDP.sel = item.sel; PDP.addons = item.addons; PDP.qty = item.qty; }
    }
    document.title = p.name + " — Kravna Bakery";
    renderProduct();
    renderRelated(p);
    injectProductSchema(p);
  }

  function renderProduct() {
    const root = $("#product-root");
    const p = PDP.p;
    const s = S.settings || {};

    // breadcrumb + category
    root.innerHTML =
      '<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span class="sep">/</span><a href="shop.html">Shop</a><span class="sep">/</span><a href="shop.html?category=' + p.category + '">' + esc(catName(p.category)) + '</a><span class="sep">/</span><span>' + esc(p.name) + "</span></nav>" +
      '<div class="pdp">' +
      '<div class="pdp__gallery"><div class="pdp__main">' +
      '<div class="pdp__flags">' + (p.popular ? '<span class="badge badge--popular">Popular</span>' : "") + (p.new ? '<span class="badge badge--new">New</span>' : "") + (p.discount ? '<span class="badge badge--off">' + p.discount + "% OFF</span>" : "") + "</div>" +
      '<img id="pdp-img" src="' + p.images[0] + '" alt="' + esc(p.name) + '" data-cat="' + p.category + '" data-label="' + esc(p.name) + '">' +
      "</div>" +
      (p.images.length > 1 ? '<div class="pdp__thumbs">' + p.images.map((im, i) => '<button type="button" data-thumb="' + i + '" class="' + (i === 0 ? "is-active" : "") + '" aria-label="View image ' + (i + 1) + '"><img src="' + im + '" alt="" data-cat="' + p.category + '"></button>').join("") + "</div>" : "") +
      "</div>" +
      '<div class="pdp__info">' +
      '<a class="cat-link" href="shop.html?category=' + p.category + '">' + esc(catName(p.category)) + "</a>" +
      "<h1>" + esc(p.name) + "</h1>" +
      (p.rating != null ? '<div class="pdp__rating"><span class="stars">★★★★★</span><span>' + p.rating + " rating · " + p.reviewCount + " reviews</span></div>" : "") +
      '<div style="display:flex;align-items:center;gap:14px;margin:6px 0 14px;flex-wrap:wrap">' +
      '<button class="pdp-wish' + (isWished(p.id) ? " is-active" : "") + '" id="pdp-wish" aria-pressed="' + isWished(p.id) + '" aria-label="Toggle wishlist">' + HEART_ICON + "<span>Save</span></button>" +
      "</div>" +
      '<div class="pdp__price-row"><span class="price price--lg" id="pdp-price">' + fmt(unitPrice(p, PDP.sel, PDP.addons)) + "</span>" +
      (p.compareAtPrice ? '<span class="price--compare">' + fmt(p.compareAtPrice) + "</span>" : "") +
      '<span class="pdp__avail" id="pdp-avail"><span class="dot"></span><span id="pdp-avail-txt">In stock</span></span></div>' +
      '<p class="pdp__desc">' + esc(p.description || "") + "</p>" +
      '<div id="pdp-variants"></div>' +
      '<div id="pdp-addons"></div>' +
      '<div class="opt-group"><label>Quantity</label><div class="qty-stepper" id="pdp-qty"><button type="button" data-step="-1" aria-label="Decrease quantity">−</button><span class="qty" id="pdp-qty-val">1</span><button type="button" data-step="1" aria-label="Increase quantity">+</button></div></div>' +
      '<div class="pdp__subtotal">Subtotal: <b id="pdp-subtotal">' + fmt(unitPrice(p, PDP.sel, PDP.addons) * PDP.qty) + "</b></div>" +
      '<div class="pdp__actions"><div class="qty-stepper qty-spacer" style="border-color:transparent"></div><button class="btn btn--primary btn--lg" id="pdp-add">' + CART_ICON + "<span>Add to Cart</span></button></div>" +
      '<button class="btn btn--dark btn--lg btn--block" id="pdp-buy">Buy Now</button>' +
      '<a class="btn btn--outline btn--lg btn--block pdp__wa" id="pdp-wa" target="_blank" rel="noopener">WhatsApp Order</a>' +
      '<div class="trust-strip"><span class="t"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg> Freshly made</span><span class="t"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> On-time delivery</span><span class="t"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg> Premium ingredients</span></div>' +
      "</div></div>";

    // wishlist toggle
    const wishBtn = $("#pdp-wish", root);
    if (wishBtn) wishBtn.addEventListener("click", () => {
      toggleWishlist(p.id);
      const on = isWished(p.id);
      wishBtn.classList.toggle("is-active", on);
      wishBtn.setAttribute("aria-pressed", String(on));
    });

    // thumbs
    $$("[data-thumb]", root).forEach((b) => b.addEventListener("click", () => {
      $("#pdp-img").src = p.images[Number(b.dataset.thumb)];
      $$("[data-thumb]", root).forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
    }));

    renderVariants();
    renderAddons();

    // qty
    $$("#pdp-qty button", root).forEach((b) => b.addEventListener("click", () => {
      PDP.qty = Math.max(1, PDP.qty + Number(b.dataset.step));
      $("#pdp-qty-val").textContent = PDP.qty;
      updatePdpPrice();
    }));

    const addBtn = $("#pdp-add", root);
    const buyBtn = $("#pdp-buy", root);
    const addLabel = addBtn.querySelector("span");
    if (PDP.editKey) addLabel.textContent = "Update Cart Item";
    addBtn.addEventListener("click", () => { pdpAdd(); });
    buyBtn.addEventListener("click", () => {
      if (!pdpAdd(true)) return;
      location.href = "checkout.html";
    });
    $("#pdp-wa", root).addEventListener("click", (e) => {
      e.preventDefault();
      const msg = "Hi Kravna Bakery! I'd like to order: *" + p.name + "*" + (PDP.sel && Object.keys(PDP.sel).length ? " (" + Object.values(PDP.sel).join(", ") + ")" : "") + " x" + PDP.qty + " — " + fmt(unitPrice(p, PDP.sel, PDP.addons) * PDP.qty);
      window.open(waLink(msg), "_blank");
    });

    updatePdpPrice();
  }

  function renderVariants() {
    const host = $("#pdp-variants");
    if (!host) return;
    if (!PDP.p.variants || !PDP.p.variants.length) { host.innerHTML = ""; return; }
    host.innerHTML = PDP.p.variants.map((v) =>
      '<div class="opt-group"><label>' + esc(v.variantType) + ' <small>choose one</small></label>' +
      '<div class="opt-options">' + v.options.map((o) => {
        const oos = isZeroStock(o.stock);
        const active = PDP.sel[v.variantType] === o.label;
        return '<button type="button" class="opt-btn' + (active ? " is-active" : "") + (oos ? " is-oos" : "") + '"' +
          (oos ? ' aria-disabled="true"' : "") + ' data-vt="' + esc(v.variantType) + '" data-val="' + esc(o.label) + '">' +
          esc(o.label) + (oos ? "" : "") + "</button>";
      }).join("") + "</div></div>").join("");
    $$(".opt-btn", host).forEach((b) => b.addEventListener("click", () => {
      PDP.sel[b.dataset.vt] = b.dataset.val;
      renderVariants();
      updatePdpPrice();
    }));
  }

  function renderAddons() {
    const host = $("#pdp-addons");
    if (!host) return;
    if (!PDP.p.addons || !PDP.p.addons.length) { host.innerHTML = ""; return; }
    host.innerHTML = PDP.p.addons.map((a) => {
      const isToggle = a.type === "toggle";
      const isText = a.type === "text";
      const isNote = a.type === "note";
      if (isNote) return "";
      const existing = PDP.addons.find((x) => x.id === a.id);
      const active = isToggle && existing;
      if (isText) {
        return '<div class="addon-row" style="flex-direction:column;align-items:stretch"><div class="l"><b>' + esc(a.label) + '</b></div>' +
          '<input class="addon-text" type="text" placeholder="' + esc(a.placeholder || "") + '" data-addon-text="' + a.id + '" value="' + esc(existing ? existing.value || "" : "") + '" aria-label="' + esc(a.label) + '"></div>';
      }
      return '<div class="addon-row"><div class="l"><span class="toggle"><input type="checkbox" data-addon="' + a.id + '"' + (active ? " checked" : "") + ' aria-label="' + esc(a.label) + '"><span class="track"></span></span><div><b>' + esc(a.label) + "</b>" +
        (a.price ? '<span>+' + fmt(a.price) + "</span>" : '<span>Free</span>') + "</div></div>" +
        '<span class="price-tag">' + (a.price ? fmt(a.price) : "Free") + "</span></div>";
    }).join("");
    $$("[data-addon]", host).forEach((c) => c.addEventListener("change", () => {
      if (c.checked) PDP.addons.push({ id: c.dataset.addon, label: c.dataset.addon, price: PDP.p.addons.find((a) => a.id === c.dataset.addon).price, type: "toggle" });
      else PDP.addons = PDP.addons.filter((a) => a.id !== c.dataset.addon);
      updatePdpPrice();
    }));
    $$("[data-addon-text]", host).forEach((c) => c.addEventListener("input", () => {
      let a = PDP.addons.find((x) => x.id === c.dataset.addonText);
      if (!a) { a = { id: c.dataset.addonText, label: c.dataset.addonText, price: 0, type: "text", value: "" }; PDP.addons.push(a); }
      a.value = c.value;
    }));
  }

  function updatePdpPrice() {
    const p = PDP.p;
    const price = unitPrice(p, PDP.sel, PDP.addons);
    const el = $("#pdp-price");
    if (el) el.textContent = fmt(price);
    const sub = $("#pdp-subtotal");
    if (sub) sub.textContent = fmt(price * PDP.qty);
    const oos = isOOS(p, PDP.sel);
    const avail = $("#pdp-avail");
    if (avail) {
      avail.classList.toggle("is-out", oos);
      $("#pdp-avail-txt").textContent = oos ? "Currently unavailable" : (p.available === false ? "Out of stock" : "In stock");
    }
    const addBtn = $("#pdp-add");
    const buyBtn = $("#pdp-buy");
    [addBtn, buyBtn].forEach((b) => { if (b) b.disabled = oos || p.available === false; });
  }

  function pdpAdd(silent) {
    const p = PDP.p;
    if (isOOS(p, PDP.sel) || p.available === false) { toast("This option is currently unavailable"); return false; }
    const addons = PDP.addons.filter((a) => !(a.type === "text" && !a.value)).map((a) => ({
      id: a.id, label: a.label, price: a.price, type: a.type, value: a.value || ""
    }));
    const newItem = {
      key: signature(p, PDP.sel, addons), id: p.id, slug: p.slug, name: p.name,
      image: p.images[0], cat: p.category, sel: PDP.sel, addons: addons, qty: PDP.qty,
      unitPrice: unitPrice(p, PDP.sel, addons)
    };
    if (PDP.editKey) { replaceCartItem(PDP.editKey, newItem); if (!silent) toast("Cart updated", "View cart", "cart.html"); }
    else { addToCart(p, PDP.sel, addons, PDP.qty); }
    return true;
  }

  function renderRelated(p) {
    const host = $("#related-products");
    if (!host) return;
    const related = S.items.filter((i) => i.id !== p.id && (i.category === p.category || i.subcategory === p.subcategory)).slice(0, 4);
    const list = related.length ? related : S.items.filter((i) => i.id !== p.id).slice(0, 4);
    if (!list.length) { host.innerHTML = ""; return; }
    host.innerHTML = list.map((i) => card(i)).join("");
    bindCards(host);
  }

  /* ==========================================================================
     PAGE: CART
     ========================================================================== */
  function initCart() {
    const host = $("#cart-root");
    renderCart();
  }
  function renderCart() {
    const host = $("#cart-root");
    if (!host) return;
    const cart = getCart();
    if (!cart.length) {
      host.innerHTML = '<div class="empty"><div class="empty__icon">' + CART_ICON + '</div><h2>Your cart is empty</h2><p>Browse our fresh cakes, pastries and treats and add something delicious.</p><a class="btn btn--primary" href="shop.html">Continue shopping</a></div>';
      return;
    }
    const itemsHTML = cart.map((c) => {
      const desc = describeItemForCart(c);
      return '<div class="cart-item">' +
        '<a class="cart-item__img" href="product.html?slug=' + c.slug + '"><img src="' + c.image + '" alt="' + esc(c.name) + '" data-cat="' + c.cat + '" data-label="' + esc(c.name) + '"></a>' +
        '<div class="cart-item__info"><h3 class="cart-item__name"><a href="product.html?slug=' + c.slug + '">' + esc(c.name) + "</a></h3>" +
        (desc ? '<p class="cart-item__opts">' + desc + "</p>" : "") +
        '<span class="cart-item__price">' + fmt(c.unitPrice) + " each</span></div>" +
        '<div class="cart-item__actions"><div class="qty-stepper"><button type="button" data-dec="' + c.key + '" aria-label="Decrease quantity">−</button><span class="qty">' + c.qty + '</span><button type="button" data-inc="' + c.key + '" aria-label="Increase quantity">+</button></div>' +
        '<span class="cart-item__price">' + fmt(c.unitPrice * c.qty) + "</span>" +
        '<a class="remove-btn" href="product.html?slug=' + c.slug + '&edit=' + encodeURIComponent(c.key) + '" aria-label="Edit options" title="Edit options"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg></a>' +
        '<button class="remove-btn" data-rm="' + c.key + '" aria-label="Remove ' + esc(c.name) + '">' + TRASH_ICON + "</button></div></div>";
    }).join("");
    const t = cartTotals();
    host.innerHTML =
      '<div class="cart-layout"><div><h2 style="margin-bottom:18px">Your cart (' + cartCount() + " item" + (cartCount() === 1 ? "" : "s") + ')</h2>' +
      '<div class="cart-items">' + itemsHTML + "</div>" +
      '<a class="btn btn--ghost" href="shop.html" style="margin-top:18px">← Continue shopping</a></div>' +
      '<aside class="summary"><h2>Order summary</h2>' +
      '<div class="summary__row"><span>Subtotal</span><b>' + fmt(t.subtotal) + "</b></div>" +
      '<div class="summary__row"><span>Delivery fee</span><b>' + fmt(t.fee) + "</b></div>" +
      '<div class="summary__row"><span>Discount</span><b>' + fmt(t.discount) + "</b></div>" +
      '<div class="summary__row summary__row--total"><span>Total</span><b>' + fmt(t.total) + "</b></div>" +
      '<p class="note">Delivery fee is configurable and may vary by area.</p>' +
      '<a class="btn btn--primary btn--block btn--lg" href="checkout.html">Proceed to Checkout</a>' +
      '<p class="note" style="text-align:center">Cash on Delivery · Easypaisa · JazzCash</p></aside></div>';
    host.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", () => { updateCartQty(b.dataset.inc, (getCart().find((c) => c.key === b.dataset.inc)?.qty || 1) + 1); renderCart(); }));
    host.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => { updateCartQty(b.dataset.dec, (getCart().find((c) => c.key === b.dataset.dec)?.qty || 1) - 1); renderCart(); }));
    host.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { removeFromCart(b.dataset.rm); renderCart(); }));
  }
  function describeItemForCart(c) {
    const parts = [];
    (Object.keys(c.sel || {})).forEach((k) => { if (c.sel[k]) parts.push("<b>" + esc(k) + ":</b> " + esc(c.sel[k])); });
    (c.addons || []).forEach((a) => { if (a.type === "text" && a.value) parts.push("<b>Message:</b> “" + esc(a.value) + "”"); else if (a.type === "toggle") parts.push(esc(a.label)); });
    return parts.join("<br>");
  }

  /* ==========================================================================
     PAGE: CHECKOUT
     ========================================================================== */
  function initCheckout() {
    const host = $("#checkout-root");
    if (!host) return;
    const cart = getCart();
    if (!cart.length) {
      host.innerHTML = '<div class="empty"><div class="empty__icon">' + CART_ICON + '</div><h2>Nothing to checkout</h2><p>Your cart is empty. Add some treats first!</p><a class="btn btn--primary" href="shop.html">Browse products</a></div>';
      return;
    }
    const s = S.settings || {};
    const cs = s.checkoutSettings || {};
    const payments = (s.paymentMethods || []).filter((p) => p.enabled);
    const areas = (s.deliveryAreas || []);
    const slots = (cs.deliveryTimeSlots || []);

    const minDate = minLeadDate(cs.minimumLeadTimeHours);
    const today = minDate.toISOString().split("T")[0];

    host.innerHTML =
      '<div class="checkout-layout"><div>' +
      '<div class="form-card"><h2><span class="step">1</span> Your details</h2>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="co-name">Full name <span class="req">*</span></label><input id="co-name" type="text" autocomplete="name" placeholder="Your name"><span class="err" data-err="name"></span></div>' +
      '<div class="field"><label for="co-phone">Phone <span class="req">*</span></label><input id="co-phone" type="tel" autocomplete="tel" placeholder="03XX XXXXXXX"><span class="err" data-err="phone"></span></div>' +
      '<div class="field"><label for="co-wa">WhatsApp number</label><input id="co-wa" type="tel" placeholder="Same as phone if empty"><span class="err" data-err="wa"></span></div>' +
      '<div class="field"><label for="co-email">Email (optional)</label><input id="co-email" type="email" autocomplete="email" placeholder="you@example.com"><span class="err" data-err="email"></span></div>' +
      "</div></div>" +
      '<div class="form-card"><h2><span class="step">2</span> Delivery method</h2>' +
      '<div class="radio-cards">' +
      '<label class="radio-card"><input type="radio" name="method" value="delivery" checked><span class="card"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg><span><b>Home Delivery</b><span>' + fmt(s.deliveryFee) + " delivery fee</span></span></span></label>" +
      '<label class="radio-card"><input type="radio" name="method" value="pickup"><span class="card"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l1.5-5h15L21 9M4 9h16v11H4zM9 20v-6h6v6"/></svg><span><b>Store Pickup</b><span>Free — collect from bakery</span></span></span></label>' +
      "</div>" +
      '<div id="delivery-fields" class="form-grid" style="margin-top:18px">' +
      '<div class="field field--full"><label for="co-address">Address <span class="req">*</span></label><input id="co-address" type="text" autocomplete="street-address" placeholder="House, street, area"><span class="err" data-err="address"></span></div>' +
      '<div class="field"><label for="co-area">Area <span class="req">*</span></label><select id="co-area"><option value="">Select area</option>' + areas.map((a) => '<option>' + esc(a) + "</option>").join("") + "</select><span class=\"err\" data-err=\"area\"></span></div>" +
      '<div class="field"><label for="co-city">City <span class="req">*</span></label><input id="co-city" type="text" value="' + esc(s.city || "") + '"><span class="err" data-err="city"></span></div>' +
      '<div class="field"><label for="co-date">Delivery date <span class="req">*</span></label><input id="co-date" type="date" min="' + today + '"><span class="err" data-err="date"></span></div>' +
      '<div class="field"><label for="co-time">Preferred time</label><select id="co-time"><option value="">Select time slot</option>' + slots.map((t) => '<option>' + esc(t) + "</option>").join("") + "</select></div>" +
      "</div></div>" +
      '<div class="form-card"><h2><span class="step">3</span> Payment method</h2>' +
      '<div class="radio-cards">' + payments.map((p, i) =>
        '<label class="radio-card"><input type="radio" name="payment" value="' + p.id + '"' + (i === 0 ? " checked" : "") + '><span class="card"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg><span><b>' + esc(p.name) + '</b><span>' + esc(p.note || "") + "</span></span></span></label>").join("") +
      "</div></div>" +
      '<div class="form-card"><h2><span class="step">4</span> Special instructions</h2>' +
      '<div class="field"><label for="co-notes">Notes (optional)</label><textarea id="co-notes" placeholder="e.g. ring the bell, write message on cake…"></textarea></div>' +
      "</div></div>" +
      '<aside class="summary"><h2>Order summary</h2><div id="co-items">' + cart.map((c) =>
        '<div class="summary__row"><span>' + esc(c.name) + " × " + c.qty + "</span><b>" + fmt(c.unitPrice * c.qty) + "</b></div>").join("") + "</div>" +
      '<div class="summary__row"><span>Subtotal</span><b id="co-subtotal">' + fmt(cartTotals().subtotal) + "</b></div>" +
      '<div class="summary__row"><span>Delivery fee</span><b id="co-fee">' + fmt(cartTotals().fee) + "</b></div>" +
      '<div class="summary__row summary__row--total"><span>Total</span><b id="co-total">' + fmt(cartTotals().total) + "</b></div>" +
      '<button class="btn btn--primary btn--block btn--lg" id="co-submit">Place Order</button>' +
      '<p class="note">Placing this order opens WhatsApp with your order details for confirmation.</p></aside></div>';

    const methodToggle = () => {
      const isDelivery = document.querySelector('input[name="method"]:checked').value === "delivery";
      const df = $("#delivery-fields");
      df.style.display = isDelivery ? "" : "none";
      const fee = isDelivery ? (Number(s.deliveryFee) || 0) : 0;
      $("#co-fee").textContent = fmt(fee);
      $("#co-total").textContent = fmt(cartTotals().subtotal + fee);
    };
    $$('input[name="method"]').forEach((r) => r.addEventListener("change", methodToggle));
    methodToggle();

    $("#co-submit").addEventListener("click", () => submitCheckout(s));
  }

  function minLeadDate(hours) {
    const d = new Date();
    if (hours) d.setHours(d.getHours() + Number(hours));
    else d.setDate(d.getDate() + 1);
    return d;
  }

  function submitCheckout(s) {
    const val = {
      name: $("#co-name").value.trim(),
      phone: $("#co-phone").value.trim(),
      wa: $("#co-wa").value.trim(),
      email: $("#co-email").value.trim(),
      method: document.querySelector('input[name="method"]:checked').value,
      address: $("#co-address").value.trim(),
      area: $("#co-area").value,
      city: $("#co-city").value.trim(),
      date: $("#co-date").value,
      time: $("#co-time").value,
      payment: document.querySelector('input[name="payment"]:checked').value,
      notes: $("#co-notes").value.trim()
    };
    const errs = {};
    if (!val.name) errs.name = "Please enter your name";
    if (!val.phone) errs.phone = "Please enter your phone number";
    else if (!/^0?3\d{2}[\s-]?\d{7}$/.test(val.phone.replace(/[^0-9]/g, "") === val.phone ? val.phone : val.phone.replace(/[^0-9]/g, "")) && val.phone.replace(/[^0-9]/g, "").length < 10) errs.phone = "Enter a valid phone number";
    if (val.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val.email)) errs.email = "Enter a valid email";
    if (val.method === "delivery") {
      if (!val.address) errs.address = "Please enter your address";
      if (!val.area) errs.area = "Please select your area";
      if (!val.city) errs.city = "Please enter your city";
      if (!val.date) errs.date = "Please choose a delivery date";
      else {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const chosen = new Date(val.date + "T00:00:00");
        if (chosen < today) errs.date = "Delivery date cannot be in the past";
      }
    }
    // show inline errors
    $$("[data-err]").forEach((el) => { el.textContent = errs[el.dataset.err] || ""; });
    $$(".field").forEach((f) => { const inp = f.querySelector("input,select"); if (inp) f.classList.toggle("has-error", !!errs[inp.id.replace("co-", "")] || (inp.id === "co-area" && errs.area)); });
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      const el = $("#co-" + first) || $("#co-area") || $("#co-address");
      if (el) el.focus();
      toast("Please fix the highlighted fields");
      return;
    }

    const orderRef = makeOrderRef();
    const cart = getCart();
    const t = cartTotals();
    const fee = val.method === "delivery" ? (Number(s.deliveryFee) || 0) : 0;
    const total = t.subtotal + fee;
    const paymentName = (s.paymentMethods || []).find((p) => p.id === val.payment)?.name || val.payment;

    const lines = [
      "🍰 *KRAVNA BAKERY — NEW ORDER*",
      "",
      "*Order #:* " + orderRef,
      "*Name:* " + val.name,
      "*Phone:* " + val.phone,
      val.wa ? "*WhatsApp:* " + val.wa : "",
      "*Delivery:* " + (val.method === "delivery" ? "Home Delivery" : "Store Pickup"),
      val.method === "delivery" ? "*Address:* " + val.address + ", " + val.area + ", " + val.city : "",
      val.method === "delivery" && val.date ? "*Date:* " + val.date + (val.time ? " (" + val.time + ")" : "") : "",
      "",
      "*Items:*",
      ...cart.map((c, i) => (i + 1) + ". " + c.name + (Object.keys(c.sel || {}).length ? " (" + Object.values(c.sel).join(", ") + ")" : "") +
        (c.addons && c.addons.length ? " [" + c.addons.map((a) => a.type === "text" ? a.value : a.label).filter(Boolean).join(", ") + "]" : "") +
        " × " + c.qty + " = " + fmt(c.unitPrice * c.qty)),
      "",
      "*Subtotal:* " + fmt(t.subtotal),
      "*Delivery:* " + fmt(fee),
      "*Total:* " + fmt(total),
      "*Payment:* " + paymentName,
      val.notes ? "*Instructions:* " + val.notes : ""
    ].filter(Boolean);

    saveJSON(LS_LAST, { ref: orderRef, date: new Date().toISOString(), total: total });
    const url = waLink(lines.join("\n"));
    const host = $("#checkout-root");
    host.innerHTML =
      '<div class="order-success"><div class="big-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg></div>' +
      "<h2>Order placed!</h2><p>Your order reference is</p><div class=\"ref\">" + esc(orderRef) + "</div>" +
      "<p>We've prepared your order details. Send them to us on WhatsApp to confirm.</p>" +
      '<div class="ctas" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px">' +
      '<a class="btn btn--primary btn--lg" href="' + url + '" target="_blank" rel="noopener">Send order on WhatsApp</a>' +
      '<a class="btn btn--outline btn--lg" href="shop.html">Continue shopping</a></div>' +
      '<p class="note" style="margin-top:16px;color:var(--muted)">Note: this is a local reference number for your convenience — final confirmation happens on WhatsApp.</p></div>';
    setCart([]);
  }

  function makeOrderRef() {
    const d = new Date();
    const ymd = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    const rnd = String(Math.floor(1000 + Math.random() * 9000));
    return "KRV-" + ymd + "-" + rnd;
  }

  /* ==========================================================================
     PAGE: CUSTOM CAKE
     ========================================================================== */
  function initCustomCake() {
    const host = $("#custom-cake-root");
    if (!host) return;
    const s = S.settings || {};
    const cs = s.checkoutSettings || {};
    const slots = (cs.deliveryTimeSlots || []);
    const minDate = minLeadDate(cs.minimumLeadTimeHours);
    const today = minDate.toISOString().split("T")[0];

    host.innerHTML =
      '<div class="form-card" style="max-width:760px;margin:0 auto">' +
      '<h2>Design your custom cake</h2>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="cc-type">Cake type / flavor <span class="req">*</span></label><select id="cc-type"><option value="">Select flavor</option>' +
      ["Chocolate", "Chocolate Fudge", "Red Velvet", "Black Forest", "Biscoff / Lotus", "Strawberry", "Pineapple", "Vanilla / Fresh Cream", "Coffee / Mocha", "Fresh Fruit"].map((f) => "<option>" + f + "</option>").join("") +
      "</select><span class=\"err\" data-err=\"type\"></span></div>" +
      '<div class="field"><label for="cc-size">Size <span class="req">*</span></label><select id="cc-size"><option value="">Select size</option>' +
      ["0.5 kg", "1 kg", "2 kg", "3 kg", "4 kg"].map((x) => "<option>" + x + "</option>").join("") +
      "</select><span class=\"err\" data-err=\"size\"></span></div>" +
      '<div class="field field--full"><label for="cc-theme">Theme <span class="req">*</span></label><input id="cc-theme" type="text" placeholder="e.g. Spiderman, floral, gold & white wedding…"><span class="err" data-err="theme"></span></div>' +
      '<div class="field field--full"><label for="cc-message">Cake message</label><input id="cc-message" type="text" placeholder="Happy Birthday Ayesha!"><span class="err" data-err="message"></span></div>' +
      '<div class="field field--full"><label>Reference image (optional)</label>' +
      '<div class="file-upload"><input id="cc-image" type="file" accept="image/*" aria-label="Upload reference image"><div class="drop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><b>Tap to upload a reference photo</b><div>It will be shown as a preview (not uploaded yet)</div></div></div><div id="cc-preview"></div></div>' +
      '<div class="field"><label for="cc-date">Delivery date <span class="req">*</span></label><input id="cc-date" type="date" min="' + today + '"><span class="err" data-err="date"></span></div>' +
      '<div class="field"><label for="cc-time">Preferred time</label><select id="cc-time"><option value="">Select time slot</option>' + slots.map((t) => '<option>' + esc(t) + "</option>").join("") + "</select></div>" +
      '<div class="field"><label for="cc-event">Event type (optional)</label><select id="cc-event"><option value="">Select event</option>' +
      ["Birthday", "Anniversary", "Wedding", "Eid", "Graduation", "Baby Celebration", "Other"].map((x) => "<option>" + x + "</option>").join("") + "</select></div>" +
      '<div class="field"><label for="cc-budget">Budget (optional, Rs.)</label><input id="cc-budget" type="number" min="0" placeholder="e.g. 5000"></div>' +
      '<div class="field"><label for="cc-servings">Servings (optional)</label><input id="cc-servings" type="number" min="1" placeholder="e.g. 15"></div>' +
      '<div class="field field--full"><label for="cc-notes">Special instructions</label><textarea id="cc-notes" placeholder="Colors, dietary needs, anything else…"></textarea></div>' +
      "</div>" +
      '<button class="btn btn--primary btn--lg btn--block" id="cc-submit" style="margin-top:22px">Send Custom Cake Request</button>' +
      '<p class="note" style="text-align:center;margin-top:12px">Your request opens WhatsApp with all details for confirmation.</p></div>';

    // image preview
    $("#cc-image").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      const prev = $("#cc-preview");
      if (!file) { prev.innerHTML = ""; return; }
      if (file.size > 4 * 1024 * 1024) { toast("Please choose an image under 4MB"); e.target.value = ""; return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        prev.innerHTML = '<div class="preview-thumb"><img src="' + ev.target.result + '" alt="Reference preview"><button type="button" id="cc-rm-img" aria-label="Remove image">✕</button></div>';
        $("#cc-rm-img").addEventListener("click", () => { e.target.value = ""; prev.innerHTML = ""; });
      };
      reader.readAsDataURL(file);
    });

    $("#cc-submit").addEventListener("click", () => {
      const v = {
        type: $("#cc-type").value, size: $("#cc-size").value, theme: $("#cc-theme").value.trim(),
        message: $("#cc-message").value.trim(), date: $("#cc-date").value, time: $("#cc-time").value,
        event: $("#cc-event").value, budget: $("#cc-budget").value, servings: $("#cc-servings").value,
        notes: $("#cc-notes").value.trim()
      };
      const errs = {};
      if (!v.type) errs.type = "Please choose a flavor";
      if (!v.size) errs.size = "Please choose a size";
      if (!v.theme) errs.theme = "Please describe the theme";
      if (!v.date) errs.date = "Please choose a delivery date";
      else {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(v.date + "T00:00:00") < today) errs.date = "Delivery date cannot be in the past";
      }
      $$("[data-err]", host).forEach((el) => { el.textContent = errs[el.dataset.err] || ""; });
      $$(".field", host).forEach((f) => { const inp = f.querySelector("input,select"); if (inp) f.classList.toggle("has-error", !!errs[(inp.id || "").replace("cc-", "")]); });
      if (Object.keys(errs).length) { toast("Please fix the highlighted fields"); const first = Object.keys(errs)[0]; const el = $("#cc-" + first); if (el) el.focus(); return; }

      const lines = [
        "🎂 *KRAVNA BAKERY — CUSTOM CAKE REQUEST*", "",
        "*Flavor:* " + v.type, "*Size:* " + v.size, "*Theme:* " + v.theme,
        v.message ? "*Message:* " + v.message : "",
        "*Delivery date:* " + v.date + (v.time ? " (" + v.time + ")" : ""),
        v.event ? "*Event:* " + v.event : "",
        v.budget ? "*Budget:* Rs. " + v.budget : "",
        v.servings ? "*Servings:* " + v.servings : "",
        v.notes ? "*Instructions:* " + v.notes : "",
        "", "I will share my reference photo on WhatsApp. Please confirm the price and availability. Thank you!"
      ].filter(Boolean);
      window.open(waLink(lines.join("\n")), "_blank");
      toast("Request ready — sending via WhatsApp");
    });
  }

  /* ==========================================================================
     PAGES: ABOUT / CONTACT / 404
     ========================================================================== */
  function initAbout() {
    const s = S.settings || {};
    const host = $("#about-root");
    if (!host) return;
    if (!s.businessName) { renderError(host, "business information", null); return; }
    host.innerHTML =
      '<div class="about-grid">' +
      '<div><h2 style="font-size:34px;text-transform:uppercase;margin-bottom:16px">Baked fresh, made for every moment</h2>' +
      "<p>Kravna Bakery is a modern Pakistani bakery crafting cakes, desserts, breads, savory treats, rusks, nimco and traditional mithai — all fresh, every day. From a single pastry to a grand wedding cake, everything is made to order with premium ingredients.</p>" +
      '<div class="stats-row"><div class="stat"><b>100+</b><span>Products baked fresh</span></div><div class="stat"><b>10+</b><span>Categories to explore</span></div><div class="stat"><b>Daily</b><span>Delivery & pickup</span></div></div></div>' +
      '<div class="split__media"><img src="images/banners/hero-3.jpg" alt="Fresh bakery products" data-cat="cakes" data-label="Fresh bakery products"></div></div>' +
      '<div class="section section--tight"><div class="why-grid">' +
      '<div class="why-card"><div class="ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg></div><h3>Freshly made</h3><p>Baked the same day, never stale.</p></div>' +
      '<div class="why-card"><div class="ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z"/></svg></div><h3>Premium ingredients</h3><p>Only the best goes into every bake.</p></div>' +
      '<div class="why-card"><div class="ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21h16M5 21v-8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8M12 11V8m-3-1h6"/></svg></div><h3>Custom designs</h3><p>Your idea, made into a real cake.</p></div>' +
      '<div class="why-card"><div class="ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.9-.9L3 20l1-5.1a8.4 8.4 0 1 1 17-3.4z"/></svg></div><h3>WhatsApp support</h3><p>Order and confirm quickly on WhatsApp.</p></div>' +
      "</div></div>";
  }

  function initContact() {
    const s = S.settings || {};
    const host = $("#contact-root");
    if (!host) return;
    host.innerHTML =
      '<div class="contact-grid">' +
      '<div class="contact-cards">' +
      '<div class="contact-card"><span class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.9-.9L3 20l1-5.1a8.4 8.4 0 1 1 17-3.4z"/></svg></span><div><b>WhatsApp</b><a href="' + waLink("Hi Kravna Bakery!") + '" target="_blank" rel="noopener">' + esc(s.whatsapp || "0313 3801788") + "</a></div></div>" +
      '<div class="contact-card"><span class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg></span><div><b>Phone</b><span>' + esc(s.phone || "[ADD PHONE NUMBER]") + "</span></div></div>" +
      '<div class="contact-card"><span class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg></span><div><b>Email</b><span>' + esc(s.email || "[ADD EMAIL]") + "</span></div></div>" +
      '<div class="contact-card"><span class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span><div><b>Address</b><span>' + esc(s.address || "[ADD ADDRESS]") + ", " + esc(s.city || "") + "</span></div></div>" +
      '<div class="contact-card"><span class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span><div><b>Opening hours</b><span>' + esc(s.openingHours || "Mon – Sun: 8:00 AM – 10:00 PM") + "</span></div></div>" +
      "</div>" +
      '<div class="form-card"><h2>Send us a message</h2>' +
      '<div class="field" style="margin-bottom:14px"><label for="ct-name">Your name</label><input id="ct-name" type="text"></div>' +
      '<div class="field" style="margin-bottom:14px"><label for="ct-msg">Message</label><textarea id="ct-msg"></textarea></div>' +
      '<button class="btn btn--primary btn--block" id="ct-send">Send on WhatsApp</button></div></div>';
    $("#ct-send").addEventListener("click", () => {
      const name = $("#ct-name").value.trim() || "there";
      const msg = $("#ct-msg").value.trim();
      if (!msg) { toast("Please write a message first"); $("#ct-msg").focus(); return; }
      window.open(waLink("Hi Kravna Bakery! My name is " + name + ".\n\n" + msg), "_blank");
    });
  }

  /* ==========================================================================
     SEO: structured data
     ========================================================================== */
  function injectJSONLD(obj) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(obj);
    document.head.appendChild(script);
  }
  function injectLocalBusiness() {
    const s = S.settings || {};
    const data = {
      "@context": "https://schema.org", "@type": "Bakery",
      name: s.businessName || "Kravna Bakery",
      image: (s.logo && s.logo.image) ? s.logo.image : "images/logo/kravna-logo.svg",
      telephone: s.phone && s.phone !== "[ADD PHONE NUMBER]" ? s.phone : ("+92" + (s.whatsappIntl || "923133801788")),
      priceRange: "Rs. 40 – Rs. 7500",
      address: s.address && s.address !== "[ADD ADDRESS]" ? {
        "@type": "PostalAddress", streetAddress: s.address,
        addressLocality: s.city || "", addressCountry: "PK"
      } : undefined,
      openingHours: s.openingHours || undefined,
      sameAs: s.socialLinks ? Object.values(s.socialLinks) : undefined
    };
    injectJSONLD(data);
  }
  function injectProductSchema(p) {
    const s = S.settings || {};
    injectJSONLD({
      "@context": "https://schema.org", "@type": "Product",
      name: p.name, image: p.images,
      description: p.description || p.shortDescription || "",
      category: catName(p.category),
      brand: { "@type": "Brand", name: s.businessName || "Kravna Bakery" },
      offers: {
        "@type": "Offer", priceCurrency: "PKR",
        price: p.price, availability: "https://schema.org/InStock",
        url: location.href
      }
    });
  }

  /* ==========================================================================
     INIT
     ========================================================================== */
  async function init() {
    try {
      renderShell();
      await loadData();
      renderHeader();
      renderFooter();
      renderBottomNav();
      renderCartCount();
      renderWishCount();

      switch (S.page) {
        case "home": initHome(); break;
        case "shop": initShop(); break;
        case "product": initProduct(); break;
        case "cart": initCart(); break;
        case "checkout": initCheckout(); break;
        case "custom-cake": initCustomCake(); break;
        case "about": initAbout(); break;
        case "contact": initContact(); break;
        default: break;
      }
    } catch (err) {
      console.error("Page init error:", err);
    } finally {
      // re-render wish/cart badges if any page changed them
      try { renderCartCount(); } catch (e) {}
      document.body.classList.add("ready");
    }
  }

  function renderShell() {
    // ensure required placeholders exist
    ["site-header", "site-footer", "bottom-nav"].forEach((id) => {
      if (!$("#" + id)) {
        const el = document.createElement("div");
        el.id = id;
        document.body.appendChild(el);
      }
    });
    // mobile slide-in nav drawer + backdrop (body-level so they escape the
    // sticky header's stacking context and can layer above it correctly)
    if (!$("#mobile-nav")) {
      const mn = document.createElement("nav");
      mn.id = "mobile-nav";
      mn.className = "mobile-nav";
      mn.setAttribute("aria-label", "Mobile menu");
      document.body.appendChild(mn);
    }
    if (!$("#nav-backdrop")) {
      const bd = document.createElement("div");
      bd.id = "nav-backdrop";
      bd.className = "nav-backdrop";
      document.body.appendChild(bd);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
