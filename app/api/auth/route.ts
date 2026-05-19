import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, signToken, setAuthCookie, clearAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { action, password } = await req.json();

  if (action === "login") {
    const admin = await prisma.admin.findFirst();

    if (!admin) {
      // First-time setup: create admin from env password
      const envPassword = process.env.ADMIN_PASSWORD || "admin123";
      const hash = await hashPassword(envPassword);
      await prisma.admin.create({ data: { passwordHash: hash } });

      if (password !== envPassword) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    } else {
      const valid = await verifyPassword(password, admin.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    const token = signToken({ role: "admin" });
    const res = NextResponse.json({ success: true });
    const cookie = setAuthCookie(token);
    res.cookies.set(cookie);
    return res;
  }

  if (action === "logout") {
    const res = NextResponse.json({ success: true });
    const cookie = clearAuthCookie();
    res.cookies.set(cookie);
    return res;
  }

  if (action === "change-password") {
    const { currentPassword, newPassword } = await req.json();
    const admin = await prisma.admin.findFirst();
    if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const valid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!valid) return NextResponse.json({ error: "Wrong password" }, { status: 401 });

    const hash = await hashPassword(newPassword);
    await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: hash } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
