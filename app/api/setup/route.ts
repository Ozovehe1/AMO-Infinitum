import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { searchUnsplash } from "@/lib/unsplash";
import { enforceContrast } from "@/lib/utils";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ClaudeAPI });

interface SetupAnswers {
  niche: string;
  audience: string;
  tone: string;
  colorMood: string;
  blogName: string;
  bio: string;
  readingFeel: string;
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

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === "generate") {
    const { answers } = body as { answers: SetupAnswers };
    const preset = COLOR_PRESETS[answers.colorMood] || COLOR_PRESETS["warm+earthy"];

    const prompt = `You are setting up a personal blog. Based on ALL the information below, return a single JSON object with no markdown, no extra text.

BLOG SETUP DATA:
- Niche/Topic: ${answers.niche}
- Target audience: ${answers.audience}
- Writing tone: ${answers.tone}
- Desired reading experience: ${answers.readingFeel || "not specified"}
- Color mood: ${answers.colorMood}
- Blog name (user's choice): ${answers.blogName}
- About the writer: ${answers.bio}
- Preferred imagery style: ${answers.imageStyle}
- Base color palette: primary=${preset.primary}, accent=${preset.accent}, bg=${preset.bg}

TYPOGRAPHY — choose one heading font and one body font based on the writer's niche, tone, bio, and desired reading experience. These choices must feel intentional and personal, not random.

Available heading fonts (pick one):
- "Playfair Display" — classic, literary, elegant serif; suits timeless essayists, culture writers, thoughtful personal blogs
- "Cormorant Garamond" — ethereal, poetic, old-world serif; suits poets, philosophy writers, intimate memoir-style blogs
- "Lora" — warm, readable, grounded serif; suits personal storytellers, lifestyle writers, anyone who wants approachable elegance
- "Libre Baskerville" — authoritative, journalistic serif; suits investigative writing, commentary, long-form analysis
- "DM Serif Display" — contemporary editorial serif; suits modern essayists, design-conscious writers, cultural commentary
- "Fraunces" — distinctive, warm display serif; suits narrative non-fiction, personal essays, journals with strong voice
- "Space Grotesk" — modern, geometric sans; suits tech writers, developers, startup founders, data-driven blogs
- "Plus Jakarta Sans" — clean, versatile sans; suits productivity writers, business content, clean minimalist blogs

Available body fonts (pick one that pairs with your heading choice):
- "Source Serif 4" — refined, digital-first serif; pairs with Playfair Display, DM Serif Display
- "Lora" — warm serif for body; pairs with Cormorant Garamond, Fraunces
- "Merriweather" — strong, high-readability serif; pairs with Libre Baskerville
- "Literata" — designed for long reading; pairs with Lora, Fraunces
- "Inter" — neutral, highly readable sans; pairs with Space Grotesk, Plus Jakarta Sans
- "DM Sans" — modern, clean sans; pairs with Space Grotesk, Plus Jakarta Sans

Return this exact JSON structure:
{
  "siteName": "clean version of the blog name",
  "tagline": "a sharp original tagline invented from the niche, tone, bio, and blog name — under 10 words, in the writer's voice",
  "description": "2 sentences for SEO that capture the blog's purpose and audience",
  "heroQuote": "1 powerful, original sentence that captures the blog's deepest spirit — not generic",
  "colorPrimary": "hex color based on color mood",
  "colorAccent": "hex complementary accent",
  "colorBg": "hex light background",
  "footerTagline": "short poetic closing phrase that matches the niche and tone",
  "aboutText": "2-3 sentences rewritten from the bio in first person, warm and authentic",
  "fontHeading": "exact font name from the heading list — must reflect who this writer is",
  "fontBody": "exact font name from the body list — must pair well with fontHeading",
  "imageQuery": "a precise Unsplash search query (4-7 words) for a HERO BACKGROUND photograph — must be landscape-oriented, atmospheric, and work with text overlaid on it. Derive it from: niche='${answers.niche}', imagery style='${answers.imageStyle}', color mood='${answers.colorMood}', tone='${answers.tone}', bio='${answers.bio}'. The photo must feel like the visual soul of this specific blog — the one image that, if a stranger saw it, they would immediately understand what this writer is about. Avoid: portraits, close-ups, generic stock, studio shots. Prefer: wide scenes, natural light, depth, mood."
}

The imageQuery is the hero background image the user will see first. It must be landscape-oriented and atmospheric enough to have blog title text overlaid on it. Make it specific to THIS writer's world — derived from their actual niche, tone, and bio — not a generic search. Combine subject + environment + mood/light.
The font choices are critical — they must feel like they belong to THIS specific writer, chosen by someone who truly read their answers, not defaults.`;

    try {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      });
      const text = (msg.content[0] as { text: string }).text.trim();
      const config = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));
      const fixed = enforceContrast({
        colorPrimary: config.colorPrimary,
        colorAccent:  config.colorAccent,
        colorBg:      config.colorBg,
      });
      Object.assign(config, fixed);
      return NextResponse.json({ config });
    } catch (e) {
      console.error("[setup/generate]", e);
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }
  }

  if (action === "images") {
    const { query } = body as { query: string };
    const photos = await searchUnsplash(query || "atmospheric photography editorial", 6);
    return NextResponse.json({ photos });
  }

  if (action === "save") {
    const { config, coverImage } = body;
    if (!config) return NextResponse.json({ error: "No config" }, { status: 400 });

    const { userId } = session;
    const settingsToSave: { key: string; value: string }[] = [
      { key: "site_name", value: config.siteName || "" },
      { key: "site_tagline", value: config.tagline || "" },
      { key: "site_description", value: config.description || "" },
      { key: "site_hero_quote", value: config.heroQuote || "" },
      { key: "color_primary", value: config.colorPrimary || "" },
      { key: "color_accent", value: config.colorAccent || "" },
      { key: "color_bg", value: config.colorBg || "" },
      { key: "footer_tagline", value: config.footerTagline || "" },
      { key: "about_hero_subtitle", value: config.aboutText || "" },
      ...(config.fontHeading ? [{ key: "font_heading", value: config.fontHeading }] : []),
      ...(config.fontBody ? [{ key: "font_body", value: config.fontBody }] : []),
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
