import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, createSubscription } from "@/lib/paystack";
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
        const sub      = data as Record<string, unknown>;
        const customer = sub.customer as Record<string, string>;
        const code     = sub.subscription_code as string;
        const token    = sub.email_token as string;
        const status   = (sub.status as string) ?? "active";

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

      // ── Successful charge ─────────────────────────────────────────────────
      case "charge.success": {
        const charge  = data as Record<string, unknown>;
        const meta    = (charge.metadata as Record<string, string> | null) ?? {};
        const customer = charge.customer as Record<string, string> | undefined;

        if (meta.trial === "true" && meta.plan_code && customer?.customer_code) {
          // ── Trial flow: card was authorised with ₦100.
          //    Create a real subscription starting 30 days from now so the
          //    first billing period is free, then auto-charges monthly.
          const authorization = charge.authorization as Record<string, string> | undefined;
          const authCode = authorization?.authorization_code;

          const startDate = new Date();
          startDate.setDate(startDate.getDate() + 30);

          let sub;
          try {
            sub = await createSubscription({
              customer:      customer.customer_code,
              plan:          meta.plan_code,
              authorization: authCode,
              start_date:    startDate.toISOString(),
            });
          } catch (err) {
            console.error("[webhook] createSubscription failed:", err);
            // Still grant Premium access — the delayed sub creation failed but
            // the card auth succeeded. A retry/webhook re-send will handle it.
            if (customer?.email) {
              await prisma.user.updateMany({
                where: { email: customer.email },
                data: {
                  plan: "premium",
                  paystackCustomerCode: customer.customer_code,
                  subscriptionStatus: "trialing",
                  subscriptionEndsAt: startDate,
                },
              });
            }
            break;
          }

          if (customer?.email) {
            await prisma.user.updateMany({
              where: { email: customer.email },
              data: {
                plan: "premium",
                paystackCustomerCode: customer.customer_code,
                paystackSubscriptionCode: sub.subscription_code,
                paystackEmailToken: sub.email_token,
                subscriptionStatus: "trialing",
                subscriptionEndsAt: startDate, // when the trial ends (first charge)
              },
            });
          }
        } else {
          // ── Regular renewal or returning-subscriber checkout ──────────────
          // Only act on subscription-related charges (has plan field)
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
        }
        break;
      }

      // ── Subscription set to not renew (still active until period ends) ─────
      case "subscription.not_renew": {
        const sub      = data as Record<string, unknown>;
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
        const sub      = data as Record<string, unknown>;
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
        const inv      = data as Record<string, unknown>;
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
