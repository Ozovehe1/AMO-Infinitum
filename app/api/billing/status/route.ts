import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserPlan } from "@/lib/plan";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      plan: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      paystackCustomerCode: true,
      paystackSubscriptionCode: true,
      paystackEmailToken: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plan = await getUserPlan(session.userId);

  return NextResponse.json({
    plan,                                                    // "free" | "premium"
    subscriptionStatus: user.subscriptionStatus,             // Paystack status string
    subscriptionEndsAt: user.subscriptionEndsAt,
    hasEverSubscribed: !!user.paystackSubscriptionCode,      // trial eligibility
    hasPaystackCustomer: !!user.paystackCustomerCode,
    hasEmailToken: !!user.paystackEmailToken,
  });
}
