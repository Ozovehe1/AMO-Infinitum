import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// AI chat history stored in SiteSettings: key = ai_sessions_{postId} / ai_current_{postId}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const postId = req.nextUrl.searchParams.get("postId") ?? "new";
  const uid = session.userId;

  const [sessionsRow, currentRow] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { userId_key: { userId: uid, key: `ai_sessions_${postId}` } } }),
    prisma.siteSettings.findUnique({ where: { userId_key: { userId: uid, key: `ai_current_${postId}` } } }),
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
  const uid = session.userId;

  if (sessions !== undefined) {
    const key = `ai_sessions_${pid}`;
    if (!sessions || sessions.length === 0) {
      await prisma.siteSettings.deleteMany({ where: { userId: uid, key } }).catch(() => {});
    } else {
      await prisma.siteSettings.upsert({
        where:  { userId_key: { userId: uid, key } },
        update: { value: JSON.stringify(sessions) },
        create: { userId: uid, key, value: JSON.stringify(sessions) },
      });
    }
  }

  if (current !== undefined) {
    const key = `ai_current_${pid}`;
    if (!current || current.length === 0) {
      await prisma.siteSettings.deleteMany({ where: { userId: uid, key } }).catch(() => {});
    } else {
      await prisma.siteSettings.upsert({
        where:  { userId_key: { userId: uid, key } },
        update: { value: JSON.stringify(current) },
        create: { userId: uid, key, value: JSON.stringify(current) },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
