import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { randomUUID } from "crypto";

const RESERVED = new Set([
  "platform", "register", "login", "api", "blog", "about", "admin",
  "infinitum-ctrl", "inkwell", "category", "public", "static",
]);

export async function POST(req: NextRequest) {
  const { email, username, password } = await req.json();

  if (!email || !username || !password)
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (!/^[a-z0-9-]{3,30}$/.test(username))
    return NextResponse.json({ error: "Username must be 3–30 lowercase letters, numbers or hyphens" }, { status: 400 });
  if (RESERVED.has(username))
    return NextResponse.json({ error: "That username is reserved" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username } }),
  ]);
  if (existingEmail) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  if (existingUsername) return NextResponse.json({ error: "Username taken" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const verifyToken = randomUUID();

  const user = await prisma.user.create({
    data: { email, username, passwordHash, role: "user", onboarded: false, emailVerified: false, verifyToken },
  });

  sendVerificationEmail(email, username, verifyToken).catch(err =>
    console.error("[register] email send failed:", err)
  );

  return NextResponse.json({ success: true, username: user.username }, { status: 201 });
}
