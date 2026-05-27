import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/lemonsqueezy";
import { prisma } from "@/lib/db";

// Lemon Squeezy → our internal subscription status mapping
// LS status       → { plan, subscriptionStatus }
const STATUS_MAP: Record<string, { plan: "free" | "premium"; status: string }> = {
  on_trial:  { plan: "premium", status: "trialing" },
  active:    { plan: "premium", status: "active" },
  cancelled: { plan: "premium", status: "non-renewing" }, // still active until ends_at
  expired:   { plan: "free",    status: "cancelled" },
  past_due:  { plan: "free",    status: "past_due" },
  unpaid:    { plan: "free",    status: "past_due" },
  paused:    { plan: "free",    status: "cancelled" },
};

interface LsWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: Record<string, string>;
  };
  data: {
    id: string; // subscription ID
    attributes: {
      status:         string;
      customer_id:    number;
      user_email:     string;
      trial_ends_at:  string | null;
      renews_at:      string | null;
      ends_at:        string | null;
    };
  };
}

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("X-Signature") ?? "";

  if (!verifyWebhookSignature(body, signature)) {
    console.error("[webhook] Lemon Squeezy signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: LsWebhookEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { meta, data } = event;
  const eventName      = meta.event_name;
  const rawUserId      = meta.custom_data?.user_id;
  const userEmail      = data.attributes.user_email;
  const subscriptionId = data.id;
  const customerId     = String(data.attributes.customer_id);
  const lsStatus       = data.attributes.status;

  // Prefer userId from custom_data (set at checkout); fall back to email lookup
  const where = rawUserId
    ? { id: parseInt(rawUserId) }
    : { email: userEmail };

  // Resolve the endsAt date depending on subscription state
  function resolveEndsAt(): Date | null {
    const { trial_ends_at, ends_at, renews_at } = data.attributes;
    if (lsStatus === "on_trial" && trial_ends_at) return new Date(trial_ends_at);
    if (ends_at)   return new Date(ends_at);
    if (renews_at) return new Date(renews_at);
    return null;
  }

  try {
    switch (eventName) {

      // ── Subscription created (first checkout complete) ─────────────────────
      case "subscription_created": {
        const mapped = STATUS_MAP[lsStatus] ?? { plan: "premium", status: lsStatus };
        await prisma.user.updateMany({
          where,
          data: {
            plan:                mapped.plan,
            lsCustomerId:        customerId,
            lsSubscriptionId:    subscriptionId,
            subscriptionStatus:  mapped.status,
            subscriptionEndsAt:  lsStatus === "on_trial" ? resolveEndsAt() : null,
          },
        });
        break;
      }

      // ── Any status change (renewal, cancellation, trial end, etc.) ─────────
      case "subscription_updated": {
        const mapped = STATUS_MAP[lsStatus] ?? { plan: "free", status: lsStatus };
        const endsAt = (lsStatus === "cancelled" || lsStatus === "expired") ? resolveEndsAt() : null;
        await prisma.user.updateMany({
          where,
          data: {
            plan:                mapped.plan,
            lsCustomerId:        customerId,
            lsSubscriptionId:    subscriptionId,
            subscriptionStatus:  mapped.status,
            subscriptionEndsAt:  lsStatus === "on_trial" ? resolveEndsAt() : endsAt,
          },
        });
        break;
      }

      // ── User clicked Cancel (still active until next billing date) ─────────
      case "subscription_cancelled": {
        await prisma.user.updateMany({
          where,
          data: {
            subscriptionStatus: "non-renewing",
            subscriptionEndsAt: resolveEndsAt(),
          },
        });
        break;
      }

      // ── Trial or subscription fully expired ───────────────────────────────
      case "subscription_expired": {
        await prisma.user.updateMany({
          where,
          data: {
            plan:               "free",
            subscriptionStatus: "cancelled",
          },
        });
        break;
      }

      // ── Successful renewal payment ─────────────────────────────────────────
      case "subscription_payment_success": {
        await prisma.user.updateMany({
          where,
          data: {
            plan:               "premium",
            subscriptionStatus: "active",
            subscriptionEndsAt: null,
          },
        });
        break;
      }

      // ── Renewal payment failed ─────────────────────────────────────────────
      case "subscription_payment_failed": {
        await prisma.user.updateMany({
          where,
          data: {
            plan:               "free",
            subscriptionStatus: "past_due",
          },
        });
        break;
      }

      // ── Payment recovered after failure ───────────────────────────────────
      case "subscription_payment_recovered": {
        await prisma.user.updateMany({
          where,
          data: {
            plan:               "premium",
            subscriptionStatus: "active",
            subscriptionEndsAt: null,
          },
        });
        break;
      }

      default:
        // Unhandled event — log and move on
        console.log(`[webhook] unhandled event: ${eventName}`);
        break;
    }
  } catch (err) {
    console.error("[webhook] handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
