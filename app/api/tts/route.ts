import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return new NextResponse("Missing slug", { status: 400 });

  const row = await prisma.siteSettings.findUnique({ where: { key: `audio_${slug}` } });
  if (!row?.value) return new NextResponse("Audio not generated yet", { status: 404 });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new NextResponse("Not configured", { status: 503 });

  try {
    const res = await fetch(row.value, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return new NextResponse("Audio not available", { status: 404 });
    return new NextResponse(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Error fetching audio", { status: 500 });
  }
}
