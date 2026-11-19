# Heal & Herbs

Website for **Heal & Herbs by Haroon Ur Rasheed, FTJ**: Unani consultations (Google Meet, Zoom or WhatsApp) and herbal formulations delivered across Pakistan.

Static HTML/CSS/JS with one serverless function. No build step. Hosted on Vercel.

## Before going live

1. **Receive bookings and orders.** In Vercel → Project → Settings → Environment Variables add:
   - `RESEND_API_KEY` (free account at resend.com, verify your domain)
   - `NOTIFY_EMAIL` the inbox(es) that should receive bookings, orders and messages (comma separated)
   - `FROM_EMAIL` e.g. `Heal & Herbs <bookings@yourdomain.com>`
   - optional `WEBHOOK_URL` to also send every submission to a Google Sheet, Zapier or Make

   Until these are set, submissions are still recorded in the function logs (Vercel → Logs) so nothing is lost.
2. **Clinic WhatsApp.** Set `whatsapp` in `HH_CONFIG` at the top of `assets/common.js` (digits only, e.g. `923001234567`). Customers then get a one-tap "Send on WhatsApp" after booking or ordering.
3. **Replace the sample data.** The site ships with realistic sample details so every page looks finished. Replace them with the real ones:
   - Phone/WhatsApp `+92 300 0000000` and email `hello@healandherbs.pk`
   - Address `Office 4, Al-Rehman Plaza, Blue Area, Islamabad` and hours `Mon–Sat, 10:00–19:00`
   - Product prices, pack sizes, ingredients, percentages and directions (Cedar and Meher especially)
   - Delivery times, refund and cancellation periods in the policy pages
4. **Domain.** Add it in Vercel → Project → Settings → Domains, then replace `https://heal-and-herbs.vercel.app` with your domain in the HTML files, `sitemap.xml` and `robots.txt`.
5. **Policies.** Review `privacy.html`, `terms.html`, `refunds.html` and `delivery.html` with your own adviser.

## How payments and availability work today

- `HH_CONFIG.paymentsLive = false`: booking and checkout collect a request and the payment method the customer prefers. Nothing is charged online; the clinic confirms and sends payment details (JazzCash, Easypaisa, bank or card link). Cash on delivery works as normal.
- When a payment gateway is connected, set `paymentsLive: true` and redirect to the gateway in the `confirm` (book) and `place` (cart) handlers.
- All consultation times are shown as available. To block taken times, fill `HH_BUSY` in `assets/pages/book.js` or connect a calendar (Google Calendar / Cal.com) behind `hhBusy()`.
- The server recalculates every price from `api/_catalog.json`; a changed price in the browser is never trusted.

## Editing

| What | Where |
| --- | --- |
| Products, prices, tags | `HH_PRODUCTS` in `assets/common.js` **and** `api/_catalog.json` |
| Consultation prices, hours, closed days | top of `assets/pages/book.js` (and `api/_catalog.json`) |
| Delivery fee / free-delivery threshold | top of `assets/pages/cart.js` (and `api/_catalog.json`) |
| Colours, type, components | `assets/site.css` |

Each page holds pre-rendered HTML for fast first paint and search engines, plus a `<template id="view">` the page script renders from. `assets/view.js` is the small view layer (`{{holes}}`, `<hh-if>`, `<hh-for>`, `onclick="{{handler}}"`).

## Structure

```
index.html, about.html, book.html, cart.html, contact.html
cedar.html, meher.html, saath.html, fennel-rose.html, golden-root.html, mint-garden.html
privacy.html, terms.html, refunds.html, delivery.html, 404.html
api/submit.js        bookings, orders and messages → email / webhook
api/_catalog.json    server-side prices
assets/              site.css, view.js, common.js, pages/*.js
images/              photography, product cut-outs, icons, social images
vercel.json          clean URLs, caching, security headers (CSP, HSTS)
```

## Local preview

```
npx vercel dev
```
