import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { put, list } from "@vercel/blob";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, 3900);
}

async function callDeeepgram(text: string, model: string): Promise<Response> {
  return fetch(`https://api.deepgram.com/v1/speak?model=${model}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DeepgramAPI}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  if (!process.env.DeepgramAPI) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
  }

  const blobKey = `tts/${slug}.mp3`;

  // Check Vercel Blob cache
  try {
    const { blobs } = await list({ prefix: blobKey });
    if (blobs.length > 0) {
      const proxyUrl = `/api/img?src=${encodeURIComponent(blobs[0].url)}`;
      return NextResponse.json({ url: proxyUrl });
    }
  } catch (e) {
    console.error("Blob list error:", e);
  }

  // Fetch post content
  const post = await prisma.post.findUnique({
    where: { slug, published: true },
    select: { title: true, content: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const text = `${post.title}. ${stripHtml(post.content)}`;

  // Try best model first, fall back to standard
  let dgRes = await callDeeepgram(text, "aura-asteria-en");
  if (!dgRes.ok) {
    const err = await dgRes.text();
    console.error("Deepgram aura-asteria-en error:", dgRes.status, err);
    dgRes = await callDeeepgram(text, "aura-2-asteria-en");
    if (!dgRes.ok) {
      const err2 = await dgRes.text();
      console.error("Deepgram aura-2 error:", dgRes.status, err2);
      return NextResponse.json({ error: "TTS generation failed" }, { status: 502 });
    }
  }

  const audioBlob = await dgRes.blob();

  try {
    const blob = await put(blobKey, audioBlob, {
      access: "private",
      contentType: "audio/mpeg",
    });
    const proxyUrl = `${SITE}/api/img?src=${encodeURIComponent(blob.url)}`;
    return NextResponse.json({ url: proxyUrl });
  } catch (e) {
    console.error("Blob put error:", e);
    return NextResponse.json({ error: "Failed to cache audio" }, { status: 500 });
  }
}
