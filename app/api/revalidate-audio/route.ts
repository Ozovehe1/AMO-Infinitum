import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const { slug, username } = await req.json();
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (username) revalidatePath(`/${username}/blog/${slug}`);
  return NextResponse.json({ revalidated: true });
}
