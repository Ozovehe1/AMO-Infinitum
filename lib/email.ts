import nodemailer from "nodemailer";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";
const FROM = `AMO Infinitum <${process.env.GMAIL_USER || "amoinfinitum@gmail.com"}>`;

function transporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function baseLayout(body: string, footer: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>AMO Infinitum</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;">

        <!-- Header -->
        <tr><td style="background:#0d1f3c;border-radius:8px 8px 0 0;padding:28px 40px 20px;text-align:center;border-bottom:2px solid #c8a97e;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#c8a97e;letter-spacing:0.02em;">
            AMO <em style="color:#fffef9;font-style:italic;">Infinitum</em>
          </p>
          <p style="margin:5px 0 0;font-size:11px;color:#8fa3b1;letter-spacing:0.1em;text-transform:uppercase;">On the infinitudes of life</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#0d1f3c;padding:32px 40px;">${body}</td></tr>

        <!-- Footer -->
        <tr><td style="background:#091629;border-radius:0 0 8px 8px;padding:20px 40px;border-top:1px solid rgba(200,169,126,0.15);text-align:center;">
          ${footer}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendConfirmationEmail(email: string, token: string) {
  const confirmUrl = `${SITE}/api/subscribe/confirm?token=${token}`;

  const html = baseLayout(
    `<h2 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:#fffef9;line-height:1.35;">
      You're almost in.
    </h2>
    <p style="margin:0 0 6px;font-size:15px;color:#c8d8e4;line-height:1.7;">
      Just one click to confirm your subscription to AMO Infinitum — and new essays will arrive straight in your inbox.
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#7a90a0;line-height:1.6;">
      If you didn't subscribe, you can safely ignore this.
    </p>
    <!-- CTA button -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr><td style="background:#c8a97e;border-radius:5px;">
        <a href="${confirmUrl}"
           style="display:inline-block;padding:13px 32px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#0d1f3c;text-decoration:none;letter-spacing:0.02em;">
          Confirm my subscription
        </a>
      </td></tr>
    </table>`,
    `<p style="margin:0;font-size:11px;color:#4e6070;line-height:1.6;">
      © ${new Date().getFullYear()} AMO Infinitum &nbsp;·&nbsp;
      <a href="${SITE}" style="color:#4e6070;text-decoration:underline;">Visit the blog</a>
    </p>`
  );

  const text = `You're almost in!\n\nConfirm your subscription to AMO Infinitum by visiting:\n${confirmUrl}\n\nIf you didn't subscribe, ignore this email.\n\n— AMO Infinitum\n${SITE}`;

  await transporter().sendMail({
    from: FROM,
    to: email,
    subject: "Please confirm your AMO Infinitum subscription",
    text,
    html,
  });
}

export async function sendNewPostNotifications(
  subscribers: { email: string; token: string }[],
  post: { title: string; slug: string; excerpt?: string | null; coverImage?: string | null }
) {
  const postUrl = `${SITE}/blog/${post.slug}`;
  const t = transporter();

  for (const sub of subscribers) {
    const unsubUrl = `${SITE}/api/unsubscribe?token=${sub.token}`;

    const coverBlock = post.coverImage
      ? `<div style="margin:0 0 24px;border-radius:4px;overflow:hidden;">
           <img src="${post.coverImage}" alt="" width="480"
                style="width:100%;max-height:200px;object-fit:cover;display:block;border-radius:4px;">
         </div>`
      : "";

    const excerptBlock = post.excerpt
      ? `<p style="margin:0 0 28px;font-size:15px;color:#c8d8e4;line-height:1.75;font-style:italic;border-left:2px solid #c8a97e;padding-left:16px;">
           ${post.excerpt}
         </p>`
      : "";

    const html = baseLayout(
      `${coverBlock}
      <p style="margin:0 0 10px;font-size:11px;color:#8fa3b1;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">New essay</p>
      <h2 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:#fffef9;line-height:1.35;">
        ${post.title}
      </h2>
      ${excerptBlock}
      <!-- CTA button -->
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
        <tr><td style="background:#c8a97e;border-radius:5px;">
          <a href="${postUrl}"
             style="display:inline-block;padding:13px 32px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#0d1f3c;text-decoration:none;letter-spacing:0.02em;">
            Read the essay &rarr;
          </a>
        </td></tr>
      </table>`,
      `<p style="margin:0 0 8px;font-size:12px;color:#4e6070;line-height:1.6;">
        You received this because you subscribed to AMO Infinitum.
      </p>
      <p style="margin:0;font-size:11px;color:#3d5060;">
        <a href="${unsubUrl}" style="color:#5a7080;text-decoration:underline;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="${SITE}" style="color:#5a7080;text-decoration:underline;">Visit the blog</a>
        &nbsp;·&nbsp;
        © ${new Date().getFullYear()} AMO Infinitum
      </p>`
    );

    const text = `${post.title}\n\n${post.excerpt || ""}\n\nRead the full essay:\n${postUrl}\n\n---\nYou received this because you subscribed to AMO Infinitum.\nUnsubscribe: ${unsubUrl}`;

    await t.sendMail({
      from: FROM,
      to: sub.email,
      subject: `"${post.title}" — AMO Infinitum`,
      text,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "Precedence": "bulk",
      },
    });
  }
}
