import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getManagerSession } from "@/lib/auth";
import {
  subMonths, subWeeks, subDays,
  startOfMonth, startOfWeek, startOfDay,
  format,
} from "date-fns";

type Range = "1m" | "3m" | "6m" | "12m";
type Granularity = "day" | "week" | "month";

function getGranularity(range: Range): Granularity {
  if (range === "1m") return "day";
  if (range === "3m") return "week";
  return "month";
}

function computeSince(g: Granularity, monthCount: number): Date {
  const now = new Date();
  if (g === "day") return startOfDay(subDays(now, 29));
  if (g === "week") return startOfWeek(subWeeks(now, 12), { weekStartsOn: 1 });
  return startOfMonth(subMonths(now, monthCount - 1));
}

function computePrevSince(g: Granularity, since: Date, monthCount: number): Date {
  if (g === "day") return startOfDay(subDays(since, 30));
  if (g === "week") return startOfWeek(subWeeks(since, 13), { weekStartsOn: 1 });
  return startOfMonth(subMonths(since, monthCount));
}

function toKey(date: Date, g: Granularity): string {
  if (g === "day") return format(date, "d MMM");
  if (g === "week") return format(startOfWeek(date, { weekStartsOn: 1 }), "d MMM");
  return format(date, "MMM ''yy");
}

function buildBuckets(g: Granularity, monthCount: number): Record<string, number> {
  const b: Record<string, number> = {};
  const now = new Date();
  if (g === "day") {
    for (let i = 29; i >= 0; i--) b[format(subDays(now, i), "d MMM")] = 0;
  } else if (g === "week") {
    for (let i = 12; i >= 0; i--) b[format(startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }), "d MMM")] = 0;
  } else {
    for (let i = monthCount - 1; i >= 0; i--) b[format(startOfMonth(subMonths(now, i)), "MMM ''yy")] = 0;
  }
  return b;
}

export async function GET(req: NextRequest) {
  const ok = await getManagerSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const range = (req.nextUrl.searchParams.get("range") || "3m") as Range;
  const monthCount = range === "1m" ? 1 : range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const g = getGranularity(range);
  const since = computeSince(g, monthCount);
  const prevSince = computePrevSince(g, since, monthCount);

  const [
    totalViewsAgg,
    totalSubscribers,
    totalPosts,
    totalUsers,
    // Current period
    newUsersPeriod,
    newPostsPeriod,
    newSubscribersPeriod,
    // Previous period (for trend %)
    prevNewUsers,
    prevNewPosts,
    prevNewSubscribers,
    // Chart data — new signups
    newUsersRows,
    // Chart data — new posts
    newPostsRows,
    // Chart data — subscriber running total
    subsAtStart,
    newSubsRows,
    unsubsRows,
    // Rankings
    blogRankings,
    topPostsRaw,
    // Health
    activeBlogs,
    recentlyActive,
  ] = await Promise.all([
    // All-time totals (verified users only)
    prisma.post.aggregate({ where: { published: true, user: { emailVerified: true, onboarded: true } }, _sum: { views: true } }),
    prisma.subscriber.count({ where: { verified: true, unsubscribedAt: null, user: { emailVerified: true, onboarded: true } } }),
    prisma.post.count({ where: { published: true, user: { emailVerified: true, onboarded: true } } }),
    prisma.user.count({ where: { emailVerified: true, onboarded: true } }),

    // Current period (verified users only)
    prisma.user.count({ where: { emailVerified: true, createdAt: { gte: since } } }),
    prisma.post.count({ where: { published: true, publishedAt: { gte: since }, user: { emailVerified: true, onboarded: true } } }),
    prisma.subscriber.count({ where: { verified: true, createdAt: { gte: since }, user: { emailVerified: true, onboarded: true } } }),

    // Previous period (verified users only)
    prisma.user.count({ where: { emailVerified: true, createdAt: { gte: prevSince, lt: since } } }),
    prisma.post.count({ where: { published: true, publishedAt: { gte: prevSince, lt: since }, user: { emailVerified: true, onboarded: true } } }),
    prisma.subscriber.count({ where: { verified: true, createdAt: { gte: prevSince, lt: since }, user: { emailVerified: true, onboarded: true } } }),

    // Signup timeline (verified only)
    prisma.user.findMany({ where: { emailVerified: true, createdAt: { gte: since } }, select: { createdAt: true } }),

    // Posts timeline (verified only)
    prisma.post.findMany({ where: { published: true, publishedAt: { gte: since }, user: { emailVerified: true, onboarded: true } }, select: { publishedAt: true } }),

    // Subscriber running total (verified blogs only)
    prisma.subscriber.count({
      where: {
        verified: true, createdAt: { lt: since },
        user: { emailVerified: true, onboarded: true },
        OR: [{ unsubscribedAt: null }, { unsubscribedAt: { gte: since } }],
      },
    }),
    prisma.subscriber.findMany({ where: { verified: true, createdAt: { gte: since }, user: { emailVerified: true, onboarded: true } }, select: { createdAt: true } }),
    prisma.subscriber.findMany({ where: { unsubscribedAt: { not: null, gte: since }, user: { emailVerified: true, onboarded: true } }, select: { unsubscribedAt: true } }),

    // Blog rankings: verified users only
    prisma.user.findMany({
      where: { emailVerified: true, onboarded: true },
      select: {
        id: true, username: true,
        _count: {
          select: {
            posts: { where: { published: true } },
            subscribers: { where: { verified: true, unsubscribedAt: null } },
          },
        },
        posts: {
          where: { published: true },
          select: { views: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),

    // Top posts (verified blogs only)
    prisma.post.findMany({
      where: { published: true, user: { emailVerified: true, onboarded: true } },
      orderBy: { views: "desc" },
      take: 15,
      select: {
        id: true, title: true, slug: true, views: true, publishedAt: true, readingTime: true,
        user: { select: { username: true } },
      },
    }),

    // Active blogs (verified + onboarded + at least 1 published post)
    prisma.user.count({ where: { emailVerified: true, onboarded: true, posts: { some: { published: true } } } }),

    // Recently active (verified + onboarded + published in last 30 days)
    prisma.user.count({ where: { emailVerified: true, onboarded: true, posts: { some: { published: true, publishedAt: { gte: subDays(new Date(), 30) } } } } }),
  ]);

  // Chart: new signups
  const usersByPeriod = buildBuckets(g, monthCount);
  for (const u of newUsersRows) {
    const key = toKey(u.createdAt, g);
    if (key in usersByPeriod) usersByPeriod[key]++;
  }

  // Chart: new posts
  const postsByPeriod = buildBuckets(g, monthCount);
  for (const p of newPostsRows) {
    if (!p.publishedAt) continue;
    const key = toKey(p.publishedAt, g);
    if (key in postsByPeriod) postsByPeriod[key]++;
  }

  // Chart: subscriber running total
  const netByPeriod = buildBuckets(g, monthCount);
  for (const s of newSubsRows) {
    const key = toKey(s.createdAt, g);
    if (key in netByPeriod) netByPeriod[key]++;
  }
  for (const s of unsubsRows) {
    if (!s.unsubscribedAt) continue;
    const key = toKey(s.unsubscribedAt, g);
    if (key in netByPeriod) netByPeriod[key]--;
  }
  let running = subsAtStart;
  const subscribersByPeriod: Record<string, number> = {};
  for (const key of Object.keys(netByPeriod)) {
    running = Math.max(0, running + netByPeriod[key]);
    subscribersByPeriod[key] = running;
  }

  // Blog rankings
  const blogs = blogRankings.map(u => ({
    username: u.username,
    posts: u._count.posts,
    subscribers: u._count.subscribers,
    views: u.posts.reduce((s, p) => s + (p.views ?? 0), 0),
  })).sort((a, b) => b.views - a.views);

  return NextResponse.json({
    // Totals
    totalViews: totalViewsAgg._sum.views ?? 0,
    totalSubscribers,
    totalPosts,
    totalUsers,
    activeBlogs,
    recentlyActive,
    // Period metrics
    newUsersPeriod,
    prevNewUsers,
    newPostsPeriod,
    prevNewPosts,
    newSubscribersPeriod,
    prevNewSubscribers,
    // Charts
    usersByPeriod,
    postsByPeriod,
    subscribersByPeriod,
    granularity: g,
    // Rankings
    topBlogs: blogs.slice(0, 10),
    topPosts: topPostsRaw,
  });
}
