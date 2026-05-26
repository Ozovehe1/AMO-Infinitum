import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title        = searchParams.get("title")        || "Untitled";
  const excerpt      = searchParams.get("excerpt")      || "";
  const cover        = searchParams.get("cover")        || "";
  const siteName     = searchParams.get("siteName")     || "AMO Infinitum";
  const colorAccent  = searchParams.get("colorAccent")  || "#c8a97e";
  const colorPrimary = searchParams.get("colorPrimary") || "#0d1f3c";
  const download     = searchParams.get("download")     === "1";

  const fontRes = await fetch(
    "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFiD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_pqRbtA.woff"
  ).catch(() => null);
  const fontData = (fontRes && fontRes.ok) ? await fontRes.arrayBuffer() : null;

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: colorPrimary,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Cover image — fills background */}
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              opacity: 0.45,
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              background:
                `radial-gradient(ellipse at 80% 20%, ${colorAccent}55 0%, transparent 55%), ` +
                `radial-gradient(ellipse at 20% 80%, ${colorAccent}33 0%, transparent 50%)`,
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            background:
              `linear-gradient(135deg, ${colorPrimary}26 0%, ${colorPrimary}8c 40%, ${colorPrimary}f2 100%)`,
          }}
        />

        {/* Top-left branding — per-blog name */}
        <div
          style={{
            position: "absolute",
            top: 48, left: 64,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ width: 4, height: 32, background: colorAccent, borderRadius: 2 }} />
          <span
            style={{
              fontFamily: fontData ? "Playfair" : "Georgia, serif",
              fontSize: 26,
              color: colorAccent,
              letterSpacing: "0.06em",
            }}
          >
            {siteName}
          </span>
        </div>

        {/* Bottom content — title + excerpt */}
        <div
          style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            padding: "0 64px 60px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ width: 52, height: 3, background: colorAccent, borderRadius: 2, marginBottom: 2 }} />

          <div
            style={{
              fontFamily: fontData ? "Playfair" : "Georgia, serif",
              fontSize: title.length > 60 ? 46 : title.length > 40 ? 54 : 64,
              fontWeight: 700,
              color: "#fffef9",
              lineHeight: 1.15,
              maxWidth: 920,
            }}
          >
            {title}
          </div>

          {excerpt && (
            <div
              style={{
                fontFamily: "system-ui, sans-serif",
                fontSize: 26,
                fontWeight: 400,
                color: "rgba(245,240,232,0.80)",
                lineHeight: 1.5,
                maxWidth: 840,
              }}
            >
              {excerpt}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontData
        ? [{ name: "Playfair", data: fontData, weight: 700, style: "normal" }]
        : [],
    }
  );

  if (!download) return imageResponse;

  const headers = new Headers(imageResponse.headers);
  headers.set("Content-Disposition", `attachment; filename="${siteName.toLowerCase().replace(/\s+/g, "-")}-preview.png"`);
  headers.set("Cache-Control", "no-cache");
  return new Response(imageResponse.body, { headers });
}
