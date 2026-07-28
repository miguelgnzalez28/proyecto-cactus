# cactus - Product Catalog PRD

## Problem statement (original)
Build a product catalog "cactus" with intuitive modern UI in pastel/white colors, admin login (admin/admin123) that only shows on `/admin`, product upload with name/price/image and validations, search, badges (Nuevo/Oferta/Agotado), cart with double verification "Verifique sus productos", larger price display, auto product code visible to client and included in WhatsApp message, auto Instagram publish on product creation, delivery section in checkout (address + phone) added to WhatsApp message, QR code accessible from header.

## Architecture (as of Feb 2026)
- **Backend**: FastAPI + MongoDB (motor), JWT auth (PyJWT), Emergent Object Storage for images
- **Frontend**: React 19 + React Router, TailwindCSS, Shadcn UI, Framer Motion, sonner (toasts), qrcode.react
- **3rd party**: Instagram Graph API (creds pluggable via `.env`), WhatsApp via `wa.me` link
- **Auth**: single admin (username/password from env), JWT stored in `localStorage`

## User personas
- **Cliente**: browses catalog, searches, filters by badge, adds to cart, verifies list, adds delivery, sends order via WhatsApp
- **Admin**: logs in at `/admin`, uploads products (name + price + image + optional badge), deletes products, monitors Instagram publish status

## Core requirements (implemented)
- [x] Public catalog (search, sort by price, badge filters)
- [x] Product cards with large price, auto code `CTS-XXXXXX`, badges (nuevo/oferta/agotado)
- [x] Cart drawer with qty controls, persistent in localStorage
- [x] Checkout modal "Verifique sus productos" with confirmation checkbox
- [x] Delivery collapsible (address + phone) appended to WhatsApp message
- [x] WhatsApp send button → wa.me deep link with pre-filled order (codes, names, total, delivery)
- [x] QR share modal in header (canvas + copy/download)
- [x] Admin login at `/admin` only, JWT auth
- [x] Admin product form with validations (image type, size, price > 0, name required)
- [x] Instagram publish background task (activates when `INSTAGRAM_USER_ID` + `META_ACCESS_TOKEN` present)
- [x] Pastel palette (sage green #84A59D, dusty pink #F28482, cream #F7EDE2), Cormorant Garamond + Outfit fonts

## Configuration
- `WHATSAPP_NUMBER=+584149694047`
- `INSTAGRAM_USER_ID`, `META_ACCESS_TOKEN`: **empty** → products created with `instagram_status="skipped"`. Add creds + restart backend to activate.
- `PUBLIC_BASE_URL`: leave empty; when Instagram creds are set, populate this with the public deployment URL so Meta can fetch the image.

## What's been implemented — 2026-02
- End-to-end catalog + admin flow, cart, checkout, WhatsApp, QR, Instagram-ready code path.
- Testing agent iteration 1: 84.6% backend → all issues fixed; 98% frontend.

## Backlog (P1/P2)
- **P1** Configure real Instagram credentials + `PUBLIC_BASE_URL` to enable auto-publish.
- **P1** Multiple product images (gallery) with primary selection.
- **P2** Product categories/tags for richer filtering.
- **P2** Order history stored server-side (currently only WhatsApp).
- **P2** Email/SMS notification to admin on new WhatsApp order.
- **P2** Inventory count per product with automatic `agotado` when stock=0.
