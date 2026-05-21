const W = 1200;
const H = 630;
const PAD = 72;

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
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 1. Navy base
  ctx.fillStyle = "#0d1f3c";
  ctx.fillRect(0, 0, W, H);

  // 2. Cover photo — private blobs go through /api/img proxy
  if (coverImage) {
    try {
      const src = coverImage.includes(".blob.vercel-storage.com/")
        ? `/api/img?src=${encodeURIComponent(coverImage)}`
        : coverImage;
      const img = await loadImage(src);
      const scale = Math.max(W / img.width, H / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
      ctx.globalAlpha = 1;
    } catch { /* skip cover — card still looks good without it */ }
  }

  // 3. Gradient overlay (top-to-bottom, heavy at bottom)
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(13,31,60,0.45)");
  grad.addColorStop(0.5, "rgba(13,31,60,0.75)");
  grad.addColorStop(1,   "rgba(13,31,60,0.97)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 4. AMO badge (top-left)
  const bx = PAD + 18;
  const by = 56;
  ctx.beginPath();
  ctx.arc(bx, by, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#c8a97e";
  ctx.fill();
  ctx.fillStyle = "#0d1f3c";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", bx, by);

  // Publication name
  ctx.fillStyle = "#c8a97e";
  ctx.font = "18px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("AMO INFINITUM", bx + 28, by);

  // 5. Gold rule (bottom-left, above content)
  const ruleY = H - 56;
  ctx.fillStyle = "#c8a97e";
  ctx.fillRect(PAD, ruleY, 48, 3);

  // 6. Measure and position text block above the rule
  const EXCERPT_SIZE = 22;
  const EXCERPT_LINE_H = 34;
  const titleSize = title.length > 60 ? 44 : 56;
  const TITLE_LINE_H = Math.round(titleSize * 1.2);

  ctx.font = `bold ${titleSize}px serif`;
  const titleLines = wrapText(ctx, title, W - PAD * 2 - 40, 3);

  let excerptLines: string[] = [];
  if (excerpt) {
    ctx.font = `${EXCERPT_SIZE}px sans-serif`;
    excerptLines = wrapText(ctx, excerpt, W - PAD * 2, 2);
  }

  const gap = excerptLines.length > 0 ? 18 : 0;
  const totalH =
    titleLines.length * TITLE_LINE_H +
    gap +
    excerptLines.length * EXCERPT_LINE_H;

  let ty = ruleY - 24 - totalH;

  // 7. Draw title
  ctx.fillStyle = "#fffef9";
  ctx.font = `bold ${titleSize}px serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  for (const line of titleLines) {
    ctx.fillText(line, PAD, ty);
    ty += TITLE_LINE_H;
  }

  // 8. Draw excerpt
  if (excerptLines.length > 0) {
    ty += gap;
    ctx.fillStyle = "rgba(255,254,249,0.72)";
    ctx.font = `${EXCERPT_SIZE}px sans-serif`;
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
    img.onload = () => resolve(img);
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
        // Truncate last line with ellipsis
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
