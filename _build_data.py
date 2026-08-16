#!/usr/bin/env python3
"""
KRAVNA BAKERY — data generator (maintenance helper).
Generates data/settings.json, data/categories.json, data/deals.json, data/items.json.

The JSON files themselves are the single source of truth and are what the site
reads at runtime. Re-run this script only when you want to bulk-edit the catalog.
"""
import json, os

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA, exist_ok=True)

# ---------------------------------------------------------------------------
# SETTINGS
# ---------------------------------------------------------------------------
settings = {
    "businessName": "Kravna Bakery",
    "shortName": "KRAVNA",
    "tagline": "Cakes, desserts & celebrations",
    "heroEyebrow": "CAKES \u2022 DESSERTS \u2022 CELEBRATIONS",

    # WhatsApp — display (local) format + international format for wa.me links
    "whatsapp": "0313 3801788",
    "whatsappIntl": "923133801788",
    "phone": "[ADD PHONE NUMBER]",
    "email": "[ADD EMAIL]",
    "address": "[ADD ADDRESS]",
    "city": "Multan",
    "openingHours": "Mon \u2013 Sun: 8:00 AM \u2013 10:00 PM",

    "deliveryAreas": ["Multan City", "Cantt", "Bosan Road", "Gulgasht", "Shah Rukn-e-Alam"],
    "deliveryFee": 200,
    "freeDeliveryThreshold": 3000,

    "socialLinks": {
        "facebook": "https://facebook.com/kravnabakery",
        "instagram": "https://instagram.com/kravnabakery",
        "tiktok": "https://tiktok.com/@kravnabakery"
    },

    "currency": {"code": "PKR", "symbol": "Rs.", "thousandSep": ","},

    "developerCredit": "Designed & Developed by Imran AF",

    "logo": {"image": "images/logo/kravna-logo.svg", "alt": "Kravna Bakery"},
    "favicon": "images/logo/kravna-favicon.svg",

    "heroSettings": {
        "slides": [
            {
                "image": "images/banners/hero-1.jpg",
                "alt": "Signature chocolate celebration cake",
                "eyebrow": "CAKES \u2022 DESSERTS \u2022 CELEBRATIONS",
                "headline": "MAKE YOUR MOMENT\nSWEETER.",
                "subtext": "Birthday cakes, custom creations and irresistible treats made for every celebration.",
                "ctaPrimary": {"label": "ORDER A CAKE", "href": "shop.html?category=cakes"},
                "ctaSecondary": {"label": "CUSTOM CAKE", "href": "custom-cake.html"}
            },
            {
                "image": "images/banners/hero-2.jpg",
                "alt": "Birthday cake with glowing candles",
                "eyebrow": "FRESHLY MADE EVERY DAY",
                "headline": "EVERY CELEBRATION\nDESERVES KRAVNA.",
                "subtext": "From a single pastry to a grand wedding cake \u2014 baked fresh, delivered on time.",
                "ctaPrimary": {"label": "ORDER A CAKE", "href": "shop.html?category=cakes"},
                "ctaSecondary": {"label": "CUSTOM CAKE", "href": "custom-cake.html"}
            },
            {
                "image": "images/banners/hero-3.jpg",
                "alt": "Spread of fresh bakery treats",
                "eyebrow": "DELIVERY & PICKUP AVAILABLE",
                "headline": "BAKED FOR YOUR\nEVERYDAY TOO.",
                "subtext": "Fresh breads, savory patties, rusks, nimco and mithai \u2014 all from one bakery.",
                "ctaPrimary": {"label": "ORDER A CAKE", "href": "shop.html?category=cakes"},
                "ctaSecondary": {"label": "CUSTOM CAKE", "href": "custom-cake.html"}
            }
        ],
        "trustBadges": [
            {"label": "Freshly Made", "icon": "sparkles"},
            {"label": "Premium Ingredients", "icon": "star"},
            {"label": "Custom Designs", "icon": "cake"},
            {"label": "WhatsApp Support", "icon": "chat"}
        ],
        "carouselIntervalMs": 6000
    },

    "checkoutSettings": {
        "minimumLeadTimeHours": 3,
        "deliveryTimeSlots": [
            "10:00 AM \u2013 12:00 PM",
            "12:00 PM \u2013 2:00 PM",
            "2:00 PM \u2013 4:00 PM",
            "4:00 PM \u2013 6:00 PM",
            "6:00 PM \u2013 8:00 PM",
            "8:00 PM \u2013 10:00 PM"
        ],
        "storePickupEnabled": True,
        "pickupNote": "Collect from our bakery. Please bring your order number."
    },

    "paymentMethods": [
        {"id": "cod", "name": "Cash on Delivery", "enabled": True, "note": "Pay in cash when your order arrives."},
        {"id": "easypaisa", "name": "Easypaisa", "enabled": True, "note": "Send payment to 0313 3801788 and share the confirmation on WhatsApp."},
        {"id": "jazzcash", "name": "JazzCash", "enabled": True, "note": "Send payment to 0313 3801788 and share the confirmation on WhatsApp."}
    ],

    "gallery": [
        {"image": "images/banners/hero-2.jpg", "caption": "Birthday celebrations"},
        {"image": "images/products/wedding-cake.jpg", "caption": "Custom wedding cakes"},
        {"image": "images/products/kids-theme-cake.jpg", "caption": "Kids & theme cakes"},
        {"image": "images/products/assorted-mithai-box.jpg", "caption": "Eid & mithai"},
        {"image": "images/products/dessert-box.jpg", "caption": "Dessert boxes"},
        {"image": "images/banners/hero-3.jpg", "caption": "Fresh bakery products"}
    ],

    "testimonials": [
        {
            "name": "Ayesha R.",
            "text": "Ordered a red velvet for my daughter's birthday \u2014 it arrived right on time and tasted incredible. The whole family loved it!",
            "note": "Sample review"
        },
        {
            "name": "Bilal K.",
            "text": "The custom cake for our anniversary was exactly what I described on WhatsApp. Beautiful work and super easy ordering.",
            "note": "Sample review"
        },
        {
            "name": "Fatima S.",
            "text": "Their fresh patties and rusks have become a weekly staple at our house. Always fresh, always on time.",
            "note": "Sample review"
        }
    ]
}

# ---------------------------------------------------------------------------
# CATEGORIES
# ---------------------------------------------------------------------------
# (id, name, slug, parent, image, homepage, sortOrder)
_cat_raw = [
    ("cakes",            "Cakes",              "cakes",            None,     "images/categories/cakes.jpg",            1, 1),
    ("custom-cakes",     "Custom Cakes",       "custom-cakes",     None,     "images/categories/custom-cakes.jpg",     1, 2),
    ("pastries-desserts","Pastries & Desserts","pastries-desserts",None,     "images/categories/pastries-desserts.jpg",1, 3),
    ("biscuits-cookies", "Biscuits & Cookies", "biscuits-cookies", None,     "images/categories/biscuits-cookies.jpg", 1, 4),
    ("breads-buns",      "Breads & Buns",      "breads-buns",      None,     "images/categories/breads-buns.jpg",      1, 5),
    ("savory",           "Savory & Namkeen",   "savory",           None,     "images/categories/savory.jpg",           1, 6),
    ("nimco-snacks",     "Nimco & Snacks",     "nimco-snacks",     None,     "images/categories/nimco-snacks.jpg",     1, 7),
    ("mithai",           "Mithai & Sweets",    "mithai",           None,     "images/categories/mithai.jpg",           1, 8),
    ("desserts",         "Desserts",           "desserts",         None,     "images/categories/desserts.jpg",         1, 9),
    ("rusks",            "Rusks",              "rusks",            None,     "images/categories/rusks.jpg",            0, 10),
    ("extras",           "Celebration Extras", "extras",           None,     "images/categories/extras.jpg",           0, 11),

    # Subcategories
    ("cakes-birthday",   "Birthday Cakes",  "birthday-cakes",  "cakes", None, 0, 20),
    ("cakes-chocolate",  "Chocolate Cakes", "chocolate-cakes", "cakes", None, 0, 21),
    ("cakes-redvelvet",  "Red Velvet",      "red-velvet",      "cakes", None, 0, 22),
    ("cakes-blackforest","Black Forest",    "black-forest",    "cakes", None, 0, 23),
    ("cakes-biscoff",    "Biscoff / Lotus", "biscoff-lotus",   "cakes", None, 0, 24),
    ("cakes-fruit",      "Fruit & Fresh",   "fruit-fresh",     "cakes", None, 0, 25),
    ("cakes-photo",      "Photo Cakes",     "photo-cakes",     "cakes", None, 0, 26),
    ("cakes-theme",      "Theme & Kids",    "theme-kids",      "cakes", None, 0, 27),
    ("cakes-wedding",    "Wedding & Anniversary", "wedding-anniversary", "cakes", None, 0, 28),
]

categories = []
for cid, name, slug, parent, image, home, order in _cat_raw:
    categories.append({
        "id": cid, "name": name, "slug": slug,
        "parentCategory": parent, "image": image,
        "displayOnHomepage": bool(home), "sortOrder": order
    })

# ---------------------------------------------------------------------------
# DEALS
# ---------------------------------------------------------------------------
deals = [
    {
        "id": "deal-birthday", "title": "Birthday Combo", "slug": "birthday-combo",
        "description": "A 1kg signature cake + 12 cupcakes + candles \u2014 everything you need for a birthday.",
        "image": "images/products/kids-theme-cake.jpg",
        "includedItems": ["red-velvet-cake", "cupcakes", "candles"],
        "price": 4500, "compareAtPrice": 5400,
        "active": True, "startDate": None, "endDate": None
    },
    {
        "id": "deal-eid", "title": "Eid Treat Box", "slug": "eid-treat-box",
        "description": "Assorted mithai box, nankhatai and nimco \u2014 a sweet Eid gift for family and friends.",
        "image": "images/products/assorted-mithai-box.jpg",
        "includedItems": ["assorted-mithai-box", "nankhatai", "mixed-nimco"],
        "price": 3800, "compareAtPrice": 4600,
        "active": True, "startDate": None, "endDate": None
    },
    {
        "id": "deal-family", "title": "Family Dessert Box", "slug": "family-dessert-box",
        "description": "A dessert box with brownies, pastries, cupcakes and donuts to share.",
        "image": "images/products/dessert-box.jpg",
        "includedItems": ["dessert-box", "chocolate-brownie", "cupcakes", "donuts"],
        "price": 2200, "compareAtPrice": 2700,
        "active": True, "startDate": None, "endDate": None
    },
    {
        "id": "deal-weekend", "title": "Weekend Treat Box", "slug": "weekend-treat-box",
        "description": "A mix of savory patties, samosas, rolls and mini pizzas for the weekend.",
        "image": "images/products/mini-pizza.jpg",
        "includedItems": ["chicken-patties", "chicken-samosa", "chicken-rolls", "mini-pizza"],
        "price": 1800, "compareAtPrice": 2200,
        "active": True, "startDate": None, "endDate": None
    },
    {
        "id": "deal-teatime", "title": "Tea Time Combo", "slug": "tea-time-combo",
        "description": "Cake rusks, zeera biscuits and nankhatai \u2014 the perfect chai-time spread.",
        "image": "images/products/cake-rusk.jpg",
        "includedItems": ["cake-rusk", "zeera-biscuits", "nankhatai"],
        "price": 1200, "compareAtPrice": 1500,
        "active": True, "startDate": None, "endDate": None
    }
]

# ---------------------------------------------------------------------------
# ITEMS
# ---------------------------------------------------------------------------
def size_variants(small, base, large2x, large3x):
    """Cake size variants. base = 1kg price; modifiers relative to 1kg."""
    return [{"variantType": "Size", "options": [
        {"label": "0.5 kg", "priceModifier": small, "stock": None},
        {"label": "1 kg",   "priceModifier": 0,     "stock": None},
        {"label": "2 kg",   "priceModifier": large2x, "stock": None},
        {"label": "3 kg",   "priceModifier": large3x, "stock": None},
    ]}]

def weight_variants(b250, b500, b1000):
    """Weight variants; base price = 500g, modifiers for 250g/1kg."""
    return [{"variantType": "Weight", "options": [
        {"label": "250 g", "priceModifier": b250, "stock": None},
        {"label": "500 g", "priceModifier": 0,    "stock": None},
        {"label": "1 kg",  "priceModifier": b1000, "stock": None},
    ]}]

def pack_variants(p1, p6, p12, unit="pieces"):
    """Pack-size variants; base = 6 pieces."""
    return [{"variantType": "Pack size", "options": [
        {"label": f"1 {unit[:-1] if unit.endswith('s') else unit}", "priceModifier": p1, "stock": None},
        {"label": f"6 {unit}", "priceModifier": 0, "stock": None},
        {"label": f"12 {unit}", "priceModifier": p12, "stock": None},
    ]}]

CANDLE_ADDONS = [
    {"id": "msg", "label": "Cake message", "price": 0, "type": "text", "placeholder": "Write your message (e.g. Happy Birthday Ayesha!)"},
    {"id": "candles", "label": "Birthday candles", "price": 50, "type": "toggle"},
    {"id": "knife", "label": "Cake knife", "price": 150, "type": "toggle"},
    {"id": "topper", "label": "Cake topper", "price": 300, "type": "toggle"},
]

# id -> (name, category, subcategory, image, price, compareAt, discount, tags, variants, addons, flags)
# flags: dict with popular/featured/new
_items = []

def add(iid, name, cat, sub, img, price, compare=None, discount=None, tags=None,
        variants=None, addons=None, popular=False, featured=False, new=False,
        desc=None, short=None):
    tags = tags or []
    _items.append({
        "id": iid, "name": name, "slug": iid, "category": cat, "subcategory": sub,
        "description": desc or f"Freshly made {name.lower()} from Kravna Bakery \u2014 premium ingredients and authentic taste.",
        "shortDescription": short or f"Fresh {name.lower()}, baked daily.",
        "images": [f"images/products/{img}.jpg"],
        "price": price, "compareAtPrice": compare, "discount": discount,
        "currency": "PKR", "popular": popular, "featured": featured, "new": new,
        "available": True, "tags": tags, "variants": variants or [], "addons": addons or [],
        "rating": None, "reviewCount": 0
    })

# ---- CAKES -------------------------------------------------------------
add("classic-chocolate-cake", "Classic Chocolate Cake", "cakes", "cakes-chocolate", "classic-chocolate-cake", 2400, 2800, 14,
    ["birthday","chocolate","anniversary"], size_variants(-500, 0, 1450, 2900), CANDLE_ADDONS, popular=True,
    desc="Our signature rich chocolate sponge layered with silky chocolate ganache. A crowd favourite for every occasion.")

add("red-velvet-cake", "Red Velvet Cake", "cakes", "cakes-redvelvet", "red-velvet-cake", 2800, 3200, 12,
    ["birthday","red velvet","anniversary","valentine"], size_variants(-600, 0, 1600, 3200), CANDLE_ADDONS, popular=True, featured=True,
    desc="Velvety red sponge with cream-cheese frosting \u2014 the iconic Kravna bestseller.")

add("chocolate-fudge-cake", "Chocolate Fudge Cake", "cakes", "cakes-chocolate", "chocolate-fudge-cake", 3000, None, None,
    ["birthday","chocolate","fudge"], size_variants(-650, 0, 1700, 3400), CANDLE_ADDONS, popular=True,
    desc="Dense, gooey chocolate fudge layered with molten chocolate \u2014 for true chocolate lovers.")

add("black-forest-cake", "Black Forest Cake", "cakes", "cakes-blackforest", "black-forest-cake", 2600, None, None,
    ["birthday","chocolate","cherry"], size_variants(-550, 0, 1500, 3000), CANDLE_ADDONS,
    desc="Chocolate sponge with whipped cream and cherries, finished with chocolate shavings.")

add("biscoff-lotus-cake", "Biscoff Lotus Cake", "cakes", "cakes-biscoff", "biscoff-lotus-cake", 3200, 3600, 11,
    ["birthday","biscoff","lotus","anniversary"], size_variants(-700, 0, 1800, 3600), CANDLE_ADDONS, featured=True,
    desc="Caramelised Biscoff sponge with Lotus spread and crushed Biscoff topping.")

add("strawberry-cake", "Strawberry Cake", "cakes", "cakes-fruit", "strawberry-cake", 2700, None, None,
    ["birthday","strawberry","fruit"], size_variants(-600, 0, 1600, 3200), CANDLE_ADDONS,
    desc="Light sponge with fresh strawberry filling and whipped cream.")

add("pineapple-cake", "Pineapple Cake", "cakes", "cakes-fruit", "strawberry-cake", 2500, None, None,
    ["birthday","pineapple","fruit"], size_variants(-550, 0, 1500, 3000), CANDLE_ADDONS,
    desc="Classic pineapple sponge with pineapple chunks and cream \u2014 a Pakistani favourite.")

add("vanilla-fresh-cream-cake", "Vanilla Fresh Cream Cake", "cakes", "cakes-fruit", "vanilla-fresh-cream-cake", 2300, None, None,
    ["birthday","vanilla","fresh cream"], size_variants(-500, 0, 1400, 2800), CANDLE_ADDONS,
    desc="Soft vanilla sponge with light fresh cream \u2014 simple, elegant and delicious.")

add("coffee-mocha-cake", "Coffee Mocha Cake", "cakes", "cakes-chocolate", "coffee-mocha-cake", 2900, None, None,
    ["coffee","mocha","anniversary"], size_variants(-600, 0, 1650, 3300), CANDLE_ADDONS,
    desc="Coffee-infused sponge with mocha buttercream \u2014 for the coffee lover.")

add("fresh-fruit-cake", "Fresh Fruit Cake", "cakes", "cakes-fruit", "fresh-fruit-cake", 3100, None, None,
    ["fruit","birthday","anniversary"], size_variants(-650, 0, 1750, 3500), CANDLE_ADDONS,
    desc="Topped with seasonal fresh fruits \u2014 a lighter, refreshing celebration cake.")

add("photo-cake", "Photo Cake", "cakes", "cakes-photo", "photo-cake", 3500, None, None,
    ["photo","custom","birthday","anniversary"], size_variants(-750, 0, 1900, 3800),
    [{"id":"photo","label":"Upload reference photo","price":0,"type":"note","placeholder":"Share your photo on WhatsApp after placing the order."},
     {"id":"msg","label":"Cake message","price":0,"type":"text","placeholder":"Write your message"},
     {"id":"candles","label":"Birthday candles","price":50,"type":"toggle"}],
    new=True,
    desc="Your favourite photo printed on an edible sheet over a fresh cream cake. Share your photo on WhatsApp after ordering.")

add("kids-theme-cake", "Kids Theme Cake", "cakes", "cakes-theme", "kids-theme-cake", 3400, 3800, 10,
    ["kids","theme","birthday","baby"], size_variants(-750, 0, 1900, 3800),
    [{"id":"theme","label":"Theme","price":0,"type":"text","placeholder":"e.g. Spiderman, Frozen, Paw Patrol"},
     {"id":"msg","label":"Cake message","price":0,"type":"text","placeholder":"Write your message"},
     {"id":"candles","label":"Birthday candles","price":50,"type":"toggle"},
     {"id":"topper","label":"Cake topper","price":300,"type":"toggle"}],
    popular=True,
    desc="Custom kids' cakes in any theme or character \u2014 tell us the theme and we'll create it.")

add("wedding-cake", "Wedding Cake", "cakes", "cakes-wedding", "wedding-cake", 7500, None, None,
    ["wedding","anniversary","custom"], size_variants(-1500, 0, 6000, 9500), CANDLE_ADDONS, featured=True,
    desc="Elegant multi-tier wedding cakes, customised to your theme and guest count.")

add("mango-cake", "Seasonal Mango Cake", "cakes", "cakes-fruit", "strawberry-cake", 2900, None, None,
    ["seasonal","mango","fruit"], size_variants(-600, 0, 1650, 3300), CANDLE_ADDONS, new=True,
    desc="Fresh mango sponge with mango cream \u2014 available while mangoes are in season.")

add("dry-fruit-cake", "Dry Fruit Cake", "cakes", "cakes-birthday", "classic-chocolate-cake", 1800, None, None,
    ["dry","tea","fruit"], weight_variants(-450, 0, 1300), None,
    desc="A rich dry cake loaded with almonds, cashews and raisins \u2014 perfect with tea.")

# ---- PASTRIES & DESSERTS ------------------------------------------------
add("chocolate-pastry", "Chocolate Pastry", "pastries-desserts", None, "chocolate-pastry", 350, None, None,
    ["pastry","chocolate"], None, None, popular=True,
    desc="A single slice of rich chocolate cake layered with ganache.")

add("fresh-cream-pastry", "Fresh Cream Pastry", "pastries-desserts", None, "chocolate-pastry", 320, None, None,
    ["pastry","fresh cream"], None, None,
    desc="Light sponge pastry with fresh cream.")

add("pineapple-pastry", "Pineapple Pastry", "pastries-desserts", None, "chocolate-pastry", 300, None, None,
    ["pastry","pineapple"], None, None,
    desc="Pineapple pastry with juicy pineapple pieces.")

add("strawberry-pastry", "Strawberry Pastry", "pastries-desserts", None, "chocolate-pastry", 350, None, None,
    ["pastry","strawberry"], None, None,
    desc="Strawberry pastry with fresh strawberry cream.")

add("cake-slice", "Cake Slice", "pastries-desserts", None, "chocolate-pastry", 450, None, None,
    ["slice","cake"], None, None,
    desc="A generous slice of our signature cakes, boxed to go.")

add("chocolate-brownie", "Chocolate Brownie", "pastries-desserts", None, "chocolate-brownie", 250, None, None,
    ["brownie","chocolate"], pack_variants(-150, 0, 500, "pieces"), None, popular=True,
    desc="Fudgy, dense chocolate brownie baked daily.")

add("cupcakes", "Cupcakes", "pastries-desserts", None, "cupcakes", 150, None, None,
    ["cupcake","birthday"],
    [{"variantType":"Pack size","options":[
        {"label":"1 piece","priceModifier":-100,"stock":None},
        {"label":"4 pieces","priceModifier":0,"stock":None},
        {"label":"6 pieces","priceModifier":120,"stock":None},
        {"label":"12 pieces","priceModifier":700,"stock":None}]},
     {"variantType":"Flavor","options":[
        {"label":"Chocolate","priceModifier":0,"stock":None},
        {"label":"Vanilla","priceModifier":0,"stock":None},
        {"label":"Red Velvet","priceModifier":50,"stock":None}]}],
    None, popular=True, featured=True,
    desc="Soft cupcakes with swirled frosting, in chocolate, vanilla or red velvet.")

add("muffins", "Muffins", "pastries-desserts", None, "cream-rolls", 180, None, None,
    ["muffin"], pack_variants(-120, 0, 300, "pieces"), None,
    desc="Freshly baked muffins \u2014 soft and fluffy.")

add("cream-rolls", "Cream Rolls", "pastries-desserts", None, "cream-rolls", 120, None, None,
    ["cream roll"], pack_variants(-80, 0, 200, "pieces"), None,
    desc="Crisp rolls filled with sweet cream.")

add("donuts", "Donuts", "pastries-desserts", None, "donuts", 180, None, None,
    ["donut"], pack_variants(-120, 0, 320, "pieces"), None, popular=True,
    desc="Soft glazed donuts, fried fresh daily.")

add("dessert-cup", "Dessert Cup", "pastries-desserts", "desserts", "dessert-cup", 380, None, None,
    ["dessert","cup"], None, None,
    desc="Layered dessert cups \u2014 cake, cream and toppings in a cup.")

add("dessert-box", "Dessert Box", "pastries-desserts", "desserts", "dessert-box", 1200, 1500, 20,
    ["dessert","box","gift"], None, None, featured=True,
    desc="An assortment of brownies, pastries, cupcakes and donuts in one box.")

add("trifle", "Trifle", "pastries-desserts", "desserts", "trifle", 550, None, None,
    ["trifle","dessert"], None, None,
    desc="Layers of cake, custard, jelly and cream \u2014 a classic trifle.")

add("pudding", "Pudding", "pastries-desserts", "desserts", "dessert-cup", 250, None, None,
    ["pudding","dessert"], None, None,
    desc="Silky, creamy pudding made fresh.")

# ---- BISCUITS & COOKIES --------------------------------------------------
add("chocolate-chip-cookies", "Chocolate Chip Cookies", "biscuits-cookies", None, "chocolate-chip-cookies", 350, None, None,
    ["cookies","chocolate"], weight_variants(-120, 0, 500), None, popular=True,
    desc="Chewy cookies loaded with chocolate chips.")

add("coconut-biscuits", "Coconut Biscuits", "biscuits-cookies", None, "assorted-biscuits", 300, None, None,
    ["coconut","biscuits"], weight_variants(-100, 0, 450), None,
    desc="Crisp biscuits with desiccated coconut.")

add("zeera-biscuits", "Zeera Biscuits", "biscuits-cookies", None, "assorted-biscuits", 250, None, None,
    ["zeera","biscuits","tea"], weight_variants(-80, 0, 380), None,
    desc="Classic cumin (zeera) biscuits \u2014 a tea-time staple.")

add("peanut-biscuits", "Peanut Biscuits", "biscuits-cookies", None, "assorted-biscuits", 320, None, None,
    ["peanut","biscuits"], weight_variants(-100, 0, 480), None,
    desc="Crunchy biscuits with roasted peanuts.")

add("jam-biscuits", "Jam Biscuits", "biscuits-cookies", None, "assorted-biscuits", 300, None, None,
    ["jam","biscuits"], weight_variants(-100, 0, 450), None,
    desc="Buttery biscuits with a sweet jam centre.")

add("almond-badam-biscuits", "Almond (Badam) Biscuits", "biscuits-cookies", None, "assorted-biscuits", 450, None, None,
    ["almond","badam","biscuits"], weight_variants(-150, 0, 650), None,
    desc="Premium biscuits topped with roasted almonds.")

add("nankhatai", "Nankhatai", "biscuits-cookies", None, "nankhatai", 400, None, None,
    ["nankhatai","traditional","tea"], weight_variants(-130, 0, 600), None, popular=True,
    desc="Traditional soft nankhatai, baked the classic way.")

add("khatai", "Khatai", "biscuits-cookies", None, "nankhatai", 380, None, None,
    ["khatai","traditional"], weight_variants(-130, 0, 550), None,
    desc="Crumbly traditional khatai with a melt-in-the-mouth texture.")

add("sugar-free-biscuits", "Sugar-Free Biscuits", "biscuits-cookies", None, "assorted-biscuits", 500, None, None,
    ["sugar-free","diet"], weight_variants(-170, 0, 750), None,
    desc="Guilt-free sugar-free biscuits, sweetened naturally.")

add("assorted-biscuit-box", "Assorted Biscuit Box", "biscuits-cookies", None, "assorted-biscuits", 950, 1100, 13,
    ["assorted","box","gift"], None, None, featured=True,
    desc="A box of assorted biscuits \u2014 great for gifting or guests.")

# ---- BREADS & BUNS --------------------------------------------------------
add("plain-bread", "Plain Bread", "breads-buns", None, "milk-bread", 180, None, None,
    ["bread"], None, None,
    desc="Soft, fresh plain bread baked daily.")

add("milk-bread", "Milk Bread", "breads-buns", None, "milk-bread", 220, None, None,
    ["bread","milk"], [{"variantType":"Size","options":[
        {"label":"Regular","priceModifier":0,"stock":None},
        {"label":"Large","priceModifier":60,"stock":None}]}], None, popular=True,
    desc="Soft and rich milk bread.")

add("bran-bread", "Bran Bread", "breads-buns", None, "milk-bread", 200, None, None,
    ["bread","bran","healthy"], None, None,
    desc="Wholesome bran bread, high in fibre.")

add("whole-wheat-bread", "Whole Wheat Bread", "breads-buns", None, "milk-bread", 210, None, None,
    ["bread","whole wheat","healthy"], None, None,
    desc="100% whole wheat bread for a healthier choice.")

add("burger-buns", "Burger Buns", "breads-buns", None, "burger-buns", 250, None, None,
    ["buns","burger"], pack_variants(-100, 0, 150, "pieces"), None,
    desc="Soft burger buns, perfect for homemade burgers.")

add("dinner-buns", "Dinner Buns", "breads-buns", None, "burger-buns", 180, None, None,
    ["buns","dinner"], pack_variants(-80, 0, 120, "pieces"), None,
    desc="Soft dinner rolls for the table.")

add("plain-buns", "Plain Buns", "breads-buns", None, "burger-buns", 150, None, None,
    ["buns","plain"], pack_variants(-70, 0, 100, "pieces"), None,
    desc="Fresh plain buns, baked daily.")

add("cream-buns", "Cream Buns", "breads-buns", None, "cream-rolls", 120, None, None,
    ["buns","cream","sweet"], pack_variants(-60, 0, 80, "pieces"), None,
    desc="Soft buns filled with sweet cream.")

add("sweet-buns", "Sweet Buns", "breads-buns", None, "cream-rolls", 130, None, None,
    ["buns","sweet"], pack_variants(-60, 0, 90, "pieces"), None,
    desc="Lightly sweet buns, a nostalgic favourite.")

add("phool-buns", "Phool Buns", "breads-buns", None, "burger-buns", 140, None, None,
    ["buns","phool"], pack_variants(-60, 0, 90, "pieces"), None,
    desc="Flower-shaped phool buns, soft and fluffy.")

add("sheermal", "Sheermal", "breads-buns", None, "sheermal", 120, None, None,
    ["sheermal","traditional"], pack_variants(-50, 0, 80, "pieces"), None, featured=True,
    desc="Traditional saffron-flavoured sheermal, mildly sweet.")

add("bakarkhani", "Bakarkhani", "breads-buns", None, "sheermal", 100, None, None,
    ["bakarkhani","traditional"], pack_variants(-40, 0, 70, "pieces"), None,
    desc="Flaky, crisp bakarkhani \u2014 a classic tea-time bread.")

add("bread-sticks", "Bread Sticks", "breads-buns", None, "milk-bread", 200, None, None,
    ["bread","sticks"], pack_variants(-90, 0, 140, "pieces"), None,
    desc="Crunchy bread sticks, great for dipping.")

# ---- RUSKS -----------------------------------------------------------------
add("cake-rusk", "Cake Rusk", "rusks", None, "cake-rusk", 350, None, None,
    ["rusk","tea"], weight_variants(-120, 0, 500), None, popular=True,
    desc="Sweet, crunchy cake rusk \u2014 the classic chai companion.")

add("plain-rusk", "Plain Rusk", "rusks", None, "cake-rusk", 300, None, None,
    ["rusk","tea"], weight_variants(-100, 0, 450), None,
    desc="Crisp plain rusks, twice-baked for crunch.")

add("round-rusk", "Round Rusk", "rusks", None, "cake-rusk", 320, None, None,
    ["rusk","tea"], weight_variants(-110, 0, 460), None,
    desc="Round-shaped rusks with a light sweetness.")

add("stick-rusk", "Stick Rusk", "rusks", None, "cake-rusk", 320, None, None,
    ["rusk","tea"], weight_variants(-110, 0, 460), None,
    desc="Long stick rusks, easy to dunk in chai.")

add("coconut-rusk", "Coconut Rusk", "rusks", None, "cake-rusk", 380, None, None,
    ["rusk","coconut"], weight_variants(-130, 0, 540), None,
    desc="Rusks with desiccated coconut.")

add("suji-rusk", "Suji Rusk", "rusks", None, "cake-rusk", 350, None, None,
    ["rusk","suji"], weight_variants(-120, 0, 500), None,
    desc="Suji (semolina) rusks with a distinct texture.")

add("candy-rusk", "Candy Rusk", "rusks", None, "cake-rusk", 360, None, None,
    ["rusk","candy"], weight_variants(-120, 0, 520), None,
    desc="Colourful candy rusks, loved by kids.")

add("garlic-rusk", "Garlic Rusk", "rusks", None, "cake-rusk", 380, None, None,
    ["rusk","garlic","savory"], weight_variants(-130, 0, 540), None,
    desc="Savory garlic rusks with a buttery crunch.")

add("sugar-free-rusk", "Sugar-Free Rusk", "rusks", None, "cake-rusk", 450, None, None,
    ["rusk","sugar-free","diet"], weight_variants(-150, 0, 650), None,
    desc="Sugar-free rusks for a healthier tea time.")

# ---- SAVORY ----------------------------------------------------------------
add("chicken-patties", "Chicken Patties", "savory", None, "chicken-patties", 80, None, None,
    ["savory","patties","chicken"], pack_variants(-50, 0, 140, "pieces"), None, popular=True,
    desc="Flaky pastry filled with spiced chicken.")

add("vegetable-patties", "Vegetable Patties", "savory", None, "chicken-patties", 60, None, None,
    ["savory","patties","vegetable"], pack_variants(-40, 0, 100, "pieces"), None,
    desc="Crisp patties filled with seasoned vegetables.")

add("chicken-cheese-patties", "Chicken Cheese Patties", "savory", None, "chicken-patties", 100, None, None,
    ["savory","patties","chicken","cheese"], pack_variants(-60, 0, 160, "pieces"), None,
    desc="Chicken patties with a gooey cheese centre.")

add("chicken-bread", "Chicken Bread", "savory", None, "chicken-rolls", 350, None, None,
    ["savory","chicken","bread"], None, None,
    desc="Soft bread roll stuffed with a chicken filling.")

add("chicken-rolls", "Chicken Rolls", "savory", None, "chicken-rolls", 150, None, None,
    ["savory","chicken","roll"], pack_variants(-90, 0, 240, "pieces"), None, popular=True,
    desc="Golden fried rolls with a savoury chicken filling.")

add("spring-rolls", "Spring Rolls", "savory", None, "chicken-rolls", 120, None, None,
    ["savory","spring","roll"], pack_variants(-70, 0, 190, "pieces"), None,
    desc="Crispy vegetable spring rolls.")

add("chicken-samosa", "Chicken Samosa", "savory", None, "samosa", 60, None, None,
    ["savory","samosa","chicken"], pack_variants(-40, 0, 100, "pieces"), None, popular=True,
    desc="Crisp samosas with a spicy chicken filling.")

add("aloo-samosa", "Aloo Samosa", "savory", None, "samosa", 40, None, None,
    ["savory","samosa","aloo"], pack_variants(-30, 0, 70, "pieces"), None,
    desc="Classic potato (aloo) samosas.")

add("chicken-pie", "Chicken Pie", "savory", None, "chicken-patties", 300, None, None,
    ["savory","pie","chicken"], None, None,
    desc="Hearty chicken pie with a buttery crust.")

add("cheese-rolls", "Cheese Rolls", "savory", None, "chicken-rolls", 140, None, None,
    ["savory","cheese","roll"], pack_variants(-90, 0, 220, "pieces"), None,
    desc="Crisp rolls with a melting cheese filling.")

add("mini-pizza", "Mini Pizza", "savory", None, "mini-pizza", 250, None, None,
    ["savory","pizza"], pack_variants(-150, 0, 400, "pieces"), None, popular=True,
    desc="Bite-sized pizzas with cheese and toppings.")

add("pizza-slice", "Pizza Slice", "savory", None, "mini-pizza", 280, None, None,
    ["savory","pizza","slice"], None, None,
    desc="A generous slice of fresh pizza.")

add("sandwich", "Sandwich", "savory", None, "mini-pizza", 350, None, None,
    ["savory","sandwich"], None, None,
    desc="Freshly made sandwiches with your choice of filling.")

add("shami-kebab", "Shami Kebab", "savory", None, "chicken-patties", 400, None, None,
    ["savory","kebab"], None, None,
    desc="Tender shami kebabs, ready to enjoy.")

add("chicken-turnover", "Chicken Turnover", "savory", None, "chicken-patties", 150, None, None,
    ["savory","turnover","chicken"], pack_variants(-90, 0, 240, "pieces"), None,
    desc="Flaky turnovers with a savoury chicken filling.")

# ---- NIMCO & SNACKS --------------------------------------------------------
add("mixed-nimco", "Mixed Nimco", "nimco-snacks", None, "mixed-nimco", 350, None, None,
    ["nimco","snacks"], weight_variants(-120, 0, 500), None, popular=True,
    desc="A crunchy mix of assorted nimco.")

add("special-nimco", "Special Nimco", "nimco-snacks", None, "mixed-nimco", 420, None, None,
    ["nimco","snacks"], weight_variants(-140, 0, 600), None,
    desc="Our premium special nimco mix.")

add("daal-mong", "Daal Mong", "nimco-snacks", None, "daal-mong", 280, None, None,
    ["nimco","daal mong"], weight_variants(-100, 0, 400), None,
    desc="Crispy roasted daal mong.")

add("daal-moth", "Daal Moth", "nimco-snacks", None, "daal-mong", 300, None, None,
    ["nimco","daal moth"], weight_variants(-100, 0, 420), None,
    desc="Crunchy spiced daal moth.")

add("namak-para", "Namak Para", "nimco-snacks", None, "mixed-nimco", 260, None, None,
    ["nimco","namak para"], weight_variants(-90, 0, 380), None,
    desc="Crisp, salty namak para.")

add("masala-papri", "Masala Papri", "nimco-snacks", None, "mixed-nimco", 280, None, None,
    ["nimco","papri"], weight_variants(-100, 0, 400), None,
    desc="Crunchy masala papri.")

add("chat-papri", "Chat Papri", "nimco-snacks", None, "mixed-nimco", 290, None, None,
    ["nimco","papri","chaat"], weight_variants(-100, 0, 420), None,
    desc="Tangy chaat papri.")

add("chewra", "Chewra", "nimco-snacks", None, "mixed-nimco", 250, None, None,
    ["nimco","chewra"], weight_variants(-90, 0, 360), None,
    desc="Crunchy spiced chewra.")

add("potato-crisps", "Potato Crisps", "nimco-snacks", None, "mixed-nimco", 150, None, None,
    ["nimco","potato","crisps"], None, None,
    desc="Thin, crispy potato crisps.")

add("potato-sticks", "Potato Sticks", "nimco-snacks", None, "mixed-nimco", 160, None, None,
    ["nimco","potato","sticks"], None, None,
    desc="Crunchy potato sticks.")

add("spicy-peanuts", "Spicy Peanuts", "nimco-snacks", None, "daal-mong", 220, None, None,
    ["nimco","peanuts","spicy"], weight_variants(-80, 0, 320), None,
    desc="Roasted peanuts with a spicy kick.")

add("snack-mix", "Snack Mix", "nimco-snacks", None, "mixed-nimco", 320, None, None,
    ["nimco","mix"], weight_variants(-110, 0, 460), None,
    desc="A party-ready mix of our best snacks.")

# ---- MITHAI ---------------------------------------------------------------
add("gulab-jamun", "Gulab Jamun", "mithai", None, "gulab-jamun", 550, None, None,
    ["mithai","gulab jamun","traditional","eid"], weight_variants(-180, 0, 800), None, popular=True, featured=True,
    desc="Soft gulab jamun soaked in fragrant syrup.")

add("barfi", "Barfi", "mithai", None, "barfi", 600, None, None,
    ["mithai","barfi","traditional","eid"], weight_variants(-200, 0, 850), None,
    desc="Classic milk barfi with a rich, creamy texture.")

add("laddu", "Laddu", "mithai", None, "barfi", 580, None, None,
    ["mithai","laddu","traditional"], weight_variants(-190, 0, 820), None,
    desc="Sweet, crumbly besan laddus.")

add("rasgulla", "Rasgulla", "mithai", None, "gulab-jamun", 600, None, None,
    ["mithai","rasgulla","traditional"], weight_variants(-200, 0, 850), None,
    desc="Soft, spongy rasgullas in light syrup.")

add("jalebi", "Jalebi", "mithai", None, "barfi", 450, None, None,
    ["mithai","jalebi","traditional"], weight_variants(-150, 0, 650), None,
    desc="Crispy, syrupy jalebis, freshly fried.")

add("rabri", "Rabri", "mithai", None, "gajar-halwa", 700, None, None,
    ["mithai","rabri","traditional"], None, None,
    desc="Thick, creamy rabri with a rich milk flavour.")

add("gajar-halwa", "Gajar Halwa", "mithai", None, "gajar-halwa", 650, None, None,
    ["mithai","halwa","gajar","traditional","seasonal"], weight_variants(-220, 0, 900), None, popular=True,
    desc="Warm carrot halwa made with desi ghee and dry fruits.")

add("suji-halwa", "Suji Halwa", "mithai", None, "gajar-halwa", 450, None, None,
    ["mithai","halwa","suji","traditional"], weight_variants(-150, 0, 650), None,
    desc="Classic suji halwa, rich and aromatic.")

add("assorted-mithai-box", "Assorted Mithai Box", "mithai", None, "assorted-mithai-box", 1500, 1800, 16,
    ["mithai","box","gift","eid"], None, None, featured=True,
    desc="A beautifully packed box of assorted mithai.")

# ---- EXTRAS ----------------------------------------------------------------
add("candles", "Birthday Candles", "extras", None, "candles", 100, None, None,
    ["extras","candles"], None, None,
    desc="Colourful birthday candles.")

add("cake-knife", "Cake Knife", "extras", None, "cake-knife", 300, None, None,
    ["extras","knife"], None, None,
    desc="A stainless steel cake knife and server set.")

add("cake-toppers", "Cake Toppers", "extras", None, "cake-knife", 400, None, None,
    ["extras","topper","birthday"], None, None,
    desc="Decorative cake toppers for any occasion.")

add("greeting-card", "Greeting Card", "extras", None, "candles", 150, None, None,
    ["extras","card"], None, None,
    desc="A greeting card to complete your gift.")

add("chocolates", "Assorted Chocolates", "extras", None, "candles", 700, None, None,
    ["extras","chocolate","gift"], None, None,
    desc="A box of premium assorted chocolates.")

items = _items

# ---------------------------------------------------------------------------
# WRITE
# ---------------------------------------------------------------------------
def dump(name, obj):
    with open(os.path.join(DATA, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print(f"wrote {name}: {len(obj) if isinstance(obj, list) else 'obj'}")

dump("settings.json", settings)
dump("categories.json", categories)
dump("deals.json", deals)
dump("items.json", items)
print(f"TOTAL PRODUCTS: {len(items)}")
print(f"TOTAL CATEGORIES: {len(categories)}")
print(f"TOTAL DEALS: {len(deals)}")
