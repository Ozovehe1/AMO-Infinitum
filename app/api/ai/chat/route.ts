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
    text: "You are a thoughtful writing assistant for AMO Infinitum, a personal blog. Help the author brainstorm ideas, sharpen arguments, suggest titles, improve prose, or answer questions about their post. Be concise, direct, and match the blog's literary, reflective tone.",
  };
  const contextBlock = { type: "text" as const, text: postContext };

  const stream = await anthropic.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    system: [{ ...systemBlock, cache_control: { type: "ephemeral" } }, contextBlock] as any,
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
