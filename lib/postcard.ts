const PAD_RATIO = 0.06;

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
    const maxDim = 1200;
    const scale  = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width  = Math.round(img.naturalWidth  * scale);
    canvas.height = Math.round(img.naturalHeight * scale);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Gradient: darkens quickly from 10% so title at ~29% sits on ~54% opacity,
    // and excerpt below that is on 70%+ opacity — both readable in white.
    const grad = ctx.createLinearGradient(0, canvas.height * 0.10, 0, canvas.height);
    grad.addColorStop(0,    "rgba(0,0,0,0)");
    grad.addColorStop(0.15, "rgba(0,0,0,0.50)");
    grad.addColorStop(0.50, "rgba(0,0,0,0.75)");
    grad.addColorStop(1,    "rgba(0,0,0,0.92)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
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

  // AMO badge (top-left) — large enough to read clearly in any share thumbnail
  const badgeR = Math.round(W * 0.030);
  const bx     = PAD + badgeR;
  const by     = Math.round(H * 0.10);
  ctx.beginPath();
  ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = "#c8a97e";
  ctx.fill();
  ctx.fillStyle    = img ? "#000" : "#0d1f3c";
  ctx.font         = `bold ${Math.round(badgeR * 1.1)}px sans-serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", bx, by);

  ctx.fillStyle    = "#c8a97e";
  ctx.font         = `bold ${Math.round(W * 0.026)}px serif`;
  ctx.textAlign    = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("AMO INFINITUM", bx + badgeR + Math.round(W * 0.016), by);

  // Gold rule near the bottom
  const ruleY = H - Math.round(H * 0.09);
  ctx.fillStyle = "#c8a97e";
  ctx.fillRect(PAD, ruleY, Math.round(W * 0.04), Math.round(H * 0.005));

  // Text sizes — excerpt is 56% of canvas width (large enough to fill ≥1/3 of card)
  const titleSize    = Math.round(W * (title.length > 60 ? 0.044 : 0.055));
  const TITLE_LINE_H = Math.round(titleSize * 1.22);
  const excerptSize  = Math.round(W * 0.056);
  const EXCERPT_LINE_H = Math.round(excerptSize * 1.48);

  ctx.font = `bold ${titleSize}px serif`;
  const titleLines = wrapText(ctx, title, W - PAD * 2 - Math.round(W * 0.04), 3);

  let excerptLines: string[] = [];
  if (excerpt) {
    ctx.font = `${excerptSize}px sans-serif`;

    // minTy is the highest the text block may start (H*0.28 = gradient ~54% opacity,
    // enough for large bold white title). Compute how many excerpt lines fit between
    // minTy and the rule so the block never overflows.
    const minTy       = Math.round(H * 0.28);
    const gap         = Math.round(H * 0.022);
    const maxBlockH   = ruleY - Math.round(H * 0.025) - minTy;
    const titleBlock  = titleLines.length * TITLE_LINE_H + gap;
    const excerptRoom = Math.max(0, maxBlockH - titleBlock);
    const maxLines    = Math.min(5, Math.max(1, Math.floor(excerptRoom / EXCERPT_LINE_H)));

    excerptLines = wrapText(ctx, excerpt, W - PAD * 2, maxLines);
  }

  const gap    = excerptLines.length > 0 ? Math.round(H * 0.022) : 0;
  const blockH = titleLines.length * TITLE_LINE_H + gap + excerptLines.length * EXCERPT_LINE_H;
  // With a cover photo: bottom-anchor text above the rule (reads over darkened photo).
  // Without a cover: vertically center the text block between the brand row and the rule.
  let ty: number;
  if (img) {
    ty = Math.max(Math.round(H * 0.28), ruleY - Math.round(H * 0.025) - blockH);
  } else {
    const topBound    = Math.round(H * 0.22);
    const bottomBound = ruleY - Math.round(H * 0.025);
    ty = Math.max(topBound, Math.round((topBound + bottomBound - blockH) / 2));
  }

  // Title
  ctx.fillStyle    = "#ffffff";
  ctx.font         = `bold ${titleSize}px serif`;
  ctx.textAlign    = "left";
  ctx.textBaseline = "top";
  for (const line of titleLines) {
    ctx.fillText(line, PAD, ty);
    ty += TITLE_LINE_H;
  }

  // Excerpt — slightly dimmer than title to create visual hierarchy
  if (excerptLines.length > 0) {
    ty += gap;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
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
