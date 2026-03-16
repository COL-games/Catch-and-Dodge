# Backend Store - First Game

Backend API for real-money purchases with Stripe + PayPal.

## Features

- Product catalog (no-ads, supporter pack, boosts, premium skins)
- Stripe Checkout session creation (card + wallet support where enabled, including Apple Pay via Stripe)
- Stripe webhook verification
- PayPal order creation and capture
- Local JSON storage for users, purchases, entitlements, wallet
- Idempotent purchase processing
- Supporter pack post-purchase choice flow (1 premium skin + 1 boost)

## Quick start

1. Copy `.env.example` to `.env` and fill keys.
2. Install dependencies:
   - `cd backend`
   - `npm install`
3. Run API:
   - `npm run dev`
4. API base URL:
   - `http://localhost:8080`

## Main endpoints

- `GET /api/health`
- `GET /api/catalog`
- `GET /api/me/entitlements?userId=player_demo`
- `POST /api/checkout/stripe/session`
- `POST /api/webhooks/stripe`
- `POST /api/checkout/paypal/order`
- `POST /api/checkout/paypal/capture`
- `POST /api/me/supporter/choices`

## Stripe webhook local test

Use Stripe CLI:

- `stripe listen --forward-to localhost:8080/api/webhooks/stripe`

Then put provided signing secret into `STRIPE_WEBHOOK_SECRET`.

## Security notes

- Card details are never handled by this server.
- Payments are confirmed only through provider verification (webhook/capture).
- Unlocks are done server-side and persisted before client sync.
