import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { put, list } from "@vercel/blob";
import { stripHtml } from "@/lib/utils";

async function callDeepgram(key: string, text: string): Promise<Response> {
  return fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-en", {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return new NextResponse("Missing slug", { status: 400 });

  const dgKey =
    process.env.DeepgramAPI ||
    process.env.DEEPGRAM_API_KEY ||
    process.env.DEEPGRAM_API ||
    process.env.DEEPGRAM_KEY;

  if (!dgKey) return new NextResponse("TTS not configured", { status: 503 });

  const blobKey = `tts/${slug}.mp3`;
  const token   = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    try {
      const { blobs } = await list({ prefix: blobKey });
      if (blobs.length > 0) {
        const cached = await fetch(blobs[0].url, { headers: { Authorization: `Bearer ${token}` } });
        if (cached.ok) {
          return new NextResponse(cached.body, {
            headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" },
          });
        }
      }
    } catch (e) { console.error("Blob cache check failed:", e); }
  }

  const post = await prisma.post.findUnique({
    where: { slug, published: true },
    select: { title: true, content: true },
  });
  if (!post) return new NextResponse("Post not found", { status: 404 });

  const text  = `${post.title}. ${stripHtml(post.content).slice(0, 3900)}`;
  const dgRes = await callDeepgram(dgKey, text);

  if (!dgRes.ok) {
    console.error("Deepgram TTS failed:", dgRes.status, await dgRes.text());
    return new NextResponse("TTS generation failed", { status: 502 });
  }

  // Stream response to client immediately; cache in background
  if (token) {
    dgRes.clone().arrayBuffer().then(buf =>
      put(blobKey, new Blob([buf], { type: "audio/mpeg" }), {
        access: "private", contentType: "audio/mpeg",
      })
    ).catch(e => console.error("Blob cache failed:", e));
  }

  return new NextResponse(dgRes.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" },
  });
}
