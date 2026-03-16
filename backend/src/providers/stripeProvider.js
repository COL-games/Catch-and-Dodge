import Stripe from "stripe";
import { config } from "../config.js";
import { getProductBySku } from "../catalog.js";

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;
const frontendBase = String(config.frontendBaseUrl || "https://ollysss.github.io/first-game")
  .replace(/\/+$/, ""); // rimuove slash finali
function requireStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  return stripe;
}

export async function createStripeCheckoutSession({ userId, sku }) {
  const product = getProductBySku(sku);
  if (!product) throw new Error("Unknown product SKU");

  const s = requireStripe();
  const session = await s.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: product.currency.toLowerCase(),
          unit_amount: product.amountCents,
          product_data: {
            name: product.name,
            description: product.description || product.sku,
            metadata: { sku: product.sku },
          },
        },
      },
    ],
    success_url: `${frontendBase}/index.html?checkout=success&provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${frontendBase}/index.html?checkout=cancel&provider=stripe`,
    metadata: { userId, sku },
  });

  return session;
}

export async function getStripeCheckoutSession(sessionId) {
  if (!sessionId) {
    throw new Error("Missing Stripe sessionId");
  }
  const s = requireStripe();
  return s.checkout.sessions.retrieve(sessionId);
}

export function verifyStripeWebhookEvent(rawBody, signature) {
  const s = requireStripe();
  if (!config.stripeWebhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }
  return s.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
}
