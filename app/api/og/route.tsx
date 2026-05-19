import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title   = searchParams.get("title")   || "AMO Infinitum";
  const excerpt = searchParams.get("excerpt") || "";
  const cover   = searchParams.get("cover")   || "";

  // Load Playfair Display Bold from Google Fonts
  const fontRes = await fetch(
    "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFiD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_pqRbtA.woff"
  ).catch(() => null);
  const fontData = fontRes ? await fontRes.arrayBuffer() : null;

  const shortExcerpt = excerpt.length > 130
    ? excerpt.slice(0, 130).trimEnd() + "…"
    : excerpt;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0d1f3c",
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
          /* Decorative fallback pattern */
          <div
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              background:
                "radial-gradient(ellipse at 80% 20%, rgba(45,125,154,0.35) 0%, transparent 55%), " +
                "radial-gradient(ellipse at 20% 80%, rgba(200,169,126,0.2) 0%, transparent 50%)",
            }}
          />
        )}

        {/* Gradient overlay — title always readable */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            background:
              "linear-gradient(135deg, rgba(13,31,60,0.15) 0%, rgba(13,31,60,0.55) 40%, rgba(13,31,60,0.95) 100%)",
          }}
        />

        {/* Top-left branding */}
        <div
          style={{
            position: "absolute",
            top: 52, left: 64,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 3,
              height: 28,
              background: "#c8a97e",
              borderRadius: 2,
            }}
          />
          <span
            style={{
              fontFamily: fontData ? "Playfair" : "Georgia, serif",
              fontSize: 22,
              color: "#c8a97e",
              letterSpacing: "0.05em",
            }}
          >
            AMO{" "}
            <span style={{ fontStyle: "italic", color: "#fffef9" }}>
              Infinitum
            </span>
          </span>
        </div>

        {/* Bottom content — title + excerpt */}
        <div
          style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            padding: "0 64px 56px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Thin gold rule above title */}
          <div
            style={{
              width: 48,
              height: 2,
              background: "#c8a97e",
              borderRadius: 1,
              marginBottom: 4,
            }}
          />

          {/* Title */}
          <div
            style={{
              fontFamily: fontData ? "Playfair" : "Georgia, serif",
              fontSize: title.length > 60 ? 48 : title.length > 40 ? 56 : 66,
              fontWeight: 700,
              color: "#fffef9",
              lineHeight: 1.15,
              maxWidth: 900,
            }}
          >
            {title}
          </div>

          {/* Excerpt */}
          {shortExcerpt && (
            <div
              style={{
                fontFamily: "system-ui, sans-serif",
                fontSize: 24,
                color: "rgba(245,240,232,0.72)",
                lineHeight: 1.55,
                maxWidth: 820,
              }}
            >
              {shortExcerpt}
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
}
