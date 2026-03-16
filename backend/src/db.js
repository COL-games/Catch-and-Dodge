import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
const dataPath = path.resolve(dataDir, "store.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const EMPTY_DB = {
  users: {},
  wallets: {},
  purchasesByProviderPaymentId: {},
  purchases: {},
  entitlements: {},
  supporterChoices: {},
  webhookEvents: {},
};

function loadState() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(EMPTY_DB, null, 2), "utf8");
    return structuredClone(EMPTY_DB);
  }
  const raw = fs.readFileSync(dataPath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return { ...structuredClone(EMPTY_DB), ...parsed };
  } catch {
    fs.writeFileSync(dataPath, JSON.stringify(EMPTY_DB, null, 2), "utf8");
    return structuredClone(EMPTY_DB);
  }
}

let state = loadState();

function saveState() {
  fs.writeFileSync(dataPath, JSON.stringify(state, null, 2), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

export function ensureUser(userId) {
  let changed = false;
  if (!state.users[userId]) {
    state.users[userId] = { id: userId, createdAt: nowIso() };
    changed = true;
  }
  if (!state.wallets[userId]) {
    state.wallets[userId] = { userId, gems: 0, updatedAt: nowIso() };
    changed = true;
  }
  if (!state.entitlements[userId]) {
    state.entitlements[userId] = {};
    changed = true;
  }
  if (changed) saveState();
}

export function getWallet(userId) {
  ensureUser(userId);
  return state.wallets[userId];
}

export function addGems(userId, delta) {
  ensureUser(userId);
  state.wallets[userId].gems += delta;
  state.wallets[userId].updatedAt = nowIso();
  saveState();
  return getWallet(userId);
}

export function createPurchase({
  userId,
  provider,
  providerPaymentId,
  sku,
  amountCents,
  currency,
  status,
  raw,
}) {
  ensureUser(userId);

  const existingId = state.purchasesByProviderPaymentId[providerPaymentId];
  if (existingId) {
    return { created: false, purchase: state.purchases[existingId] };
  }

  const id = randomUUID();
  const purchase = {
    id,
    userId,
    provider,
    providerPaymentId,
    sku,
    status,
    amountCents,
    currency,
    raw,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  state.purchases[id] = purchase;
  state.purchasesByProviderPaymentId[providerPaymentId] = id;
  saveState();

  return { created: true, purchase };
}

export function upsertEntitlement({ userId, key, value, purchaseId }) {
  ensureUser(userId);
  const existing = state.entitlements[userId][key];
  const id = existing?.id || randomUUID();

  state.entitlements[userId][key] = {
    id,
    entitlementKey: key,
    value,
    sourcePurchaseId: purchaseId || existing?.sourcePurchaseId || null,
    updatedAt: nowIso(),
    createdAt: existing?.createdAt || nowIso(),
  };

  saveState();
  return id;
}

export function getEntitlements(userId) {
  ensureUser(userId);
  const entries = state.entitlements[userId] || {};
  const out = {};
  for (const [k, v] of Object.entries(entries)) {
    out[k] = v.value;
  }
  return out;
}

export function getEntitlement(userId, key) {
  ensureUser(userId);
  return state.entitlements[userId]?.[key]?.value || null;
}

export function saveSupporterChoice({ userId, purchaseId, skinId, boostId }) {
  ensureUser(userId);
  state.supporterChoices[userId] = {
    userId,
    purchaseId: purchaseId || null,
    skinId,
    boostId,
    updatedAt: nowIso(),
    createdAt: state.supporterChoices[userId]?.createdAt || nowIso(),
  };
  saveState();
}

export function getSupporterChoice(userId) {
  return state.supporterChoices[userId] || null;
}

export function recordWebhookEvent(provider, providerEventId, payload) {
  const key = `${provider}:${providerEventId}`;
  if (state.webhookEvents[key]) {
    return false;
  }
  state.webhookEvents[key] = {
    id: randomUUID(),
    provider,
    providerEventId,
    payload,
    createdAt: nowIso(),
  };
  saveState();
  return true;
}
