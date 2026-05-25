import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signToken, setAuthCookie, clearAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { action, email, password, currentPassword, newPassword } = await req.json();

  if (action === "login") {
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (!user.emailVerified) {
      return NextResponse.json({ error: "Please verify your email before logging in. Check your inbox." }, { status: 403 });
    }
    const token = signToken({ userId: user.id, username: user.username, role: user.role });
    const res = NextResponse.json({ success: true, username: user.username, onboarded: user.onboarded });
    res.cookies.set(setAuthCookie(token));
    return res;
  }

  if (action === "logout") {
    const res = NextResponse.json({ success: true });
    res.cookies.set(clearAuthCookie());
    return res;
  }

  if (action === "change-password") {
    const { getAdminSession } = await import("@/lib/auth");
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Wrong password" }, { status: 401 });

    const { hashPassword } = await import("@/lib/auth");
    const hash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
