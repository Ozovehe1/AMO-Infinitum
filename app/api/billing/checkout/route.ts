import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCheckout, lsEnabled } from "@/lib/lemonsqueezy";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://amo-infinitum.vercel.app";

export async function POST() {
  if (!lsEnabled) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });

  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username, userId } = session;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Lemon Squeezy handles trial/non-trial automatically:
  //   - First-time: the variant's 30-day free trial applies (configured in LS dashboard)
  //   - Returning:  LS detects prior subscription and skips the trial
  const url = await createCheckout({
    email:       user.email,
    userId:      String(userId),
    username,
    redirectUrl: `${APP_URL}/${username}/inkwell/billing?success=1`,
  });

  return NextResponse.json({ url });
}
