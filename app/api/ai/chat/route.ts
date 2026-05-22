import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import type { Stream } from "@anthropic-ai/sdk/streaming";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ClaudeAPI });

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, title, content } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  const systemText = "You are a thinking and research partner for the author of AMO Infinitum, a personal blog. Help with brainstorming angles, asking probing questions, challenging assumptions, finding gaps in arguments, suggesting research directions, and exploring ideas. Do NOT write paragraphs of their post, rewrite their prose, or produce ready-to-publish content. Be intellectually engaging, direct, and curious. Use markdown where it aids clarity. Do not hallucinate";

  const hasPostContext = !!(title?.trim() || content?.trim());
  const system = hasPostContext
    ? `${systemText}\n\nPost title: ${title?.trim() || "(untitled)"}\n\n${content ? stripHtml(content) : ""}`.trim()
    : systemText;

  // Use create({stream:true}) so the await throws on API errors before we commit to a 200 response
  let anthropicStream: Stream<Anthropic.Messages.RawMessageStreamEvent>;
  try {
    anthropicStream = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      stream: true,
      system,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });
  } catch (err) {
    console.error("[ai/chat] error:", err);
    return NextResponse.json({ error: "AI chat failed" }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (e) {
        console.error("[ai/chat] stream error:", e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  });
}
