import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { slugify, estimateReadingTime } from "@/lib/utils";
import { tasks } from "@trigger.dev/sdk/v3";
import { sendNewPostNotifications } from "@/lib/email";

export const maxDuration = 30;

async function triggerAudio(userId: number, slug: string, title: string, content: string) {
  if (!process.env.TRIGGER_SECRET_KEY) return;
  try {
    await tasks.trigger("generate-post-audio", { userId, slug, title, content });
  } catch { /* Trigger.dev not configured — audio skipped */ }
}

async function notifySubscribers(userId: number, title: string, slug: string, excerpt: string, coverImage: string | null, content: string) {
  const hasBrevo = !!(process.env.BREVO_SMTP_LOGIN && process.env.BREVO_SMTP_PASSWORD);
  const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  if (!hasBrevo && !hasGmail) return;
  const [subscribers, user, settingsRows] = await Promise.all([
    prisma.subscriber.findMany({
      where: { userId, verified: true, unsubscribedAt: null },
      select: { email: true, token: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { username: true } }),
    prisma.siteSettings.findMany({
      where: { userId, key: { in: ["site_name", "site_tagline", "color_accent"] } },
      select: { key: true, value: true },
    }),
  ]);
  if (subscribers.length === 0 || !user) return;
  const s = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";
  const brand = {
    siteName: s.site_name || user.username,
    tagline: s.site_tagline || "",
    colorAccent: s.color_accent || "#c8a97e",
    username: user.username,
    blogUrl: `${SITE}/${user.username}`,
  };
  await sendNewPostNotifications(subscribers, { title, slug, excerpt, coverImage, content }, brand);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const category = searchParams.get("category");
  const admin = searchParams.get("admin") === "true";
  const search = searchParams.get("search") || "";
  const username = searchParams.get("username");

  const session = admin ? await getAdminSession() : null;
  const isAdmin = !!session;

  // Determine which user's posts to return
  let userId: number | undefined;
  if (isAdmin && session) {
    userId = session.userId;
  } else if (username) {
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) return NextResponse.json({ posts: [], total: 0, page, limit, pages: 0 });
    userId = user.id;
  }

  const where: Record<string, unknown> = {};
  if (userId !== undefined) where.userId = userId;
  if (!isAdmin) where.published = true;
  if (category) where.categories = { some: { category: { slug: category } } };
  if (search) where.title = { contains: search, mode: "insensitive" };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: { categories: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, content, excerpt, coverImage, published, featured, categoryIds, notifySubscribers: shouldNotify } = body;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (published && (!content || content === "<p></p>")) {
    return NextResponse.json({ error: "Content required to publish" }, { status: 400 });
  }

  const { userId } = session;
  const baseSlug = slugify(title) || "post";
  let slug = baseSlug;
  let count = 0;
  while (await prisma.post.findUnique({ where: { userId_slug: { userId, slug } } })) {
    count++;
    slug = `${baseSlug}-${count}`;
  }

  const readingTime = estimateReadingTime(content);

  const post = await prisma.post.create({
    data: {
      userId,
      title,
      slug,
      content,
      excerpt: excerpt || "",
      coverImage: coverImage || null,
      published: published || false,
      featured: featured || false,
      readingTime,
      publishedAt: published ? new Date() : null,
      categories: categoryIds?.length
        ? { create: categoryIds.map((id: number) => ({ categoryId: id })) }
        : undefined,
    },
    include: { categories: { include: { category: true } } },
  });

  if (post.published) {
    await triggerAudio(userId, post.slug, post.title, post.content);
    if (shouldNotify !== false) {
      after(() => notifySubscribers(userId, post.title, post.slug, post.excerpt || "", post.coverImage, post.content));
    }
  }

  return NextResponse.json(post, { status: 201 });
}
