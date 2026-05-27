import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { initializeTransaction, paystackEnabled } from "@/lib/paystack";

const PLAN_CODE  = process.env.PAYSTACK_PLAN_CODE;
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || "https://amo-infinitum.vercel.app";

export async function POST() {
  if (!paystackEnabled) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  if (!PLAN_CODE)        return NextResponse.json({ error: "Plan not configured" }, { status: 503 });

  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username, userId } = session;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, paystackSubscriptionCode: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // First-time subscriber → card auth (₦100) + delayed subscription (trial).
  // Returning subscriber → direct plan checkout, charged immediately.
  const isFirstTime = !user.paystackSubscriptionCode;

  let tx;

  if (isFirstTime) {
    // Step 1 of 2 — authorise the card with a small ₦100 charge.
    // The webhook (charge.success) will read metadata.trial === "true" and
    // call POST /subscription with start_date = now + 30 days, making
    // the subscription free for the first month.
    tx = await initializeTransaction({
      email: user.email,
      amount: 10000, // ₦100 in kobo — minimum Paystack allows for card auth
      callback_url: `${APP_URL}/${username}/inkwell/billing?success=1`,
      metadata: {
        trial: "true",
        plan_code: PLAN_CODE,
        userId: String(userId),
        username,
        cancel_action: `${APP_URL}/${username}/inkwell/billing`,
      },
      channels: ["card"],
    });
  } else {
    // Returning subscriber — immediate recurring subscription at plan price.
    tx = await initializeTransaction({
      email: user.email,
      amount: 0, // Paystack uses the plan amount
      plan: PLAN_CODE,
      callback_url: `${APP_URL}/${username}/inkwell/billing?success=1`,
      metadata: {
        userId: String(userId),
        username,
        cancel_action: `${APP_URL}/${username}/inkwell/billing`,
      },
      channels: ["card"],
    });
  }

  return NextResponse.json({ url: tx.authorization_url });
}
