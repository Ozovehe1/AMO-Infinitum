import { NextResponse } from "next/server";
import { getManagerSession } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function GET() {
  const ok = await getManagerSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gmailUser = process.env.GMAIL_USER || null;
  const gmailPass = !!process.env.GMAIL_APP_PASSWORD;
  const brevoLogin = process.env.BREVO_SMTP_LOGIN || null;
  const brevoPass = !!process.env.BREVO_SMTP_PASSWORD;

  const results: Record<string, unknown> = {
    gmail: { user: gmailUser, hasPassword: gmailPass },
    brevo: { login: brevoLogin, hasPassword: brevoPass },
  };

  // Test Gmail (used for verification + subscription confirm emails)
  if (gmailUser && gmailPass) {
    const t = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: process.env.GMAIL_APP_PASSWORD },
    });
    try {
      await t.verify();
      results.gmail = { ...results.gmail as object, status: "✅ connected" };
    } catch (e: unknown) {
      results.gmail = { ...results.gmail as object, status: "❌ failed", error: e instanceof Error ? e.message : String(e) };
    }
  } else {
    results.gmail = { ...results.gmail as object, status: "❌ missing — GMAIL_USER or GMAIL_APP_PASSWORD not set" };
  }

  // Test Brevo (used only for bulk post notifications)
  if (brevoLogin && brevoPass) {
    const t = nodemailer.createTransport({
      host: "smtp-relay.brevo.com", port: 587, secure: false,
      auth: { user: brevoLogin, pass: process.env.BREVO_SMTP_PASSWORD },
    });
    try {
      await t.verify();
      results.brevo = { ...results.brevo as object, status: "✅ connected" };
    } catch (e: unknown) {
      results.brevo = { ...results.brevo as object, status: "❌ failed", error: e instanceof Error ? e.message : String(e) };
    }
  } else {
    results.brevo = { ...results.brevo as object, status: brevoPass ? "⚠️ BREVO_SMTP_LOGIN not set — bulk emails will fall back to Gmail" : "not configured (optional)" };
  }

  return NextResponse.json(results);
}
