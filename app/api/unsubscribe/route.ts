import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";

async function unsubscribe(token: string | null) {
  if (!token) return false;
  const result = await prisma.subscriber.updateMany({
    where: { token, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });
  return result.count > 0;
}

// Clicked link in email
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  const ok = await unsubscribe(token);
  return NextResponse.redirect(`${base}/?sub=${ok ? "unsubscribed" : "invalid"}`);
}

// Gmail / Apple Mail one-click unsubscribe (List-Unsubscribe-Post header)
export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  await unsubscribe(token);
  return new NextResponse(null, { status: 200 });
}
