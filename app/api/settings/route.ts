import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const DEFAULTS: Record<string, string> = {
  site_name: "My Blog",
  site_tagline: "",
  site_description: "",
  site_hero_quote: "",
  color_primary: "#0d1f3c",
  color_accent: "#c8a97e",
  color_bg: "#f5f0e8",
  twitter_handle: "",
  footer_tagline: "",
  footer_copy: "",
  about_hero_subtitle: "A space that holds everything — every question, every silence, every thought that refuses to be filed neatly away.",
  about_body: `<p><em>Amo</em> means love. <em>Infinitum</em> means without end. This blog is exactly that — a love that keeps going, for ideas, for language, for the texture of living.</p>`,
  sub_confirm_message: "",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  let userId: number | undefined;
  if (username) {
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (user) userId = user.id;
  } else {
    const session = await getAdminSession();
    if (session) userId = session.userId;
  }

  try {
    const rows = userId !== undefined
      ? await prisma.siteSettings.findMany({ where: { userId } })
      : [];
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) settings[row.key] = row.value;
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, username } = session;
  const updates: Record<string, string> = await req.json();

  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      prisma.siteSettings.upsert({
        where: { userId_key: { userId, key } },
        update: { value },
        create: { userId, key, value },
      })
    )
  );

  revalidatePath(`/${username}/about`);
  revalidatePath(`/${username}`);
  return NextResponse.json({ ok: true });
}
