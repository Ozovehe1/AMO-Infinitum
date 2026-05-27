import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserPlan } from "@/lib/plan";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { plan: true, subscriptionStatus: true, subscriptionEndsAt: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plan = await getUserPlan(session.userId);

  return NextResponse.json({
    plan,                                              // effective plan ("free" | "premium")
    subscriptionStatus: user.subscriptionStatus,       // raw stripe status
    subscriptionEndsAt: user.subscriptionEndsAt,
    hasEverSubscribed: !!user.stripeSubscriptionId,    // used to determine trial eligibility
    hasStripeCustomer: !!user.stripeCustomerId,
  });
}
