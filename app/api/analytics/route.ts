import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { subMonths, startOfMonth, format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const range = (req.nextUrl.searchParams.get("range") || "3m") as "1m" | "3m" | "6m" | "12m";
  const monthCount = range === "1m" ? 1 : range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const since = subMonths(new Date(), monthCount);

  const [
    totalSubscribers,
    newSubscribers,
    pendingSubscribers,
    allSubscribers,
    totalViews,
    topPosts,
    allPosts,
    categories,
  ] = await Promise.all([
    prisma.subscriber.count({ where: { verified: true } }),
    prisma.subscriber.count({ where: { verified: true, createdAt: { gte: since } } }),
    prisma.subscriber.count({ where: { verified: false } }),
    prisma.subscriber.findMany({ where: { verified: true, createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.post.aggregate({ where: { published: true }, _sum: { views: true } }),
    prisma.post.findMany({
      where: { published: true },
      orderBy: { views: "desc" },
      take: 5,
      select: { id: true, title: true, slug: true, views: true, publishedAt: true, readingTime: true },
    }),
    prisma.post.findMany({
      where: { published: true, publishedAt: { gte: since } },
      select: { publishedAt: true },
    }),
    prisma.category.findMany({
      include: { _count: { select: { posts: { where: { post: { published: true } } } } } },
      orderBy: { name: "asc" },
    }),
  ]);

  // Group subscriber signups by month
  const subscribersByMonth = buildMonthBuckets(monthCount);
  for (const sub of allSubscribers) {
    const key = format(sub.createdAt, "MMM yy");
    if (subscribersByMonth[key] !== undefined) subscribersByMonth[key]++;
  }

  // Group posts published by month
  const postsByMonth = buildMonthBuckets(monthCount);
  for (const post of allPosts) {
    if (!post.publishedAt) continue;
    const key = format(post.publishedAt, "MMM yy");
    if (postsByMonth[key] !== undefined) postsByMonth[key]++;
  }

  return NextResponse.json({
    totalSubscribers,
    newSubscribers,
    pendingSubscribers,
    totalViews: totalViews._sum.views ?? 0,
    totalPublished: await prisma.post.count({ where: { published: true } }),
    topPosts,
    subscribersByMonth,
    postsByMonth,
    categories: categories.map(c => ({ name: c.name, color: c.color, count: c._count.posts })),
  });
}

function buildMonthBuckets(count: number): Record<string, number> {
  const buckets: Record<string, number> = {};
  for (let i = count - 1; i >= 0; i--) {
    buckets[format(startOfMonth(subMonths(new Date(), i)), "MMM yy")] = 0;
  }
  return buckets;
}
