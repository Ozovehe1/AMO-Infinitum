import { prisma } from "@/lib/db";

export interface Theme {
  siteName: string;
  tagline: string;
  description: string;
  heroQuote: string;
  colorPrimary: string;
  colorAccent: string;
  colorBg: string;
  twitterHandle: string;
  footerTagline: string;
  footerCopy: string;
  aboutHeroSubtitle: string;
  aboutBody: string;
  coverImage: string;
  fontHeading: string;
  fontBody: string;
}

const DEFAULTS: Theme = {
  siteName: "My Blog",
  tagline: "",
  description: "",
  heroQuote: "",
  colorPrimary: "#0d1f3c",
  colorAccent: "#c8a97e",
  colorBg: "#f5f0e8",
  twitterHandle: "",
  footerTagline: "",
  footerCopy: "",
  aboutHeroSubtitle: "A space that holds everything.",
  aboutBody: "<p>Welcome to my blog.</p>",
  coverImage: "",
  fontHeading: "Playfair Display",
  fontBody: "Source Serif 4",
};

export async function getTheme(userId: number): Promise<Theme> {
  try {
    const rows = await prisma.siteSettings.findMany({ where: { userId } });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return {
      siteName: map.site_name ?? DEFAULTS.siteName,
      tagline: map.site_tagline ?? DEFAULTS.tagline,
      description: map.site_description ?? DEFAULTS.description,
      heroQuote: map.site_hero_quote ?? DEFAULTS.heroQuote,
      colorPrimary: map.color_primary ?? DEFAULTS.colorPrimary,
      colorAccent: map.color_accent ?? DEFAULTS.colorAccent,
      colorBg: map.color_bg ?? DEFAULTS.colorBg,
      twitterHandle: map.twitter_handle ?? DEFAULTS.twitterHandle,
      footerTagline: map.footer_tagline ?? DEFAULTS.footerTagline,
      footerCopy: map.footer_copy ?? DEFAULTS.footerCopy,
      aboutHeroSubtitle: map.about_hero_subtitle ?? DEFAULTS.aboutHeroSubtitle,
      aboutBody: map.about_body ?? DEFAULTS.aboutBody,
      coverImage: map.cover_image ?? DEFAULTS.coverImage,
      fontHeading: map.font_heading ?? DEFAULTS.fontHeading,
      fontBody: map.font_body ?? DEFAULTS.fontBody,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function getThemeByUsername(username: string): Promise<Theme | null> {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return null;
  return getTheme(user.id);
}
