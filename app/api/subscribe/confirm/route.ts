import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";

  if (!token) return NextResponse.redirect(`${base}/?sub=invalid`);

  const subscriber = await prisma.subscriber.findUnique({ where: { token } });
  if (!subscriber) return NextResponse.redirect(`${base}/?sub=invalid`);

  if (!subscriber.verified) {
    await prisma.subscriber.update({ where: { token }, data: { verified: true } });
  }

  return NextResponse.redirect(`${base}/?sub=confirmed`);
}
