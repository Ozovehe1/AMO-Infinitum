import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/register?error=invalid", req.url));

  const user = await prisma.user.findUnique({
    where: { verifyToken: token },
    select: { id: true, username: true, role: true, onboarded: true },
  });
  if (!user) return NextResponse.redirect(new URL("/register?error=invalid", req.url));

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null },
  });

  // Issue session after email confirmed — this is the real login
  const authToken = signToken({ userId: user.id, username: user.username, role: user.role });
  const dest = user.onboarded ? `/${user.username}/inkwell` : `/${user.username}/inkwell/setup`;
  const res = NextResponse.redirect(new URL(dest, req.url));
  res.cookies.set(setAuthCookie(authToken));
  return res;
}
