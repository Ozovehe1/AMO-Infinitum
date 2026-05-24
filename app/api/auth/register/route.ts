import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";

const RESERVED = new Set([
  "platform", "register", "login", "api", "blog", "about", "admin",
  "infinitum-ctrl", "inkwell", "category", "public", "static",
]);

export async function POST(req: NextRequest) {
  const { email, username, password } = await req.json();

  if (!email || !username || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!/^[a-z0-9-]{3,30}$/.test(username)) {
    return NextResponse.json({ error: "Username must be 3–30 lowercase letters, numbers or hyphens" }, { status: 400 });
  }
  if (RESERVED.has(username)) {
    return NextResponse.json({ error: "That username is reserved" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username } }),
  ]);
  if (existingEmail) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  if (existingUsername) return NextResponse.json({ error: "Username taken" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, username, passwordHash, role: "user", onboarded: false },
  });

  const token = signToken({ userId: user.id, username: user.username, role: user.role });
  const res = NextResponse.json({ success: true, username: user.username }, { status: 201 });
  res.cookies.set(setAuthCookie(token));
  return res;
}
