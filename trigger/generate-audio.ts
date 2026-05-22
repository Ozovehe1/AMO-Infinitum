import { task } from "@trigger.dev/sdk/v3";
import { generatePostAudio } from "../lib/tts-generate";

export const generateAudioTask = task({
  id: "generate-post-audio",
  maxDuration: 600,
  run: async (payload: { slug: string; title: string; content: string }) => {
    await generatePostAudio(payload.slug, payload.title, payload.content);
  },
});
