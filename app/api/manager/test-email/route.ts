import { NextResponse } from "next/server";
import { getManagerSession } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function GET() {
  const ok = await getManagerSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const login =
    process.env.BREVO_SMTP_LOGIN ||
    process.env.GMAIL_USER ||
    "amoinfinitum@gmail.com (FALLBACK — set BREVO_SMTP_LOGIN)";

  const hasPassword = !!process.env.BREVO_SMTP_PASSWORD;
  const hasGmail = !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
  const driver = process.env.BREVO_SMTP_PASSWORD ? "brevo" : hasGmail ? "gmail" : "none";

  if (driver === "none") {
    return NextResponse.json({
      driver, login: "—",
      error: "No email credentials configured. Set BREVO_SMTP_PASSWORD (and BREVO_SMTP_LOGIN) in Vercel env vars.",
    });
  }

  let transport: ReturnType<typeof nodemailer.createTransport>;
  if (driver === "brevo") {
    transport = nodemailer.createTransport({
      host: "smtp-relay.brevo.com", port: 587, secure: false,
      auth: {
        user: process.env.BREVO_SMTP_LOGIN || process.env.GMAIL_USER || "amoinfinitum@gmail.com",
        pass: process.env.BREVO_SMTP_PASSWORD,
      },
    });
  } else {
    transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }

  try {
    await transport.verify();
    return NextResponse.json({ driver, login, hasPassword, status: "✅ SMTP connection OK — credentials are valid" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ driver, login, hasPassword, status: "❌ SMTP connection FAILED", error: message });
  }
}
