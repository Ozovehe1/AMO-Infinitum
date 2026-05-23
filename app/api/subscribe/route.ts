import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/email";

const COOLDOWN_MS = 60 * 1000; // 1 minute

export async function POST(req: NextRequest) {
  const { email, name } = await req.json().catch(() => ({}));

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const normalised = email.trim().toLowerCase();
  const existing = await prisma.subscriber.findUnique({ where: { email: normalised } });

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
      where: { email: normalised },
      data: { token, name: name?.trim() || null, lastSentAt: now, unsubscribedAt: null, verified: false },
    });
  } else {
    await prisma.subscriber.create({
      data: { email: normalised, name: name?.trim() || null, token, lastSentAt: now },
    });
  }

  await sendConfirmationEmail(normalised, token);

  return NextResponse.json({ message: "confirmation_sent" });
}
