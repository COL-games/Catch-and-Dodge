const PRODUCTS = {
  no_ads_999: {
    sku: "no_ads_999",
    name: "No Ads",
    description: "Rimuove tutte le pubblicita",
    type: "no_ads",
    amountCents: 999,
    currency: "EUR",
  },
  supporter_pack_599: {
    sku: "supporter_pack_599",
    name: "Supporter Pack",
    description: "1 skin premium a scelta + 500 gemme + 1 boost a scelta",
    type: "supporter_pack",
    amountCents: 599,
    currency: "EUR",
    requiresChoice: true,
  },
  boost_extra_life_029: {
    sku: "boost_extra_life_029",
    name: "Boost VITA EXTRA",
    type: "boost",
    boostId: "extra_life",
    amountCents: 59,
    currency: "EUR",
  },
  boost_start_shield_029: {
    sku: "boost_start_shield_029",
    name: "Boost SCUDO INIZIALE",
    type: "boost",
    boostId: "start_shield",
    amountCents: 59,
    currency: "EUR",
  },
  boost_score_boost_029: {
    sku: "boost_score_boost_029",
    name: "Boost MOLTIPLICATORE",
    type: "boost",
    boostId: "score_boost",
    amountCents: 59,
    currency: "EUR",
  },
  boost_gem_bonus_029: {
    sku: "boost_gem_bonus_029",
    name: "Boost BONUS GEMME",
    type: "boost",
    boostId: "gem_bonus",
    amountCents: 59,
    currency: "EUR",
  },
  boost_slow_start_029: {
    sku: "boost_slow_start_029",
    name: "Boost AVVIO LENTO",
    type: "boost",
    boostId: "slow_start",
    amountCents: 59,
    currency: "EUR",
  },
  premium_dragon_059: {
    sku: "premium_dragon_059",
    name: "Skin DRAGO",
    type: "premium_skin",
    skinId: "dragon",
    amountCents: 59,
    currency: "EUR",
  },
  premium_oni_059: {
    sku: "premium_oni_059",
    name: "Skin ONI MASK",
    type: "premium_skin",
    skinId: "oni",
    amountCents: 59,
    currency: "EUR",
  },
  premium_xwing_059: {
    sku: "premium_xwing_059",
    name: "Skin X-WING",
    type: "premium_skin",
    skinId: "xwing",
    amountCents: 59,
    currency: "EUR",
  },
};

export const SUPPORTER_ALLOWED_SKINS = ["dragon", "oni", "xwing"];
export const SUPPORTER_ALLOWED_BOOSTS = [
  "extra_life",
  "start_shield",
  "score_boost",
  "gem_bonus",
  "slow_start",
];

export function getProductBySku(sku) {
  return PRODUCTS[sku] || null;
}

export function listCatalog() {
  return Object.values(PRODUCTS);
}
