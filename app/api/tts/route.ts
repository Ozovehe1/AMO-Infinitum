import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { put, list } from "@vercel/blob";
import { stripHtml } from "@/lib/utils";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return new NextResponse("Missing slug", { status: 400 });

  const dgKey =
    process.env.DeepgramAPI ||
    process.env.DEEPGRAM_API_KEY ||
    process.env.DEEPGRAM_API ||
    process.env.DEEPGRAM_KEY;

  if (!dgKey) {
    console.error("TTS: no Deepgram key found — set DeepgramAPI in environment variables");
    return new NextResponse("TTS not configured", { status: 503 });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const blobKey   = `tts/${slug}.mp3`;

  // Return cached audio if available
  if (blobToken) {
    try {
      const { blobs } = await list({ prefix: blobKey });
      if (blobs.length > 0) {
        const cached = await fetch(blobs[0].url, {
          headers: { Authorization: `Bearer ${blobToken}` },
        });
        if (cached.ok) {
          const buf = await cached.arrayBuffer();
          return new NextResponse(buf, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "public, max-age=86400",
              "X-Audio-Source": "cache",
            },
          });
        }
      }
    } catch (e) {
      console.error("TTS: blob cache check failed:", e);
    }
  }

  // Load post text
  const post = await prisma.post.findUnique({
    where: { slug, published: true },
    select: { title: true, content: true },
  });
  if (!post) return new NextResponse("Post not found", { status: 404 });

  const text = `${post.title}. ${stripHtml(post.content).slice(0, 3900)}`;

  // Generate audio via Deepgram
  const dgRes = await fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-en", {
    method: "POST",
    headers: {
      Authorization: `Token ${dgKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!dgRes.ok) {
    const errText = await dgRes.text();
    console.error(`TTS: Deepgram error ${dgRes.status}:`, errText);
    return new NextResponse("TTS generation failed", { status: 502 });
  }

  // Buffer fully before returning — more reliable than streaming on Vercel serverless
  const audioBuf = await dgRes.arrayBuffer();

  // Write to blob cache after the response is sent (after() is guaranteed to run)
  if (blobToken) {
    after(async () => {
      try {
        await put(blobKey, new Blob([audioBuf], { type: "audio/mpeg" }), {
          access: "private",
          contentType: "audio/mpeg",
        });
      } catch (e) {
        console.error("TTS: blob cache write failed:", e);
      }
    });
  }

  return new NextResponse(audioBuf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
      "X-Audio-Source": "deepgram",
    },
  });
}
