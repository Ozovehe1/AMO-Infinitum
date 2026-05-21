import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Sessions are stored as JSON in SiteSettings: key = ai_sessions_{postId}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const postId = req.nextUrl.searchParams.get("postId") ?? "new";
  const row    = await prisma.siteSettings.findUnique({ where: { key: `ai_sessions_${postId}` } });
  const sessions = row?.value ? JSON.parse(row.value) : [];
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId, sessions } = await req.json();
  const key = `ai_sessions_${postId ?? "new"}`;

  if (!sessions || sessions.length === 0) {
    await prisma.siteSettings.deleteMany({ where: { key } }).catch(() => {});
  } else {
    await prisma.siteSettings.upsert({
      where:  { key },
      update: { value: JSON.stringify(sessions) },
      create: { key, value: JSON.stringify(sessions) },
    });
  }
  return NextResponse.json({ ok: true });
}
