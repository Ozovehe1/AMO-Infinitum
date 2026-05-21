import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");
  if (!src) return new NextResponse("Missing src", { status: 400 });

  // Only proxy Vercel Blob URLs — use hostname check to prevent SSRF
  try {
    const hostname = new URL(src).hostname;
    if (!hostname.endsWith(".blob.vercel-storage.com")) {
      return new NextResponse("Invalid src", { status: 400 });
    }
  } catch {
    return new NextResponse("Invalid src", { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new NextResponse("Not configured", { status: 503 });

  try {
    const res = await fetch(src, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return new NextResponse("Not found", { status: 404 });

    return new NextResponse(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
