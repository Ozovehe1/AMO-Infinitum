/**
 * Paystack API client — fetch-based, no external SDK needed.
 * Docs: https://paystack.com/docs/api
 */

const BASE = "https://api.paystack.co";
const KEY = process.env.PAYSTACK_SECRET_KEY;

if (!KEY) {
  console.warn("[paystack] PAYSTACK_SECRET_KEY not set — billing features disabled");
}

async function request<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  if (!KEY) throw new Error("Paystack not configured");

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json() as { status: boolean; message: string; data: T };
  if (!json.status) throw new Error(`Paystack error: ${json.message}`);
  return json.data;
}

// ── Customer ─────────────────────────────────────────────────────────────────

export interface PaystackCustomer {
  id: number;
  customer_code: string;
  email: string;
  subscriptions?: PaystackSubscription[];
}

export async function createCustomer(email: string, metadata?: Record<string, string>): Promise<PaystackCustomer> {
  return request("POST", "/customer", { email, metadata });
}

export async function getCustomer(customerCode: string): Promise<PaystackCustomer> {
  return request("GET", `/customer/${customerCode}`);
}

// ── Transaction (checkout) ───────────────────────────────────────────────────

export interface PaystackTransaction {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface InitializeOptions {
  email: string;
  amount: number;           // in kobo (NGN×100) or cents (USD×100)
  plan?: string;            // plan code — Paystack creates subscription automatically
  callback_url?: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
}

export async function initializeTransaction(opts: InitializeOptions): Promise<PaystackTransaction> {
  return request("POST", "/transaction/initialize", opts as unknown as Record<string, unknown>);
}

// ── Subscription ─────────────────────────────────────────────────────────────

export interface PaystackSubscription {
  id: number;
  subscription_code: string;
  email_token: string;
  status: string;           // "active" | "non-renewing" | "attention" | "cancelled" | "completed"
  plan: { plan_code: string; amount: number };
  customer: { customer_code: string; email: string };
  next_payment_date: string | null;
}

export async function getSubscription(code: string): Promise<PaystackSubscription> {
  return request("GET", `/subscription/${code}`);
}

export async function disableSubscription(code: string, token: string): Promise<void> {
  await request("POST", "/subscription/disable", { code, token });
}

export async function enableSubscription(code: string, token: string): Promise<void> {
  await request("POST", "/subscription/enable", { code, token });
}

/**
 * Returns the Paystack-hosted subscription management URL.
 * Users can update card, cancel, or resume from here.
 */
export function subscriptionManageUrl(emailToken: string): string {
  return `https://paystack.com/manage/subscriptions/${emailToken}`;
}

// ── Webhook verification ──────────────────────────────────────────────────────

import { createHmac } from "crypto";

export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!KEY) return false;
  const hash = createHmac("sha512", KEY).update(body).digest("hex");
  return hash === signature;
}

export const paystackEnabled = !!KEY;
