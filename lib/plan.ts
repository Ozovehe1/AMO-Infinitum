import { prisma } from "@/lib/db";

export type Plan = "free" | "premium";

/**
 * Returns the user's current effective plan.
 *
 * Special cases:
 * - role === "owner" → always Premium (owner account is exempt from billing)
 *
 * Lemon Squeezy subscription states that count as Premium:
 * - "active"       → paid and in good standing
 * - "trialing"     → within the 30-day free trial
 * - "non-renewing" → cancelled but still paid up until subscriptionEndsAt
 */
export async function getUserPlan(userId: number): Promise<Plan> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, subscriptionStatus: true, role: true },
    });
    if (!user) return "free";

    // Owner account is always Premium — no billing required
    if (user.role === "owner") return "premium";

    const paidStates = ["active", "trialing", "non-renewing"];
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
