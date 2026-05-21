import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { put } from "@vercel/blob";
import { stripHtml } from "@/lib/utils";

export const maxDuration = 120;

// Split at sentence boundaries, keeping each chunk under maxLen chars
function chunkText(text: string, maxLen = 1800): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > maxLen) {
    // Prefer a sentence-end boundary
    let cut = remaining.lastIndexOf(". ", maxLen);
    if (cut < maxLen * 0.4) cut = remaining.lastIndexOf(" ", maxLen);
    if (cut < 0) cut = maxLen;

    chunks.push(remaining.slice(0, cut + 1).trim());
    remaining = remaining.slice(cut + 1).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, apiKey } = await req.json();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  // If a new key was submitted, save it for future use
  if (apiKey?.trim()) {
    await prisma.siteSettings.upsert({
      where:  { key: "deepgram_api_key" },
      update: { value: apiKey.trim() },
      create: { key: "deepgram_api_key", value: apiKey.trim() },
    });
  }

  // Load key from DB
  const keyRow = await prisma.siteSettings.findUnique({ where: { key: "deepgram_api_key" } });
  const dgKey  = keyRow?.value;
  if (!dgKey) return NextResponse.json({ error: "No Deepgram API key saved. Provide one in the form." }, { status: 400 });

  // Load post
  const post = await prisma.post.findUnique({
    where:  { slug },
    select: { title: true, content: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const fullText = `${post.title}. ${stripHtml(post.content)}`;
  const chunks   = chunkText(fullText);

  // Call Deepgram for each chunk sequentially, collect MP3 buffers
  const buffers: ArrayBuffer[] = [];

  for (const chunk of chunks) {
    const dgRes = await fetch("https://api.deepgram.com/v1/speak?model=aura-2-thalia-en", {
      method: "POST",
      headers: {
        Authorization: `Token ${dgKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: chunk }),
    });

    if (!dgRes.ok) {
      const errText = await dgRes.text();
      console.error(`Deepgram error ${dgRes.status}:`, errText);
      return NextResponse.json(
        { error: `Deepgram error ${dgRes.status}: ${errText}` },
        { status: 502 }
      );
    }

    buffers.push(await dgRes.arrayBuffer());
  }

  // Concatenate all MP3 frames into one buffer
  const totalBytes = buffers.reduce((n, b) => n + b.byteLength, 0);
  const combined   = new Uint8Array(totalBytes);
  let offset       = 0;
  for (const buf of buffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  // Upload as PUBLIC blob — plays directly from CDN without auth
  const { url } = await put(`tts/${slug}.mp3`, new Blob([combined], { type: "audio/mpeg" }), {
    access: "public",
    contentType: "audio/mpeg",
    addRandomSuffix: false,
  });

  // Persist the CDN URL so the blog page can read it
  await prisma.siteSettings.upsert({
    where:  { key: `audio_${slug}` },
    update: { value: url },
    create: { key: `audio_${slug}`, value: url },
  });

  return NextResponse.json({ audioUrl: url });
}
