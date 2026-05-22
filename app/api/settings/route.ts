import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const DEFAULTS: Record<string, string> = {
  about_hero_subtitle: "A space that holds everything — every question, every silence, every thought that refuses to be filed neatly away.",
  about_body: `<p><em>Amo</em> means love. <em>Infinitum</em> means without end. This blog is exactly that — a love that keeps going, for ideas, for language, for the texture of living.</p><p>I write here because some thoughts are too alive to stay inside. They grow when shared, even quietly, even with strangers on the internet at 2am.</p><p>You won't find a niche here. You'll find whatever I was thinking about hard enough that it demanded to be written down.</p><blockquote>"Not all those who wander are lost." — and not all who write have arrived anywhere in particular.</blockquote><p>Welcome. Stay as long as you like.</p>`,
};

export async function GET() {
  try {
    const rows = await prisma.siteSettings.findMany();
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) settings[row.key] = row.value;
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

const ALLOWED_KEYS = new Set([
  "about_hero_subtitle",
  "about_body",
]);

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates: Record<string, string> = await req.json();
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([key]) => ALLOWED_KEYS.has(key))
  );

  await Promise.all(
    Object.entries(filtered).map(([key, value]) =>
      prisma.siteSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  revalidatePath("/about");
  return NextResponse.json({ ok: true });
}
