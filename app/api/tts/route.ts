import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const username = req.nextUrl.searchParams.get("username");
  if (!slug) return new NextResponse("Missing slug", { status: 400 });

  let row;
  if (username) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (user) {
      row = await prisma.siteSettings.findUnique({
        where: { userId_key: { userId: user.id, key: `audio_${slug}` } },
      });
    }
  } else {
    row = await prisma.siteSettings.findFirst({ where: { key: `audio_${slug}` } });
  }

  if (!row?.value) return new NextResponse("Audio not generated yet", { status: 404 });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new NextResponse("Not configured", { status: 503 });

  try {
    const rangeHeader = req.headers.get("range");
    const upstreamHeaders: HeadersInit = { Authorization: `Bearer ${token}` };
    if (rangeHeader) upstreamHeaders["Range"] = rangeHeader;

    const res = await fetch(row.value, { headers: upstreamHeaders });
    if (!res.ok && res.status !== 206) {
      return new NextResponse("Audio not available", { status: 404 });
    }

    const headers: Record<string, string> = {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    const contentLength = res.headers.get("Content-Length");
    const contentRange  = res.headers.get("Content-Range");
    if (contentLength) headers["Content-Length"] = contentLength;
    if (contentRange)  headers["Content-Range"]  = contentRange;

    return new NextResponse(res.body, { status: res.status, headers });
  } catch {
    return new NextResponse("Error fetching audio", { status: 500 });
  }
}
