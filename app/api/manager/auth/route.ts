import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signManagerToken, setManagerCookie, clearManagerCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { action, password } = await req.json();

  if (action === "login") {
    if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });

    const mgr = await prisma.managerAuth.findFirst();
    if (!mgr || mgr.passwordHash === "SEED_REQUIRED") {
      return NextResponse.json({ error: "Manager not configured yet" }, { status: 503 });
    }
    const valid = await verifyPassword(password, mgr.passwordHash);
    if (!valid) return NextResponse.json({ error: "Invalid password" }, { status: 401 });

    const token = signManagerToken();
    const res = NextResponse.json({ success: true });
    res.cookies.set(setManagerCookie(token));
    return res;
  }

  if (action === "logout") {
    const res = NextResponse.json({ success: true });
    res.cookies.set(clearManagerCookie());
    return res;
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
