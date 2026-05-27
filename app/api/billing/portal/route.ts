import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { subscriptionManageUrl, paystackEnabled } from "@/lib/paystack";

export async function POST() {
  if (!paystackEnabled) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });

  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { paystackEmailToken: true, paystackSubscriptionCode: true },
  });

  if (!user?.paystackEmailToken) {
    return NextResponse.json({ error: "No subscription found" }, { status: 400 });
  }

  const url = subscriptionManageUrl(user.paystackEmailToken);
  return NextResponse.json({ url });
}
