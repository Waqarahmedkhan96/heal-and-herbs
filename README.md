# Heal & Herbs

Website for **Heal & Herbs by Haroon Ur Rasheed, FTJ**: Unani consultations (Google Meet, Zoom or WhatsApp) and herbal formulations delivered across Pakistan.

Static site, no build step. Deployed on Vercel.

## Pages

| Route | File |
| --- | --- |
| `/` | `index.html` — home, shop, consultation pricing, FAQ |
| `/about` | `about.html` |
| `/book` | `book.html` — 4-step consultation booking |
| `/cart` | `cart.html` — basket and checkout |
| `/contact` | `contact.html` |
| `/cedar`, `/meher`, `/saath`, `/fennel-rose`, `/golden-root`, `/mint-garden` | product pages |

## Structure

```
assets/
  site.css         design tokens and components (mobile first)
  view.js          small view layer: {{holes}}, <hh-if>, <hh-for>, event binding
  common.js        product catalogue, prices, basket storage, shared header/footer logic
  pages/*.js       one script per page
images/            photography, product cut-outs, icons
vercel.json        clean URLs, caching and security headers
```

Each page contains pre-rendered HTML (fast first paint, indexable) plus a `<template id="view">` that the page script renders from once loaded.

## Editing

- **Products and prices:** `HH_PRODUCTS` at the top of `assets/common.js`.
- **Consultation prices, hours, closed days, payment methods:** top of `assets/pages/book.js`.
- **Delivery fee and free-delivery threshold:** top of `assets/pages/cart.js`.
- Text in `[BRACKETS]` is waiting for real details (phone, email, address, registration number, ingredients).

## Going live with payments and bookings

Booking and checkout run fully in the browser today. To take real payments and bookings, connect:

1. A payment gateway (JazzCash / Easypaisa / card) at the `confirm` and `place` handlers.
2. The clinic calendar (Google Calendar or Cal.com) in place of `hhBusy()` in `book.js`.
3. Zoom / Google Meet APIs to create meeting links on confirmation.
4. An order backend or Shopify for fulfilment.

## Local preview

```
npx serve .
```
