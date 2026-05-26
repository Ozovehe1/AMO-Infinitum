import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getManagerSession } from "@/lib/auth";

export async function DELETE() {
  const ok = await getManagerSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find all unverified (ghost) accounts — never clicked confirmation link
  const ghosts = await prisma.user.findMany({
    where: { emailVerified: false, role: { not: "owner" } },
    select: { id: true, username: true, email: true },
  });

  if (ghosts.length === 0) {
    return NextResponse.json({ deleted: 0, accounts: [] });
  }

  const ghostIds = ghosts.map(g => g.id);

  // Cascade delete in dependency order
  await prisma.siteSettings.deleteMany({ where: { userId: { in: ghostIds } } });
  await prisma.subscriber.deleteMany({ where: { userId: { in: ghostIds } } });
  const postIds = (
    await prisma.post.findMany({ where: { userId: { in: ghostIds } }, select: { id: true } })
  ).map(p => p.id);
  if (postIds.length) await prisma.postCategory.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.post.deleteMany({ where: { userId: { in: ghostIds } } });
  await prisma.category.deleteMany({ where: { userId: { in: ghostIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ghostIds } } });

  return NextResponse.json({
    deleted: ghosts.length,
    accounts: ghosts.map(g => ({ username: g.username, email: g.email })),
  });
}
