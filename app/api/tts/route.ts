import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { put, list } from "@vercel/blob";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3900); // Deepgram TTS limit ~4000 chars
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const blobKey = `tts/${slug}.mp3`;

  // Check cache in Vercel Blob
  const { blobs } = await list({ prefix: blobKey });
  if (blobs.length > 0) {
    return NextResponse.json({ url: blobs[0].url });
  }

  // Fetch post content
  const post = await prisma.post.findUnique({
    where: { slug, published: true },
    select: { title: true, content: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const text = `${post.title}. ${stripHtml(post.content)}`;

  if (!process.env.DeepgramAPI) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
  }

  // Call Deepgram TTS
  const dgRes = await fetch("https://api.deepgram.com/v1/speak?model=aura-2-asteria-en", {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DeepgramAPI}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!dgRes.ok) {
    const errText = await dgRes.text();
    console.error("Deepgram TTS error:", dgRes.status, errText);
    // Fallback to aura-asteria-en if aura-2 not available
    const fallback = await fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-en", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DeepgramAPI}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    if (!fallback.ok) {
      return NextResponse.json({ error: "TTS generation failed" }, { status: 502 });
    }
    const audioBlob = await fallback.blob();
    const blob = await put(blobKey, audioBlob, {
      access: "public",
      contentType: "audio/mpeg",
    });
    return NextResponse.json({ url: blob.url });
  }

  const audioBlob = await dgRes.blob();
  const blob = await put(blobKey, audioBlob, {
    access: "public",
    contentType: "audio/mpeg",
  });

  return NextResponse.json({ url: blob.url });
}
