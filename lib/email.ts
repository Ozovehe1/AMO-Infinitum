import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `AMO Infinitum <${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}>`;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";

function baseLayout(body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AMO Infinitum</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#0d1f3c;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:32px 40px 0;text-align:center;">
          <p style="margin:0;font-family:Georgia,'Playfair Display',serif;font-size:22px;font-weight:600;color:#c8a97e;letter-spacing:0.02em;">
            AMO <em style="color:#fffef9;font-style:italic;">Infinitum</em>
          </p>
          <p style="margin:6px 0 0;font-size:12px;color:#8fa3b1;letter-spacing:0.08em;text-transform:uppercase;">On the infinitudes of life</p>
        </td></tr>
        <tr><td style="padding:32px 40px 40px;">${body}</td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(200,169,126,0.12);text-align:center;">
          <p style="margin:0;font-size:11px;color:#8fa3b1;">
            © ${new Date().getFullYear()} AMO Infinitum &nbsp;·&nbsp;
            <a href="${SITE}" style="color:#8fa3b1;text-decoration:none;">Visit blog</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendConfirmationEmail(email: string, token: string) {
  const confirmUrl = `${SITE}/api/subscribe/confirm?token=${token}`;
  const html = baseLayout(`
    <h2 style="margin:0 0 16px;font-family:Georgia,'Playfair Display',serif;font-size:24px;font-weight:600;color:#fffef9;line-height:1.3;">
      One click to confirm
    </h2>
    <p style="margin:0 0 28px;font-size:14px;color:#8fa3b1;line-height:1.7;">
      Thanks for subscribing to AMO Infinitum. Click the button below to confirm your email address and you'll receive new posts straight to your inbox.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr><td style="background:#c8a97e;border-radius:4px;">
        <a href="${confirmUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#0d1f3c;text-decoration:none;letter-spacing:0.02em;">
          Confirm subscription
        </a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:12px;color:#8fa3b1;line-height:1.6;">
      If you didn't subscribe, you can safely ignore this email.<br>
      This link expires after use.
    </p>
  `);

  await resend.emails.send({ from: FROM, to: email, subject: "Confirm your subscription to AMO Infinitum", html });
}

export async function sendNewPostNotifications(
  subscribers: { email: string; token: string }[],
  post: { title: string; slug: string; excerpt?: string | null; coverImage?: string | null }
) {
  const postUrl = `${SITE}/blog/${post.slug}`;
  const coverBlock = post.coverImage
    ? `<div style="margin:0 0 24px;border-radius:4px;overflow:hidden;"><img src="${post.coverImage}" alt="${post.title}" width="480" style="width:100%;height:180px;object-fit:cover;display:block;"></div>`
    : "";
  const excerptBlock = post.excerpt
    ? `<p style="margin:0 0 28px;font-size:14px;color:#8fa3b1;line-height:1.7;">${post.excerpt}</p>`
    : "";

  const makeHtml = (unsubscribeUrl: string) => baseLayout(`
    ${coverBlock}
    <p style="margin:0 0 8px;font-size:11px;color:#8fa3b1;letter-spacing:0.1em;text-transform:uppercase;">New post</p>
    <h2 style="margin:0 0 16px;font-family:Georgia,'Playfair Display',serif;font-size:22px;font-weight:600;color:#fffef9;line-height:1.3;">
      ${post.title}
    </h2>
    ${excerptBlock}
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr><td style="background:#c8a97e;border-radius:4px;">
        <a href="${postUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#0d1f3c;text-decoration:none;letter-spacing:0.02em;">
          Read post →
        </a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:12px;color:#8fa3b1;">
      You're receiving this because you subscribed to AMO Infinitum.<br>
      <a href="${unsubscribeUrl}" style="color:#8fa3b1;">Unsubscribe</a>
    </p>
  `);

  // Resend batch: up to 100 per request
  for (let i = 0; i < subscribers.length; i += 100) {
    const batch = subscribers.slice(i, i + 100);
    await resend.batch.send(
      batch.map(sub => ({
        from: FROM,
        to: sub.email,
        subject: `New post: "${post.title}"`,
        html: makeHtml(`${SITE}/api/unsubscribe?token=${sub.token}`),
      }))
    );
  }
}
