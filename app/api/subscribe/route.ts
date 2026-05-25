import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/email";

const COOLDOWN_MS = 60 * 1000;

export async function POST(req: NextRequest) {
  const { email, name, username } = await req.json().catch(() => ({}));

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!username) {
    return NextResponse.json({ error: "Blog username required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Blog not found" }, { status: 404 });

  const { id: userId } = user;
  const normalised = email.trim().toLowerCase();

  const existing = await prisma.subscriber.findUnique({
    where: { userId_email: { userId, email: normalised } },
  });

  if (existing?.verified && !existing.unsubscribedAt) {
    return NextResponse.json({ message: "already_subscribed" });
  }

  if (existing?.lastSentAt) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    if (elapsed < COOLDOWN_MS) {
      const secondsLeft = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json({ message: "cooldown", secondsLeft });
    }
  }

  const token = crypto.randomUUID();
  const now = new Date();

  if (existing) {
    await prisma.subscriber.update({
      where: { userId_email: { userId, email: normalised } },
      data: { token, name: name?.trim() || null, lastSentAt: now, unsubscribedAt: null, verified: false },
    });
  } else {
    await prisma.subscriber.create({
      data: { userId, email: normalised, name: name?.trim() || null, token, lastSentAt: now },
    });
  }

  try {
    await sendConfirmationEmail(normalised, token);
  } catch (err) {
    console.error("[subscribe] email send failed:", err);
    return NextResponse.json({ error: "Failed to send confirmation email. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ message: "confirmation_sent" });
}
