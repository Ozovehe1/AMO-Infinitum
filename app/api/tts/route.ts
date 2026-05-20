import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { put, list } from "@vercel/blob";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, 3900);
}

async function callDeepgram(text: string, model: string): Promise<Response> {
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
  if (!slug) return new NextResponse("Missing slug", { status: 400 });

  if (!process.env.DeepgramAPI) {
    return new NextResponse("TTS not configured", { status: 503 });
  }

  const blobKey = `tts/${slug}.mp3`;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // Serve from blob cache when available
  if (token) {
    try {
      const { blobs } = await list({ prefix: blobKey });
      if (blobs.length > 0) {
        const cached = await fetch(blobs[0].url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cached.ok) {
          return new NextResponse(cached.body, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "public, max-age=86400",
            },
          });
        }
      }
    } catch (e) {
      console.error("Blob cache check failed:", e);
    }
  }

  // Fetch post content
  const post = await prisma.post.findUnique({
    where: { slug, published: true },
    select: { title: true, content: true },
  });
  if (!post) return new NextResponse("Post not found", { status: 404 });

  const text = `${post.title}. ${stripHtml(post.content)}`;

  // Try preferred model, fall back to Aura 2
  let dgRes = await callDeepgram(text, "aura-asteria-en");
  if (!dgRes.ok) {
    console.error("Deepgram aura-asteria-en:", dgRes.status, await dgRes.text());
    dgRes = await callDeepgram(text, "aura-2-asteria-en");
    if (!dgRes.ok) {
      console.error("Deepgram aura-2-asteria-en:", dgRes.status, await dgRes.text());
      return new NextResponse("TTS generation failed", { status: 502 });
    }
  }

  const audioBuffer = await dgRes.arrayBuffer();

  // Cache in blob in the background — don't block the audio response
  if (token) {
    put(blobKey, new Blob([audioBuffer], { type: "audio/mpeg" }), {
      access: "private",
      contentType: "audio/mpeg",
    }).catch(e => console.error("Blob cache failed:", e));
  }

  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
