import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const BOT_PATTERNS = /bot|crawler|spider|crawling|facebookexternalhit|WhatsApp|Slackbot|Twitterbot|LinkedInBot|curl|wget|python|java|ruby|go-http/i;

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const ua = req.headers.get("user-agent") || "";
  if (BOT_PATTERNS.test(ua)) return new NextResponse(null, { status: 204 });

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return new NextResponse(null, { status: 400 });

  await prisma.post.updateMany({
    where: { id: postId, published: true },
    data: { views: { increment: 1 } },
  });

  return new NextResponse(null, { status: 204 });
}
