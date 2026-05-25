import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { emailVerified: true, onboarded: true },
  });

  return NextResponse.json({
    userId: session.userId,
    username: session.username,
    role: session.role,
    emailVerified: user?.emailVerified ?? false,
    onboarded: user?.onboarded ?? false,
  });
}
