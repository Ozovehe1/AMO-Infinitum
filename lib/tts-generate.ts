import { prisma } from "./db";
import { put } from "@vercel/blob";
import { stripHtml } from "./utils";


const DG_URL    = "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en";
const CHUNK_MAX = 1800;
const TEXT_CAP  = 7200;

export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let rem = text.slice(0, TEXT_CAP).trim();

  while (rem.length > CHUNK_MAX) {
    let cut = rem.lastIndexOf(". ", CHUNK_MAX);
    if (cut < CHUNK_MAX * 0.4) cut = rem.lastIndexOf(" ", CHUNK_MAX);
    if (cut < 1) cut = CHUNK_MAX;
    chunks.push(rem.slice(0, cut + 1).trim());
    rem = rem.slice(cut + 1).trim();
  }

  if (rem) chunks.push(rem);
  return chunks;
}

export async function generatePostAudio(
  slug: string,
  title: string,
  content: string,
): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;

  const dgKey = process.env.DEEPGRAM_API_KEY;
  if (!dgKey) return;

  const chunks = chunkText(`${title}. ${stripHtml(content)}`);

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
  } catch (err) {
    console.error("[TTS] generation failed:", err);
    return;
  }

  const totalBytes = buffers.reduce((n, b) => n + b.byteLength, 0);
  const combined   = new Uint8Array(totalBytes);
  let offset = 0;
  for (const buf of buffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  try {
    const { url } = await put(`tts/${slug}-${Date.now()}.mp3`, new Blob([combined], { type: "audio/mpeg" }), {
      access:          "private",
      contentType:     "audio/mpeg",
      addRandomSuffix: false,
    });

    await prisma.siteSettings.upsert({
      where:  { key: `audio_${slug}` },
      update: { value: url },
      create: { key: `audio_${slug}`, value: url },
    });
  } catch (err) {
    console.error("[TTS] blob upload failed:", err);
  }
}
