import { ImageResponse } from "next/og";

export const alt = "Scaffold — a working memory for everything you've written";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social share image (Open Graph / Twitter / Slack / Linear unfurls).
 *
 * Composition mirrors the landing hero at OG-card scale: paper field, a
 * subtle accent wash in the top-left, the wordmark up top, the headline
 * dominating the middle, a tagline beneath. Restrained, editorial, no
 * SaaS chrome.
 *
 * Keep this route self-contained: Next's image pipeline does not support
 * Google Fonts' woff2 payloads during prerendering.
 */
export default function OpenGraphImage() {
  const headlineStart = "Agents that know your";
  const highlightedWord = "entire";
  const headlineEnd = "library.";
  const tagline = "A working memory for everything you've written.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbfaf6",
          padding: "72px 80px",
          fontFamily: "serif",
          color: "#22201d",
          position: "relative",
        }}
      >
        {/* Subtle accent wash anchored top-left, echoing the landing hero. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 720,
            height: 320,
            background:
              "radial-gradient(680px 280px at 14% 0%, rgba(180, 94, 44, 0.10), transparent 70%)",
          }}
        />

        {/* Top: wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            fontSize: 28,
            letterSpacing: "-0.012em",
            color: "#141311",
          }}
        >
          <span style={{ color: "#b45e2c" }}>§</span>
          <span>Scaffold</span>
        </div>

        {/* Middle: headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            maxWidth: 980,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 84,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              fontWeight: 600,
              color: "#141311",
            }}
          >
            <span>{headlineStart}&nbsp;</span>
            <span style={{ display: "flex", color: "#7d3d1f" }}>
              <span style={{ fontStyle: "italic", fontWeight: 400 }}>{highlightedWord}</span>
            </span>
            <span>&nbsp;{headlineEnd}</span>
          </div>
        </div>

        {/* Bottom: tagline + brand strip */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 22,
              color: "#54514c",
            }}
          >
            <span
              style={{
                display: "flex",
                width: 28,
                height: 1,
                background: "#c87a48",
              }}
            />
            <span>{tagline}</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
