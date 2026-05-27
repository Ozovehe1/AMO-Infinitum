import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getUserPlan } from "@/lib/plan";
import { revalidatePath } from "next/cache";

const PREMIUM_KEYS = ["color_primary", "color_accent", "color_bg", "font_heading", "font_body"];

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
  about_hero_subtitle: "",
  about_body: "",
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

  // Gate premium-only settings for free users
  const premiumKeysInUpdate = Object.keys(updates).filter(k => PREMIUM_KEYS.includes(k));
  if (premiumKeysInUpdate.length > 0) {
    const plan = await getUserPlan(userId);
    if (plan !== "premium") {
      return NextResponse.json({ error: "PREMIUM_REQUIRED", keys: premiumKeysInUpdate }, { status: 403 });
    }
  }

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
