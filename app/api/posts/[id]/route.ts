import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { slugify, estimateReadingTime } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { categories: { include: { category: true } } },
  });

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!post.published) {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(post);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json();
  const { title, content, excerpt, coverImage, published, featured, categoryIds, showUpdatedNotice } = body;

  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let slug = existing.slug;
  if (title !== existing.title) {
    const baseSlug = slugify(title);
    slug = baseSlug;
    let count = 0;
    while (await prisma.post.findFirst({ where: { slug, NOT: { id: postId } } })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }
  }

  const readingTime = estimateReadingTime(content);
  const wasPublished = !existing.published && published;

  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      title,
      slug,
      content,
      excerpt: excerpt || "",
      coverImage: coverImage || null,
      published,
      featured,
      readingTime,
      showUpdatedNotice: showUpdatedNotice ?? existing.showUpdatedNotice,
      publishedAt: wasPublished ? new Date() : existing.publishedAt,
      categories: {
        deleteMany: {},
        create: categoryIds?.length
          ? categoryIds.map((cid: number) => ({ categoryId: cid }))
          : [],
      },
    },
    include: { categories: { include: { category: true } } },
  });

  revalidatePath("/");
  revalidatePath(`/blog/${post.slug}`);

  return NextResponse.json(post);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { slug: true } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.post.delete({ where: { id: postId } });

  revalidatePath("/");
  revalidatePath(`/blog/${post.slug}`);

  return NextResponse.json({ success: true });
}
