import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  let userId: number | undefined;
  if (username) {
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) return NextResponse.json([]);
    userId = user.id;
  } else {
    const session = await getAdminSession();
    if (session) userId = session.userId;
  }

  const where = userId !== undefined ? { userId } : {};
  const categories = await prisma.category.findMany({
    where,
    include: { _count: { select: { posts: { where: { post: { published: true } } } } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, color } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const { userId } = session;
  const slug = slugify(name);
  const category = await prisma.category.create({
    data: { userId, name, slug, description: description || "", color: color || "#2d7d9a" },
  });
  return NextResponse.json(category, { status: 201 });
}
