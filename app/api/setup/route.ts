import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { searchUnsplash } from "@/lib/unsplash";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ClaudeAPI });

interface SetupAnswers {
  niche: string;
  audience: string;
  tone: string;
  colorMood: string;
  blogName: string;
  tagline: string;
  bio: string;
  imageStyle: string;
}

const COLOR_PRESETS: Record<string, { primary: string; accent: string; bg: string }> = {
  "warm+earthy":  { primary: "#3d2b1f", accent: "#c8943a", bg: "#f5ede0" },
  "cool+minimal": { primary: "#1a2f4a", accent: "#4a9e8e", bg: "#f0f4f7" },
  "dark+modern":  { primary: "#0d0d0d", accent: "#7c6fff", bg: "#111827" },
  "bold+vibrant": { primary: "#1a0533", accent: "#e040fb", bg: "#fff9fe" },
};

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json().catch(() => ({}));

  // --- Generate config from answers via Claude ---
  if (action === "generate") {
    const { answers }: { answers: SetupAnswers } = await req.json().catch(() => ({ answers: {} as SetupAnswers }));
    const preset = COLOR_PRESETS[answers.colorMood] || COLOR_PRESETS["warm+earthy"];

    const prompt = `Given this blog setup information, return a JSON object only (no markdown, no extra text):
Niche: ${answers.niche}
Audience: ${answers.audience}
Tone: ${answers.tone}
Blog name chosen: ${answers.blogName}
Tagline chosen: ${answers.tagline}
Bio: ${answers.bio}
Image style: ${answers.imageStyle}
Color mood: ${answers.colorMood} (base colors: primary=${preset.primary}, accent=${preset.accent}, bg=${preset.bg})

Return JSON with these keys:
- siteName (use the blog name provided, clean it up)
- tagline (use the tagline provided, refine if needed)
- description (2 sentences describing the blog for SEO)
- heroQuote (1 vivid sentence that captures the blog's spirit)
- colorPrimary (hex, based on color mood + niche)
- colorAccent (hex, complementary accent)
- colorBg (hex, light background)
- footerTagline (short, poetic phrase)
- aboutText (2-3 sentences from the bio, written in first person)
- imageQuery (Unsplash search query matching niche + image style)`;

    try {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });
      const text = (msg.content[0] as { text: string }).text.trim();
      const config = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));
      return NextResponse.json({ config });
    } catch (e) {
      console.error("[setup/generate]", e);
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }
  }

  // --- Fetch Unsplash images ---
  if (action === "images") {
    const { query } = await req.json().catch(() => ({ query: "minimal blog" }));
    const photos = await searchUnsplash(query, 6);
    return NextResponse.json({ photos });
  }

  // --- Save final config ---
  if (action === "save") {
    const { config, coverImage } = await req.json().catch(() => ({}));
    if (!config) return NextResponse.json({ error: "No config" }, { status: 400 });

    const { userId } = session;
    const settingsToSave: { key: string; value: string }[] = [
      { key: "site_name", value: config.siteName || "" },
      { key: "site_tagline", value: config.tagline || "" },
      { key: "site_description", value: config.description || "" },
      { key: "site_hero_quote", value: config.heroQuote || "" },
      { key: "color_primary", value: config.colorPrimary || "#0d1f3c" },
      { key: "color_accent", value: config.colorAccent || "#c8a97e" },
      { key: "color_bg", value: config.colorBg || "#f5f0e8" },
      { key: "footer_tagline", value: config.footerTagline || "" },
      { key: "about_hero_subtitle", value: config.aboutText || "" },
      ...(coverImage ? [{ key: "cover_image", value: coverImage }] : []),
    ];

    await Promise.all(
      settingsToSave.map(s =>
        prisma.siteSettings.upsert({
          where: { userId_key: { userId, key: s.key } },
          update: { value: s.value },
          create: { userId, key: s.key, value: s.value },
        })
      )
    );

    await prisma.user.update({ where: { id: userId }, data: { onboarded: true } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
