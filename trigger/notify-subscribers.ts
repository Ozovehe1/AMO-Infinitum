import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "../lib/db";
import { sendNewPostNotifications } from "../lib/email";

export const notifySubscribersTask = task({
  id: "notify-subscribers",
  maxDuration: 120,
  run: async (payload: { title: string; slug: string; excerpt?: string; coverImage?: string }) => {
    const subscribers = await prisma.subscriber.findMany({
      where: { verified: true },
      select: { email: true, token: true },
    });

    if (subscribers.length === 0) return { sent: 0 };

    await sendNewPostNotifications(subscribers, payload);

    return { sent: subscribers.length };
  },
});
