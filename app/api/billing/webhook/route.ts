import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { prisma } from "@/lib/db";

// Paystack sends JSON; we must read the raw body to verify the HMAC signature.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(body, signature)) {
    console.error("[webhook] Paystack signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event: type, data } = event;

  try {
    switch (type) {

      // ── New subscription created (fires after first successful charge) ──────
      case "subscription.create": {
        const sub     = data as Record<string, unknown>;
        const customer = sub.customer as Record<string, string>;
        const code    = sub.subscription_code as string;
        const token   = sub.email_token as string;
        const status  = (sub.status as string) ?? "active";

        await prisma.user.updateMany({
          where: { email: customer.email },
          data: {
            plan: "premium",
            paystackCustomerCode: customer.customer_code,
            paystackSubscriptionCode: code,
            paystackEmailToken: token,
            subscriptionStatus: status,
            subscriptionEndsAt: null,
          },
        });
        break;
      }

      // ── Successful charge (covers renewals + initial payment) ──────────────
      case "charge.success": {
        const charge  = data as Record<string, unknown>;
        const meta    = (charge.metadata as Record<string, string> | null) ?? {};
        const customer = charge.customer as Record<string, string> | undefined;

        // Only act if this is a subscription charge (has plan in metadata or plan field)
        const hasPlan = !!(charge.plan || meta.plan_code);
        if (!hasPlan) break;

        if (customer?.email) {
          await prisma.user.updateMany({
            where: { email: customer.email },
            data: {
              plan: "premium",
              subscriptionStatus: "active",
              subscriptionEndsAt: null,
            },
          });
        }
        break;
      }

      // ── Subscription set to not renew (still active until period ends) ─────
      case "subscription.not_renew": {
        const sub     = data as Record<string, unknown>;
        const customer = sub.customer as Record<string, string>;
        const nextDate = sub.next_payment_date as string | null;

        await prisma.user.updateMany({
          where: { email: customer.email },
          data: {
            subscriptionStatus: "non-renewing",
            subscriptionEndsAt: nextDate ? new Date(nextDate) : null,
          },
        });
        break;
      }

      // ── Subscription disabled / cancelled ─────────────────────────────────
      case "subscription.disable": {
        const sub     = data as Record<string, unknown>;
        const customer = sub.customer as Record<string, string>;

        await prisma.user.updateMany({
          where: { email: customer.email },
          data: {
            plan: "free",
            subscriptionStatus: "cancelled",
          },
        });
        break;
      }

      // ── Payment failed on renewal ──────────────────────────────────────────
      case "invoice.payment_failed": {
        const inv     = data as Record<string, unknown>;
        const customer = inv.customer as Record<string, string> | undefined;

        if (customer?.email) {
          await prisma.user.updateMany({
            where: { email: customer.email },
            data: {
              plan: "free",
              subscriptionStatus: "past_due",
            },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[webhook] handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
