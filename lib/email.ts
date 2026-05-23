import nodemailer from "nodemailer";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";
const FROM = `AMO Infinitum <${process.env.GMAIL_USER || "amoinfinitum@gmail.com"}>`;

function toEmailHtml(html: string): string {
  return html
    .replace(/<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, inner) =>
      `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:600;color:#fffef9;line-height:1.4;">${inner}</p>`)
    .replace(/<(h[4-6])[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, inner) =>
      `<p style="margin:0 0 14px;font-size:16px;font-weight:600;color:#fffef9;">${inner}</p>`)
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) =>
      inner.trim() ? `<p style="margin:0 0 18px;font-size:15px;color:#c8d8e4;line-height:1.8;">${inner}</p>` : "")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, `<strong style="color:#fffef9;font-weight:700;">$1</strong>`)
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, `<em style="font-style:italic;">$1</em>`)
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) =>
      `<div style="margin:0 0 18px;padding:12px 16px;border-left:3px solid #c8a97e;font-style:italic;color:#8fa3b1;">${inner}</div>`)
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) =>
      `<ul style="margin:0 0 18px;padding-left:20px;color:#c8d8e4;">${inner}</ul>`)
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) =>
      `<ol style="margin:0 0 18px;padding-left:20px;color:#c8d8e4;">${inner}</ol>`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, `<li style="margin:0 0 6px;font-size:15px;line-height:1.7;">$1</li>`)
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
      `<a href="$1" style="color:#c8a97e;text-decoration:underline;">$2</a>`)
    .replace(/<img[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function transporter() {
  if (process.env.BREVO_SMTP_LOGIN && process.env.BREVO_SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_LOGIN,
        pass: process.env.BREVO_SMTP_PASSWORD,
      },
    });
  }
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
  post: { title: string; slug: string; excerpt?: string | null; coverImage?: string | null; content?: string | null }
) {
  const postUrl = `${SITE}/blog/${post.slug}`;
  const t = transporter();

  for (const sub of subscribers) {
    const unsubUrl = `${SITE}/api/unsubscribe?token=${sub.token}`;

    const coverBlock = post.coverImage
      ? `<div style="margin:0 0 28px;border-radius:4px;overflow:hidden;">
           <img src="${post.coverImage}" alt="" width="480"
                style="width:100%;max-height:220px;object-fit:cover;display:block;border-radius:4px;">
         </div>`
      : "";

    const contentBlock = post.content
      ? `<div style="margin:0 0 32px;">${toEmailHtml(post.content)}</div>`
      : post.excerpt
        ? `<p style="font-size:15px;color:#c8d8e4;line-height:1.8;margin:0 0 32px;">${post.excerpt}</p>`
        : "";

    const html = baseLayout(
      `${coverBlock}
      <p style="margin:0 0 10px;font-size:11px;color:#8fa3b1;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">New essay</p>
      <h2 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#fffef9;line-height:1.35;">
        ${post.title}
      </h2>
      ${contentBlock}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
        <tr><td style="background:#c8a97e;border-radius:5px;">
          <a href="${postUrl}"
             style="display:inline-block;padding:13px 32px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#0d1f3c;text-decoration:none;letter-spacing:0.02em;">
            View on the blog &rarr;
          </a>
        </td></tr>
      </table>`,
      `<p style="margin:0 0 10px;font-size:12px;color:#8fa3b1;line-height:1.6;">
        You received this because you subscribed to AMO Infinitum.
      </p>
      <p style="margin:0;font-size:12px;">
        <a href="${unsubUrl}" style="color:#c8a97e;text-decoration:underline;font-weight:600;">Unsubscribe</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="${SITE}" style="color:#8fa3b1;text-decoration:underline;">Visit the blog</a>
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
