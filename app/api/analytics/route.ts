import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { requirePremium } from "@/lib/plan";
import {
  subMonths, subWeeks, subDays,
  startOfMonth, startOfWeek, startOfDay,
  format,
} from "date-fns";

type Range = "1m" | "3m" | "6m" | "12m";
type Granularity = "day" | "week" | "month";

// GA4 standard: ≤1M → daily, 3M → weekly, 6M/12M → monthly
function getGranularity(range: Range): Granularity {
  if (range === "1m") return "day";
  if (range === "3m") return "week";
  return "month";
}

// Calendar-aligned start of the period
function computeSince(granularity: Granularity, monthCount: number): Date {
  const now = new Date();
  if (granularity === "day")  return startOfDay(subDays(now, 29));          // 30 days incl. today
  if (granularity === "week") return startOfWeek(subWeeks(now, 12), { weekStartsOn: 1 }); // 13 weeks, Mon start
  return startOfMonth(subMonths(now, monthCount - 1));                       // calendar months
}

// Equally-sized window before the current period (for trend comparison)
function computePrevSince(granularity: Granularity, since: Date, monthCount: number): Date {
  if (granularity === "day")  return startOfDay(subDays(since, 30));
  if (granularity === "week") return startOfWeek(subWeeks(since, 13), { weekStartsOn: 1 });
  return startOfMonth(subMonths(since, monthCount));
}

// Map a record's date to the correct bucket key
function toKey(date: Date, granularity: Granularity): string {
  if (granularity === "day")  return format(date, "d MMM");
  if (granularity === "week") return format(startOfWeek(date, { weekStartsOn: 1 }), "d MMM");
  return format(date, "MMM ''yy");
}

// Build ordered empty buckets for the period
function buildBuckets(granularity: Granularity, monthCount: number): Record<string, number> {
  const buckets: Record<string, number> = {};
  const now = new Date();
  if (granularity === "day") {
    for (let i = 29; i >= 0; i--)
      buckets[format(subDays(now, i), "d MMM")] = 0;
  } else if (granularity === "week") {
    for (let i = 12; i >= 0; i--)
      buckets[format(startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }), "d MMM")] = 0;
  } else {
    for (let i = monthCount - 1; i >= 0; i--)
      buckets[format(startOfMonth(subMonths(now, i)), "MMM ''yy")] = 0;
  }
  return buckets;
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { await requirePremium(session.userId); } catch {
    return NextResponse.json({ error: "PREMIUM_REQUIRED" }, { status: 403 });
  }

  const { userId } = session;
  const range = (req.nextUrl.searchParams.get("range") || "3m") as Range;
  const monthCount = range === "1m" ? 1 : range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const granularity = getGranularity(range);
  const since = computeSince(granularity, monthCount);
  const prevSince = computePrevSince(granularity, since, monthCount);

  const [
    totalSubscribers,
    newSubscribers,
    prevNewSubscribers,
    pendingSubscribers,
    subscribersAtStart,
    allNewSubscribers,
    allUnsubscribers,
    totalViews,
    topPosts,
    allPosts,
    categories,
  ] = await Promise.all([
    prisma.subscriber.count({ where: { userId, verified: true, unsubscribedAt: null } }),
    prisma.subscriber.count({ where: { userId, verified: true, createdAt: { gte: since } } }),
    prisma.subscriber.count({ where: { userId, verified: true, createdAt: { gte: prevSince, lt: since } } }),
    prisma.subscriber.count({ where: { userId, verified: false, unsubscribedAt: null } }),
    prisma.subscriber.count({
      where: {
        userId,
        verified: true,
        createdAt: { lt: since },
        OR: [{ unsubscribedAt: null }, { unsubscribedAt: { gte: since } }],
      },
    }),
    prisma.subscriber.findMany({
      where: { userId, verified: true, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.subscriber.findMany({
      where: { userId, unsubscribedAt: { not: null, gte: since } },
      select: { unsubscribedAt: true },
    }),
    prisma.post.aggregate({ where: { userId, published: true }, _sum: { views: true } }),
    prisma.post.findMany({
      where: { userId, published: true },
      orderBy: { views: "desc" },
      select: { id: true, title: true, slug: true, views: true, publishedAt: true, readingTime: true },
    }),
    prisma.post.findMany({
      where: { userId, published: true, publishedAt: { gte: since } },
      select: { publishedAt: true },
    }),
    prisma.category.findMany({
      where: { userId },
      include: { _count: { select: { posts: { where: { post: { published: true } } } } } },
      orderBy: { name: "asc" },
    }),
  ]);

  // New sign-ups per period bucket
  const newByPeriod = buildBuckets(granularity, monthCount);
  for (const sub of allNewSubscribers) {
    const key = toKey(sub.createdAt, granularity);
    if (newByPeriod[key] !== undefined) newByPeriod[key]++;
  }

  // Unsubscribes per period bucket
  const unsubsByPeriod = buildBuckets(granularity, monthCount);
  for (const sub of allUnsubscribers) {
    if (!sub.unsubscribedAt) continue;
    const key = toKey(sub.unsubscribedAt, granularity);
    if (unsubsByPeriod[key] !== undefined) unsubsByPeriod[key]++;
  }

  // Net new per period (signups − cancellations); can be negative
  const netByPeriod: Record<string, number> = {};
  for (const key of Object.keys(newByPeriod)) {
    netByPeriod[key] = newByPeriod[key] - unsubsByPeriod[key];
  }

  // Cumulative running total — goes UP on net gain, DOWN on net loss
  let running = subscribersAtStart;
  const subscribersByPeriod: Record<string, number> = {};
  for (const key of Object.keys(newByPeriod)) {
    running += netByPeriod[key];
    subscribersByPeriod[key] = Math.max(0, running); // floor at 0 (can't have negative subscribers)
  }

  // Posts published per period
  const postsByPeriod = buildBuckets(granularity, monthCount);
  for (const post of allPosts) {
    if (!post.publishedAt) continue;
    const key = toKey(post.publishedAt, granularity);
    if (postsByPeriod[key] !== undefined) postsByPeriod[key]++;
  }

  return NextResponse.json({
    totalSubscribers,
    newSubscribers,
    prevNewSubscribers,
    pendingSubscribers,
    totalViews: totalViews._sum.views ?? 0,
    totalPublished: await prisma.post.count({ where: { userId, published: true } }),
    topPosts,
    granularity,
    subscribersByMonth: subscribersByPeriod,
    newSubscribersByMonth: netByPeriod,   // net new per period (can be negative)
    postsByMonth: postsByPeriod,
    categories: categories.map(c => ({ name: c.name, color: c.color, count: c._count.posts })),
  });
}
