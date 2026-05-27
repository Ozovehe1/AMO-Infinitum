import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCustomerPortalUrl, lsEnabled } from "@/lib/lemonsqueezy";

export async function POST() {
  if (!lsEnabled) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });

  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { lsSubscriptionId: true },
  });

  if (!user?.lsSubscriptionId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 400 });
  }

  const url = await getCustomerPortalUrl(user.lsSubscriptionId);
  return NextResponse.json({ url });
}
