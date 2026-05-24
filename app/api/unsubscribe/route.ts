import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";

async function unsubscribe(token: string | null) {
  if (!token) return null;
  const subscriber = await prisma.subscriber.findUnique({
    where: { token },
    include: { user: { select: { username: true } } },
  });
  if (!subscriber || subscriber.unsubscribedAt) return subscriber;
  await prisma.subscriber.update({
    where: { token },
    data: { unsubscribedAt: new Date() },
  });
  return subscriber;
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  const sub = await unsubscribe(token);
  if (!sub) return NextResponse.redirect(`${base}/?sub=invalid`);
  return NextResponse.redirect(`${base}/${sub.user.username}?sub=unsubscribed`);
}

export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  await unsubscribe(token);
  return new NextResponse(null, { status: 200 });
}
