import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { put } from "@vercel/blob";
import { stripHtml } from "@/lib/utils";

export const maxDuration = 60;

const DG_URL    = "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en";
const CHUNK_MAX = 1800;  // Deepgram TTS limit is 2000 chars — stay safe
const TEXT_CAP  = 9000;  // ~5 min audio; keeps total time well under 60 s

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let rem = text.slice(0, TEXT_CAP).trim();

  while (rem.length > CHUNK_MAX) {
    // Try sentence boundary first, then word boundary, then hard cut
    let cut = rem.lastIndexOf(". ", CHUNK_MAX);
    if (cut < CHUNK_MAX * 0.4) cut = rem.lastIndexOf(" ", CHUNK_MAX);
    if (cut < 1) cut = CHUNK_MAX;

    chunks.push(rem.slice(0, cut + 1).trim());
    rem = rem.slice(cut + 1).trim();
  }

  if (rem) chunks.push(rem);
  return chunks;
}

export async function POST(req: NextRequest) {
  // ── auth ──────────────────────────────────────────────────────────────
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── parse body ────────────────────────────────────────────────────────
  let slug = "", apiKey = "";
  try {
    const body = await req.json();
    slug   = body.slug   ?? "";
    apiKey = body.apiKey ?? "";
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

  // ── save / load Deepgram key ──────────────────────────────────────────
  if (apiKey.trim()) {
    await prisma.siteSettings.upsert({
      where:  { key: "deepgram_api_key" },
      update: { value: apiKey.trim() },
      create: { key: "deepgram_api_key", value: apiKey.trim() },
    });
  }

  const keyRow = await prisma.siteSettings.findUnique({ where: { key: "deepgram_api_key" } });
  if (!keyRow?.value) {
    return NextResponse.json(
      { error: "No Deepgram key saved yet — paste your key and hit Generate." },
      { status: 400 }
    );
  }
  const dgKey = keyRow.value;

  // ── load post ─────────────────────────────────────────────────────────
  const post = await prisma.post.findUnique({
    where:  { slug },
    select: { title: true, content: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const chunks = chunkText(`${post.title}. ${stripHtml(post.content)}`);

  // ── call Deepgram for each chunk ──────────────────────────────────────
  const buffers: ArrayBuffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    let dgRes: Response;
    try {
      dgRes = await fetch(DG_URL, {
        method:  "POST",
        headers: { Authorization: `Token ${dgKey}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ text: chunks[i] }),
      });
    } catch (fetchErr) {
      return NextResponse.json(
        { error: `Network error reaching Deepgram (chunk ${i + 1}): ${String(fetchErr)}` },
        { status: 502 }
      );
    }

    if (!dgRes.ok) {
      const detail = await dgRes.text().catch(() => dgRes.statusText);
      return NextResponse.json(
        { error: `Deepgram ${dgRes.status} on chunk ${i + 1}/${chunks.length}: ${detail}` },
        { status: 502 }
      );
    }

    buffers.push(await dgRes.arrayBuffer());
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
      access:          "public",
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
