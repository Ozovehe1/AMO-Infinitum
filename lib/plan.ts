import { prisma } from "@/lib/db";

export type Plan = "free" | "premium";

/**
 * Returns the user's current effective plan.
 * Only "active" and "non-renewing" Paystack states count as premium.
 * "non-renewing" = still paid up, just not going to renew — still Premium until period ends.
 */
export async function getUserPlan(userId: number): Promise<Plan> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, subscriptionStatus: true },
    });
    if (!user) return "free";
    const paidStates = ["active", "non-renewing", "trialing"];
    if (user.plan === "premium" && user.subscriptionStatus && paidStates.includes(user.subscriptionStatus)) {
      return "premium";
    }
    return "free";
  } catch {
    return "free";
  }
}

/**
 * Throws { status: 403, code: "PREMIUM_REQUIRED" } if the user is not on Premium.
 */
export async function requirePremium(userId: number): Promise<void> {
  const plan = await getUserPlan(userId);
  if (plan !== "premium") {
    throw { status: 403, code: "PREMIUM_REQUIRED" };
  }
}
