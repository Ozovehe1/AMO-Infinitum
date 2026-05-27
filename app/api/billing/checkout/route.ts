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

  // isFirstTime drives which CTA copy the frontend showed, but the actual
  // checkout flow is identical — Paystack handles the plan billing from here.
  const tx = await initializeTransaction({
    email: user.email,
    amount: 0,                                 // 0 = Paystack uses the plan amount
    plan: PLAN_CODE,
    callback_url: `${APP_URL}/${username}/inkwell/billing?success=1`,
    metadata: {
      userId: String(userId),
      username,
      cancel_action: `${APP_URL}/${username}/inkwell/billing`,
    },
    channels: ["card"],
  });

  return NextResponse.json({ url: tx.authorization_url });
}
