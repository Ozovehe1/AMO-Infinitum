import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/register?error=invalid", req.url));

  const user = await prisma.user.findUnique({ where: { verifyToken: token } });
  if (!user) return NextResponse.redirect(new URL("/register?error=invalid", req.url));

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null },
  });

  return NextResponse.redirect(new URL(`/${user.username}/inkwell/setup?verified=1`, req.url));
}
