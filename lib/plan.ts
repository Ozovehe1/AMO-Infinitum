import { prisma } from "@/lib/db";

export type Plan = "free" | "premium";

/**
 * Returns the user's current plan, accounting for active/trialing subscriptions.
 * Treats "past_due" and "canceled" as free.
 */
export async function getUserPlan(userId: number): Promise<Plan> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, subscriptionStatus: true },
    });
    if (!user) return "free";
    const activeStates = ["active", "trialing"];
    if (user.plan === "premium" && user.subscriptionStatus && activeStates.includes(user.subscriptionStatus)) {
      return "premium";
    }
    return "free";
  } catch {
    return "free";
  }
}

/**
 * Throws a structured error if the user is not on Premium.
 * API routes catch this and return 403 { error: "PREMIUM_REQUIRED" }.
 */
export async function requirePremium(userId: number): Promise<void> {
  const plan = await getUserPlan(userId);
  if (plan !== "premium") {
    throw { status: 403, code: "PREMIUM_REQUIRED" };
  }
}
