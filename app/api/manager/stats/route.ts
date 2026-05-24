import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getManagerSession } from "@/lib/auth";

export async function GET() {
  const ok = await getManagerSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [users, totalPosts, totalSubscribers, recentPosts] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        onboarded: true,
        createdAt: true,
        _count: { select: { posts: { where: { published: true } }, subscribers: { where: { verified: true, unsubscribedAt: null } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.post.count({ where: { published: true } }),
    prisma.subscriber.count({ where: { verified: true, unsubscribedAt: null } }),
    prisma.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 20,
      select: {
        id: true, title: true, slug: true, publishedAt: true, views: true,
        user: { select: { username: true } },
      },
    }),
  ]);

  return NextResponse.json({
    totalUsers: users.length,
    totalPosts,
    totalSubscribers,
    users: users.map(u => ({
      ...u,
      posts: u._count.posts,
      subscribers: u._count.subscribers,
    })),
    recentPosts,
  });
}
