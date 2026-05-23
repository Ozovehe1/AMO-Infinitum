import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sendConfirmationEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const brevo = !!(process.env.BREVO_SMTP_LOGIN && process.env.BREVO_SMTP_PASSWORD);
  const gmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

  const to = req.nextUrl.searchParams.get("to") || process.env.GMAIL_USER || "amoinfinitum@gmail.com";

  try {
    await sendConfirmationEmail(to, "test-token-123");
    return NextResponse.json({ ok: true, provider: brevo ? "brevo" : gmail ? "gmail" : "none", sentTo: to });
  } catch (err) {
    return NextResponse.json({ ok: false, provider: brevo ? "brevo" : gmail ? "gmail" : "none", sentTo: to, error: String(err) });
  }
}
