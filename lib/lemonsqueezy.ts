/**
 * Lemon Squeezy API client — fetch-based, JSON:API format.
 * Docs: https://docs.lemonsqueezy.com/api
 *
 * Acts as merchant of record — no KYC required from you.
 * Set up a subscription variant in your LS dashboard with a 30-day free trial.
 */

const BASE = "https://api.lemonsqueezy.com/v1";
const KEY  = process.env.LEMONSQUEEZY_API_KEY;

if (!KEY) {
  console.warn("[lemonsqueezy] LEMONSQUEEZY_API_KEY not set — billing features disabled");
}

async function request<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  if (!KEY) throw new Error("Lemon Squeezy not configured");

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Checkout ──────────────────────────────────────────────────────────────────

export interface CheckoutOptions {
  email:       string;
  userId:      string;
  username:    string;
  redirectUrl: string;
}

interface LsCheckoutResponse {
  data: { attributes: { url: string } };
}

/**
 * Creates a hosted checkout URL for the configured variant.
 * The 30-day free trial is set on the variant inside the LS dashboard —
 * no extra code needed here.
 */
export async function createCheckout(opts: CheckoutOptions): Promise<string> {
  const storeId   = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

  if (!storeId || !variantId) throw new Error("LEMONSQUEEZY_STORE_ID or LEMONSQUEEZY_VARIANT_ID not set");

  const res = await request<LsCheckoutResponse>("POST", "/checkouts", {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: opts.email,
          custom: {
            user_id:  opts.userId,
            username: opts.username,
          },
        },
        product_options: {
          redirect_url: opts.redirectUrl,
        },
      },
      relationships: {
        store:   { data: { type: "stores",   id: storeId } },
        variant: { data: { type: "variants", id: variantId } },
      },
    },
  });

  return res.data.attributes.url;
}

// ── Subscription ──────────────────────────────────────────────────────────────

interface LsSubscriptionResponse {
  data: {
    id: string;
    attributes: {
      status: string;
      customer_id: number;
      user_email: string;
      trial_ends_at: string | null;
      renews_at:     string | null;
      ends_at:       string | null;
      urls: {
        customer_portal:       string;
        update_payment_method: string;
      };
    };
  };
}

export async function getSubscription(id: string): Promise<LsSubscriptionResponse> {
  return request<LsSubscriptionResponse>("GET", `/subscriptions/${id}`);
}

/**
 * Fetches the Lemon Squeezy customer portal URL for the given subscription.
 * Users can update card, cancel, or resume from here.
 */
export async function getCustomerPortalUrl(subscriptionId: string): Promise<string> {
  const sub = await getSubscription(subscriptionId);
  return sub.data.attributes.urls.customer_portal;
}

// ── Webhook verification ──────────────────────────────────────────────────────

import { createHmac } from "crypto";

/**
 * Verifies the X-Signature header using HMAC SHA-256 + LEMONSQUEEZY_WEBHOOK_SECRET.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;
  const hash = createHmac("sha256", secret).update(body).digest("hex");
  return hash === signature;
}

export const lsEnabled = !!(
  KEY &&
  process.env.LEMONSQUEEZY_STORE_ID &&
  process.env.LEMONSQUEEZY_VARIANT_ID
);
