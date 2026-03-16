import {
  addGems,
  createPurchase,
  getEntitlement,
  getSupporterChoice,
  saveSupporterChoice,
  upsertEntitlement,
} from "../db.js";
import {
  getProductBySku,
  SUPPORTER_ALLOWED_BOOSTS,
  SUPPORTER_ALLOWED_SKINS,
} from "../catalog.js";

function grantProductEntitlements(userId, purchaseId, product) {
  if (product.type === "no_ads") {
    upsertEntitlement({
      userId,
      key: "no_ads",
      value: { active: true },
      purchaseId,
    });
    return;
  }

  if (product.type === "supporter_pack") {
    upsertEntitlement({
      userId,
      key: "supporter_pack",
      value: { active: true },
      purchaseId,
    });
    upsertEntitlement({
      userId,
      key: "supporter_pack_pending_choice",
      value: { active: true },
      purchaseId,
    });
    addGems(userId, 500);
    return;
  }

  if (product.type === "boost") {
    upsertEntitlement({
      userId,
      key: `boost:${product.boostId}`,
      value: { owned: true },
      purchaseId,
    });
    return;
  }

  if (product.type === "premium_skin") {
    upsertEntitlement({
      userId,
      key: `skin:${product.skinId}`,
      value: { owned: true },
      purchaseId,
    });
  }
}

export function applySuccessfulPayment({
  userId,
  sku,
  provider,
  providerPaymentId,
  amountCents,
  currency,
  raw,
}) {
  const product = getProductBySku(sku);
  if (!product) {
    throw new Error("Unknown product SKU");
  }

  if (product.amountCents !== amountCents) {
    throw new Error("Amount mismatch for product");
  }

  if ((currency || "").toUpperCase() !== product.currency) {
    throw new Error("Currency mismatch for product");
  }

  const { created, purchase } = createPurchase({
    userId,
    provider,
    providerPaymentId,
    sku,
    amountCents,
    currency: product.currency,
    status: "completed",
    raw,
  });

  // Idempotent: if purchase already exists, do not re-grant gems/unlocks.
  if (created) {
    grantProductEntitlements(userId, purchase.id, product);
  }

  return { created, purchase, product };
}

export function applySupporterChoices({ userId, skinId, boostId }) {
  if (!SUPPORTER_ALLOWED_SKINS.includes(skinId)) {
    throw new Error("Invalid premium skin choice");
  }
  if (!SUPPORTER_ALLOWED_BOOSTS.includes(boostId)) {
    throw new Error("Invalid boost choice");
  }

  const supporter = getEntitlement(userId, "supporter_pack");
  if (!supporter?.active) {
    throw new Error("Supporter pack not owned");
  }

  const pending = getEntitlement(userId, "supporter_pack_pending_choice");
  if (!pending?.active) {
    const existingChoice = getSupporterChoice(userId);
    return { alreadyCompleted: true, choice: existingChoice };
  }

  upsertEntitlement({
    userId,
    key: `skin:${skinId}`,
    value: { owned: true, source: "supporter_pack" },
    purchaseId: null,
  });
  upsertEntitlement({
    userId,
    key: `boost:${boostId}`,
    value: { owned: true, source: "supporter_pack" },
    purchaseId: null,
  });
  upsertEntitlement({
    userId,
    key: "supporter_pack_pending_choice",
    value: { active: false },
    purchaseId: null,
  });
  saveSupporterChoice({
    userId,
    purchaseId: null,
    skinId,
    boostId,
  });

  return {
    alreadyCompleted: false,
    choice: { userId, purchaseId: null, skinId, boostId },
  };
}
