import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ClaudeAPI });

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, title, content } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  const postContext = `The author is currently working on a blog post for AMO Infinitum.\n\nTitle: ${title?.trim() || "(untitled)"}\n\nContent so far:\n${content ? stripHtml(content) : "(empty)"}`;

  const systemBlock = {
    type: "text" as const,
    text: "You are a thinking and research partner for the author of AMO Infinitum, a personal blog. Your role is to help them think deeper — not to write for them. Help with: brainstorming angles, asking probing questions, challenging assumptions, finding gaps in arguments, suggesting research directions, and exploring ideas. You have access to web search — use it sparingly and only when: (1) the author explicitly asks you to research or look something up, (2) the question involves current events, recent data, or information that may have changed after your training, or (3) you genuinely don't know something and a search would give a meaningfully better answer. For general brainstorming, philosophy, ideas, and conceptual discussion, rely on your own knowledge — do not search unnecessarily. Do NOT write paragraphs of their blog post, rewrite their prose, or produce ready-to-publish content. If they ask you to write something, redirect them toward thinking it through. Be intellectually engaging, direct, and curious. You may use markdown formatting — headings, bold, lists — where it aids clarity. The interface renders markdown properly.",
  };
  const contextBlock = { type: "text" as const, text: postContext };

  const stream = await anthropic.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    system: [{ ...systemBlock, cache_control: { type: "ephemeral" } }, contextBlock] as any,
    tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
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
