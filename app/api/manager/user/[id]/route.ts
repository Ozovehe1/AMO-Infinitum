import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getManagerSession } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await getManagerSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, username: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role === "owner") return NextResponse.json({ error: "Cannot delete the owner account" }, { status: 403 });

  // Delete in dependency order (no cascade in schema)
  await prisma.siteSettings.deleteMany({ where: { userId } });
  await prisma.subscriber.deleteMany({ where: { userId } });
  const postIds = (await prisma.post.findMany({ where: { userId }, select: { id: true } })).map(p => p.id);
  if (postIds.length) await prisma.postCategory.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.post.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true, deleted: user.username });
}
