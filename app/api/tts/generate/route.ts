import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { put } from "@vercel/blob";
import { stripHtml } from "@/lib/utils";
import { chunkText } from "@/lib/tts-generate";

export const maxDuration = 60;

const DG_URL = "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en";

export async function POST(req: NextRequest) {
  // ── auth ──────────────────────────────────────────────────────────────
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── parse body ────────────────────────────────────────────────────────
  let slug = "";
  try {
    const body = await req.json();
    slug = body.slug ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  // ── check Vercel Blob is configured ───────────────────────────────────
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage not configured — add BLOB_READ_WRITE_TOKEN in Vercel settings." },
      { status: 503 }
    );
  }

  // ── load Deepgram key from env ────────────────────────────────────────
  const dgKey = process.env.DEEPGRAM_API_KEY;
  if (!dgKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY is not configured." },
      { status: 503 }
    );
  }

  // ── load post ─────────────────────────────────────────────────────────
  const post = await prisma.post.findUnique({
    where:  { slug },
    select: { title: true, content: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const chunks = chunkText(`${post.title}. ${stripHtml(post.content)}`);

  // ── call Deepgram for ALL chunks in parallel ─────────────────────────
  // Total time = slowest single call (~3-5 s) instead of n × call-time
  let buffers: ArrayBuffer[];
  try {
    buffers = await Promise.all(
      chunks.map(async (chunk, i) => {
        const res = await fetch(DG_URL, {
          method:  "POST",
          headers: { Authorization: `Token ${dgKey}`, "Content-Type": "application/json" },
          body:    JSON.stringify({ text: chunk }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => res.statusText);
          throw new Error(`Deepgram ${res.status} on chunk ${i + 1}/${chunks.length}: ${detail}`);
        }
        return res.arrayBuffer();
      })
    );
  } catch (dgErr) {
    return NextResponse.json(
      { error: String(dgErr instanceof Error ? dgErr.message : dgErr) },
      { status: 502 }
    );
  }

  // ── concatenate MP3 frames ────────────────────────────────────────────
  const totalBytes = buffers.reduce((n, b) => n + b.byteLength, 0);
  const combined   = new Uint8Array(totalBytes);
  let offset = 0;
  for (const buf of buffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  // ── upload to Vercel Blob (public — no auth proxy needed) ─────────────
  let audioUrl: string;
  try {
    const blob = new Blob([combined], { type: "audio/mpeg" });
    // Timestamp in the path so regeneration always produces a fresh URL
    const { url } = await put(`tts/${slug}-${Date.now()}.mp3`, blob, {
      access:          "private",
      contentType:     "audio/mpeg",
      addRandomSuffix: false,
    });
    audioUrl = url;
  } catch (blobErr) {
    return NextResponse.json(
      { error: `Blob upload failed: ${blobErr instanceof Error ? blobErr.message : String(blobErr)}` },
      { status: 500 }
    );
  }

  // ── persist CDN URL for blog page ─────────────────────────────────────
  await prisma.siteSettings.upsert({
    where:  { key: `audio_${slug}` },
    update: { value: audioUrl },
    create: { key: `audio_${slug}`, value: audioUrl },
  });

  return NextResponse.json({ audioUrl });
}
