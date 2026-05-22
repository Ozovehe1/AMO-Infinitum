import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const systemBlock = {
    type: "text" as const,
    cache_control: { type: "ephemeral" as const },
    text: "You are a thinking and research partner for the author of AMO Infinitum, a personal blog. Help with brainstorming angles, asking probing questions, challenging assumptions, finding gaps in arguments, suggesting research directions, and exploring ideas. Use web search sparingly — only when the author explicitly asks, or when the question involves current events or data that may have changed after your training. Do NOT write paragraphs of their post, rewrite their prose, or produce ready-to-publish content. Be intellectually engaging, direct, and curious. Use markdown where it aids clarity.",
  };

  const hasPostContext = !!(title?.trim() || content?.trim());
  const systemBlocks = hasPostContext
    ? [
        systemBlock,
        {
          type: "text" as const,
          text: `Post title: ${title?.trim() || "(untitled)"}\n\n${content ? stripHtml(content) : ""}`.trim(),
        },
      ]
    : [systemBlock];

  let stream: ReturnType<typeof anthropic.messages.stream>;
  try {
    stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      system: systemBlocks as any,
      tools: [{ type: "web_search_20260209" as const, name: "web_search" as const }],
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });
  } catch (err) {
    console.error("[ai/chat] stream init error:", err);
    return NextResponse.json({ error: "AI chat failed" }, { status: 500 });
  }

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        console.error("[ai/chat] stream error:", err);
      }
      controller.close();
    },
    cancel() {
      stream.controller.abort();
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
