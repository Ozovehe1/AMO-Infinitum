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
- Color mood: ${answers.colorMood}
- Blog name (user's choice): ${answers.blogName}
- Tagline (user's choice): ${answers.tagline}
- About the writer: ${answers.bio}
- Preferred imagery style: ${answers.imageStyle}
- Base color palette: primary=${preset.primary}, accent=${preset.accent}, bg=${preset.bg}

DESIGN PRINCIPLES — apply these strictly:
- Readability is the highest priority. Every color choice must ensure strong contrast between text and background (minimum 4.5:1 ratio). Never pair light text on light backgrounds or dark text on dark backgrounds.
- colorBg must be a light, warm, or neutral tone that makes body text easy to read for long sessions. Avoid pure white (#ffffff) — use off-whites, creams, or very light tints.
- colorPrimary is used for headings and UI elements on the light background — it must be dark enough to read clearly against colorBg.
- colorAccent is used for links, buttons, and highlights — it must stand out against both colorBg and colorPrimary without being garish.
- Spacing and breathing room matter. The tagline and heroQuote should be concise — short enough to be read in a single breath, with natural rhythm. No run-on sentences.
- The aboutText should have natural paragraph breaks — write it as 2 short paragraphs, not one dense block.
- All text fields (tagline, heroQuote, footerTagline) should feel considered and intentional — not padded or generic.

Return this exact JSON structure:
{
  "siteName": "clean version of the blog name",
  "tagline": "refined version of their tagline — keep their voice, max 12 words",
  "description": "2 sentences for SEO that capture the blog's purpose and audience",
  "heroQuote": "1 powerful original sentence that captures the blog's spirit — under 20 words, no clichés",
  "colorPrimary": "hex color — dark, readable on colorBg",
  "colorAccent": "hex color — vivid but harmonious, readable on both light and dark surfaces",
  "colorBg": "hex color — light, warm or neutral, easy on the eyes for long reading",
  "footerTagline": "short poetic closing phrase — under 8 words, matches niche and tone",
  "aboutText": "2 short paragraphs in first person, warm and specific to this writer — separated by \\n\\n",
  "imageQuery": "a highly specific Unsplash search query (4-8 words) that combines the niche '${answers.niche}', the imagery style '${answers.imageStyle}', and the color mood '${answers.colorMood}' — must produce photos that feel deeply resonant with this specific blog, not generic stock images"
}

The colors must work together as a cohesive, readable system. Test your choices mentally: can someone read a 1500-word essay on this blog without eye strain?`;

    try {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
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
