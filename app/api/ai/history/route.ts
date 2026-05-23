import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Archived sessions → SiteSettings key: ai_sessions_{postId}
// Active chat backup → SiteSettings key: ai_current_{postId}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const postId = req.nextUrl.searchParams.get("postId") ?? "new";
  const [sessionsRow, currentRow] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { key: `ai_sessions_${postId}` } }),
    prisma.siteSettings.findUnique({ where: { key: `ai_current_${postId}` } }),
  ]);

  const sessions = sessionsRow?.value ? JSON.parse(sessionsRow.value) : [];
  const current  = currentRow?.value  ? JSON.parse(currentRow.value)  : [];
  return NextResponse.json({ sessions, current });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId, sessions, current } = await req.json();
  const pid = postId ?? "new";

  // Handle archived sessions
  if (sessions !== undefined) {
    const key = `ai_sessions_${pid}`;
    if (!sessions || sessions.length === 0) {
      await prisma.siteSettings.deleteMany({ where: { key } }).catch(() => {});
    } else {
      await prisma.siteSettings.upsert({
        where:  { key },
        update: { value: JSON.stringify(sessions) },
        create: { key, value: JSON.stringify(sessions) },
      });
    }
  }

  // Handle active chat backup
  if (current !== undefined) {
    const key = `ai_current_${pid}`;
    if (!current || current.length === 0) {
      await prisma.siteSettings.deleteMany({ where: { key } }).catch(() => {});
    } else {
      await prisma.siteSettings.upsert({
        where:  { key },
        update: { value: JSON.stringify(current) },
        create: { key, value: JSON.stringify(current) },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
