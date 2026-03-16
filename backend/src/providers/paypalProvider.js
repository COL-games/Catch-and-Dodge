import paypal from "@paypal/checkout-server-sdk";
import { config } from "../config.js";
import { getProductBySku } from "../catalog.js";

let paypalClient = null;

function getEnvironment() {
  const env = (config.paypalEnv || "sandbox").toLowerCase();
  if (!config.paypalClientId || !config.paypalClientSecret) {
    throw new Error("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }
  if (env === "live") {
    return new paypal.core.LiveEnvironment(config.paypalClientId, config.paypalClientSecret);
  }
  return new paypal.core.SandboxEnvironment(config.paypalClientId, config.paypalClientSecret);
}

function getClient() {
  if (!paypalClient) {
    paypalClient = new paypal.core.PayPalHttpClient(getEnvironment());
  }
  return paypalClient;
}

export async function createPayPalOrder({ userId, sku }) {
  const product = getProductBySku(sku);
  if (!product) throw new Error("Unknown product SKU");

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: sku,
        custom_id: userId,
        amount: {
          currency_code: product.currency,
          value: (product.amountCents / 100).toFixed(2),
        },
        description: product.description || product.name,
      },
    ],
    application_context: {
      brand_name: "Catch & Dodge",
      user_action: "PAY_NOW",
      return_url: `${config.appBaseUrl}/index2.html?checkout=success&provider=paypal`,
      cancel_url: `${config.appBaseUrl}/index2.html?checkout=cancel&provider=paypal`,
    },
  });

  return getClient().execute(request);
}

export async function capturePayPalOrder(orderId) {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  return getClient().execute(request);
}
