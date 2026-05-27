import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://amo-infinitum.vercel.app";

export async function POST() {
  if (!stripe) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  if (!PRICE_ID) return NextResponse.json({ error: "Price not configured" }, { status: 503 });

  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username, userId } = session;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Create Stripe customer if needed
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: String(userId), username },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  // Determine trial eligibility: first-time subscribers only
  const isFirstTime = !user.stripeSubscriptionId;

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_collection: "always",
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    ...(isFirstTime ? { subscription_data: { trial_period_days: 30 } } : {}),
    success_url: `${APP_URL}/${username}/inkwell/billing?success=1`,
    cancel_url: `${APP_URL}/${username}/inkwell/billing`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
