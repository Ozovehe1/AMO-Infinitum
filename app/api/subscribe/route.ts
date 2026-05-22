import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email, name } = await req.json().catch(() => ({}));

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const normalised = email.trim().toLowerCase();

  const existing = await prisma.subscriber.findUnique({ where: { email: normalised } });

  if (existing?.verified) {
    return NextResponse.json({ message: "already_subscribed" });
  }

  const token = crypto.randomUUID();

  if (existing) {
    await prisma.subscriber.update({ where: { email: normalised }, data: { token, name: name?.trim() || null } });
  } else {
    await prisma.subscriber.create({ data: { email: normalised, name: name?.trim() || null, token } });
  }

  await sendConfirmationEmail(normalised, token);

  return NextResponse.json({ message: "confirmation_sent" });
}
