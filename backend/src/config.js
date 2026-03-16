import dotenv from "dotenv";

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name, fallback = "") {
  const value = process.env[name];
  return value && value.trim() ? value : fallback;
}

export const config = {
  port: Number(optional("PORT", "8080")),
  appBaseUrl: optional("APP_BASE_URL", "http://localhost:5500"),
  corsOrigin: optional("CORS_ORIGIN", "http://127.0.0.1:5500,http://localhost:5500")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean),
  stripeSecretKey: optional("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: optional("STRIPE_WEBHOOK_SECRET"),
  paypalClientId: optional("PAYPAL_CLIENT_ID"),
  paypalClientSecret: optional("PAYPAL_CLIENT_SECRET"),
  paypalEnv: optional("PAYPAL_ENV", "sandbox"),
  required,
};
