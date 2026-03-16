import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { listCatalog, SUPPORTER_ALLOWED_BOOSTS, SUPPORTER_ALLOWED_SKINS } from "./catalog.js";
import {
  ensureUser,
  getEntitlements,
  getWallet,
  recordWebhookEvent,
} from "./db.js";
import { applySuccessfulPayment, applySupporterChoices } from "./services/purchaseService.js";
import {
  createStripeCheckoutSession,
  getStripeCheckoutSession,
  verifyStripeWebhookEvent,
} from "./providers/stripeProvider.js";

const app = express();

const allowedOrigins = String(config.corsOrigin || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/server-to-server
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "Stripe-Signature"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // preflight

function getUserId(req) {
  return (
    req.body?.userId ||
    req.query?.userId ||
    req.header("x-user-id") ||
    "player_demo"
  );
}
// ...existing code...
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "first-game-backend" });
});

app.get("/api/catalog", (_req, res) => {
  res.json({
    items: listCatalog(),
    supporterChoices: {
      skins: SUPPORTER_ALLOWED_SKINS,
      boosts: SUPPORTER_ALLOWED_BOOSTS,
    },
  });
});

app.get("/api/me/entitlements", (req, res) => {
  const userId = getUserId(req);
  ensureUser(userId);
  res.json({
    userId,
    wallet: getWallet(userId),
    entitlements: getEntitlements(userId),
  });
});

// Stripe webhook must receive raw body before JSON parsing.
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];
    const event = verifyStripeWebhookEvent(req.body, signature);

    const inserted = recordWebhookEvent("stripe", event.id, event);
    if (!inserted) {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.payment_status === "paid") {
        const userId = session.metadata?.userId;
        const sku = session.metadata?.sku;
        if (!userId || !sku) {
          throw new Error("Missing userId or sku in Stripe session metadata");
        }

        applySuccessfulPayment({
          userId,
          sku,
          provider: "stripe",
          providerPaymentId: session.id,
          amountCents: session.amount_total,
          currency: (session.currency || "").toUpperCase(),
          raw: session,
        });
      }
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

app.use(express.json());

app.post("/api/checkout/stripe/session", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sku } = req.body || {};
    if (!sku) return res.status(400).json({ ok: false, error: "Missing sku" });

    ensureUser(userId);
    const session = await createStripeCheckoutSession({ userId, sku });

    return res.json({
      ok: true,
      provider: "stripe",
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/checkout/stripe/confirm", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "Missing sessionId" });
    }

    const session = await getStripeCheckoutSession(sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, error: "Stripe session not found" });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({ ok: false, error: "Stripe payment not completed" });
    }

    const sessionUserId = session.metadata?.userId;
    const sku = session.metadata?.sku;
    if (!sessionUserId || !sku) {
      return res.status(400).json({ ok: false, error: "Missing Stripe metadata (userId or sku)" });
    }

    if (sessionUserId !== userId) {
      return res.status(403).json({ ok: false, error: "Session user mismatch" });
    }

    applySuccessfulPayment({
      userId,
      sku,
      provider: "stripe",
      providerPaymentId: session.id,
      amountCents: session.amount_total,
      currency: (session.currency || "").toUpperCase(),
      raw: session,
    });

    return res.json({ ok: true, provider: "stripe", sessionId: session.id, sku });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/me/supporter/choices", (req, res) => {
  try {
    const userId = getUserId(req);
    const { skinId, boostId } = req.body || {};
    if (!skinId || !boostId) {
      return res.status(400).json({ ok: false, error: "Missing skinId or boostId" });
    }

    const result = applySupporterChoices({ userId, skinId, boostId });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Store backend running on http://localhost:${config.port}`);
});
