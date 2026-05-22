import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ corrections: [] });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Analyze the text below for grammar, spelling, punctuation, and clarity issues. Return a JSON array where each item has:
- "original": the exact phrase as it appears in the text (must match exactly, case-sensitive)
- "corrected": the improved version
- "reason": brief explanation in 5 words or less

Return ONLY a valid JSON array, no markdown, no code fences. If no issues, return [].

Text:
"""${text.trim()}"""`,
      }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const corrections = JSON.parse(cleaned);
    return NextResponse.json({ corrections: Array.isArray(corrections) ? corrections : [] });
  } catch (err) {
    console.error("[grammar] API error:", err);
    return NextResponse.json({ error: "Grammar check failed" }, { status: 500 });
  }
}
