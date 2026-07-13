# The Skin Shelf 🧴

A premium skincare e-commerce web app — customer storefront, seller dashboards
and an admin panel. Built as a Cordova project but runs as a normal website in
the browser.

- **Frontend**: this repo (`www/`) — HTML/CSS/vanilla JS
- **Backend**: the `backend/` repo — Flask + MySQL (see its README)

## Run it locally (2 steps)

### 1. Start the backend + database

Needs **Docker Desktop** running. In the `backend` folder:

```bash
docker compose up -d --build
```

Backend → http://localhost:5000 · Database seeds itself on first run.

### 2. Serve the website

Needs **Node.js**. In this (`theskinshelf`) folder:

```bash
npx http-server www -p 5500 -c-1
```

Then open **http://localhost:5500** in your browser. 🎉

> The frontend auto-detects localhost and talks to `http://localhost:5000`.
> When hosted on a real domain it uses the production backend URL instead
> (see `www/js/config.js` — the single place to change API URLs).

## Demo accounts

| Role     | Email                    | Password       | Lands on            |
|----------|--------------------------|----------------|---------------------|
| Customer | customer@skinshelf.com   | `Customer123!` | Shop                |
| Seller   | seller@skinshelf.com     | `Seller123!`   | Seller dashboard    |
| Admin    | admin@skinshelf.com      | `Admin123!`    | Admin dashboard     |

You can also **register a new account** — in local mode the verification code is
returned by the API (no real email needed).

## The customer journey (redesigned)

Home → Shop → Product → Bag → Checkout → Order confirmed, plus:

- Live search, category filters, price range, sort, in-stock filter
- Wishlist (heart) saved in the browser
- Star ratings, stock badges ("Only 3 left"), quick add-to-bag
- Cart with quantity steppers and a live order summary (12% VAT + ₱60 shipping)
- Checkout with delivery details + Cash-on-Delivery / card (demo) and a success screen
- Order tracking in **My Orders**

Shared UI lives in `www/css/store.css` and `www/js/store.js`
(header, footer, toasts, cart/wishlist, product cards).

## Project layout

```
www/
  index.html                 landing page
  pages/                     shop, product, bag, checkout, login, orders,
                             profile, seller & admin pages
  css/store.css              design system
  js/config.js               API base URL (local vs production)
  js/store.js                shared front-end module (TSS.*)
```

## Building the Android app (optional)

This is a Cordova project (`config.xml`). To build the APK you'd point the app at
the deployed backend and run `cordova build android`. For school/demo purposes the
**browser** version above is the easiest to show.
