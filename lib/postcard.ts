const PAD_RATIO = 0.06; // padding as fraction of width

export async function makePostcardBlob({
  title,
  excerpt,
  coverImage,
}: {
  title: string;
  excerpt?: string;
  coverImage?: string;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx    = canvas.getContext("2d")!;

  let img: HTMLImageElement | null = null;

  if (coverImage) {
    try {
      const src = coverImage.includes(".blob.vercel-storage.com/")
        ? `/api/img?src=${encodeURIComponent(coverImage)}`
        : coverImage;
      img = await loadImage(src);
    } catch { /* fall through to navy fallback */ }
  }

  if (img) {
    // Cap at 1200px so text stays legible when the image is compressed to phone-screen width
    const maxDim = 1200;
    const scale  = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width  = Math.round(img.naturalWidth  * scale);
    canvas.height = Math.round(img.naturalHeight * scale);

    // Cover photo — full opacity, fills entire canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Gradient covers bottom half so the larger text block is always readable
    const grad = ctx.createLinearGradient(0, canvas.height * 0.30, 0, canvas.height);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.45, "rgba(0,0,0,0.60)");
    grad.addColorStop(1,   "rgba(0,0,0,0.88)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    // No cover — navy branded card at standard OG dimensions
    canvas.width  = 1200;
    canvas.height = 630;

    ctx.fillStyle = "#0d1f3c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "rgba(13,31,60,0.0)");
    grad.addColorStop(1, "rgba(13,31,60,0.6)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const W   = canvas.width;
  const H   = canvas.height;
  const PAD = Math.round(W * PAD_RATIO);

  // AMO badge (top-left)
  const badgeR = Math.round(W * 0.016);
  const bx     = PAD + badgeR;
  const by     = Math.round(H * 0.08);
  ctx.beginPath();
  ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = "#c8a97e";
  ctx.fill();
  ctx.fillStyle = img ? "#000" : "#0d1f3c";
  ctx.font      = `bold ${Math.round(badgeR * 1.1)}px sans-serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", bx, by);

  // Publication name
  ctx.fillStyle    = "#c8a97e";
  ctx.font         = `${Math.round(W * 0.015)}px sans-serif`;
  ctx.textAlign    = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("AMO INFINITUM", bx + badgeR + Math.round(W * 0.012), by);

  // Gold rule
  const ruleY = H - Math.round(H * 0.09);
  ctx.fillStyle = "#c8a97e";
  ctx.fillRect(PAD, ruleY, Math.round(W * 0.04), Math.round(H * 0.005));

  // Text sizes proportional to canvas width
  const titleSize    = Math.round(W * (title.length > 60 ? 0.044 : 0.055));
  const TITLE_LINE_H = Math.round(titleSize * 1.22);
  const excerptSize  = Math.round(W * 0.052);
  const EXCERPT_LINE_H = Math.round(excerptSize * 1.6);

  ctx.font = `bold ${titleSize}px serif`;
  const titleLines = wrapText(ctx, title, W - PAD * 2 - Math.round(W * 0.04), 3);

  let excerptLines: string[] = [];
  if (excerpt) {
    ctx.font = `${excerptSize}px sans-serif`;
    excerptLines = wrapText(ctx, excerpt, W - PAD * 2, 4);
  }

  const gap    = excerptLines.length > 0 ? Math.round(H * 0.02) : 0;
  const blockH = titleLines.length * TITLE_LINE_H + gap + excerptLines.length * EXCERPT_LINE_H;
  let ty = ruleY - Math.round(H * 0.025) - blockH;

  // Title
  ctx.fillStyle    = "#ffffff";
  ctx.font         = `bold ${titleSize}px serif`;
  ctx.textAlign    = "left";
  ctx.textBaseline = "top";
  for (const line of titleLines) {
    ctx.fillText(line, PAD, ty);
    ty += TITLE_LINE_H;
  }

  // Excerpt
  if (excerptLines.length > 0) {
    ty += gap;
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font      = `${excerptSize}px sans-serif`;
    for (const line of excerptLines) {
      ctx.fillText(line, PAD, ty);
      ty += EXCERPT_LINE_H;
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png"
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) {
        let last = lines[maxLines - 1];
        while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 0) {
          last = last.slice(0, -1);
        }
        lines[maxLines - 1] = `${last}…`;
        return lines;
      }
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}
