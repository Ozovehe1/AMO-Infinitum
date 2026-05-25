import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendConfirmationEmail, type BlogBrand } from "@/lib/email";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";
const COOLDOWN_MS = 60 * 1000;

async function getBlogBrand(userId: number, username: string): Promise<BlogBrand> {
  const rows = await prisma.siteSettings.findMany({
    where: { userId, key: { in: ["site_name", "site_tagline", "color_accent"] } },
    select: { key: true, value: true },
  });
  const s = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    siteName: s.site_name || username,
    tagline: s.site_tagline || "",
    colorAccent: s.color_accent || "#c8a97e",
    username,
    blogUrl: `${SITE}/${username}`,
  };
}

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

  const brand = await getBlogBrand(userId, username);

  try {
    await sendConfirmationEmail(normalised, token, brand);
  } catch (err) {
    console.error("[subscribe] email send failed:", err);
    return NextResponse.json({ error: "Failed to send confirmation email. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ message: "confirmation_sent" });
}
