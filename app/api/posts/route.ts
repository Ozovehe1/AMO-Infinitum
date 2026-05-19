import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { slugify, estimateReadingTime } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const category = searchParams.get("category");
  const admin = searchParams.get("admin") === "true";
  const search = searchParams.get("search") || "";

  const session = admin ? await getAdminSession() : null;
  const isAdmin = !!session;

  const where: Record<string, unknown> = {};
  if (!isAdmin) where.published = true;
  if (category) where.categories = { some: { category: { slug: category } } };
  if (search) where.title = { contains: search };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        categories: { include: { category: true } },
      },
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
  const { title, content, excerpt, coverImage, published, featured, categoryIds } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content required" }, { status: 400 });
  }

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let count = 0;
  while (await prisma.post.findUnique({ where: { slug } })) {
    count++;
    slug = `${baseSlug}-${count}`;
  }

  const readingTime = estimateReadingTime(content);

  const post = await prisma.post.create({
    data: {
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

  return NextResponse.json(post, { status: 201 });
}
