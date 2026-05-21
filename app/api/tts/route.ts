import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Redirect to the pre-generated CDN URL for this post's audio.
// Audio is generated on-demand from the admin panel via /api/tts/generate.
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return new NextResponse("Missing slug", { status: 400 });

  const row = await prisma.siteSettings.findUnique({ where: { key: `audio_${slug}` } });
  if (!row?.value) return new NextResponse("Audio not generated yet", { status: 404 });

  return NextResponse.redirect(row.value, { status: 302 });
}
