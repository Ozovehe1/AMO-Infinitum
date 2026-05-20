import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Image upload not configured. Add BLOB_READ_WRITE_TOKEN in Vercel settings." },
      { status: 503 }
    );
  }

  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File;
  } catch {
    return NextResponse.json({ error: "Could not read upload data." }, { status: 400 });
  }

  if (!file || !file.size) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  // Sanitize filename — strip special chars so Vercel Blob accepts it
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
  const safeName = `covers/${Date.now()}.${ext}`;

  try {
    const blob = await put(safeName, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Blob upload error:", msg);
    return NextResponse.json({ error: `Upload error: ${msg}` }, { status: 500 });
  }
}
