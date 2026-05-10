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
 * Fonts are fetched from Google Fonts at build/request time. We subset by
 * the exact text we render, so the payload is tiny.
 */
async function loadEditorialFont(text: string, weight: 400 | 600 = 400, italic = false) {
  const ital = italic ? "1," : "0,";
  const url = `https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@${ital}${weight}&text=${encodeURIComponent(
    text,
  )}&display=swap`;
  const css = await fetch(url, {
    headers: {
      // Must look like a modern browser so Google serves a woff2/ttf URL
      // Satori can consume.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  }).then((r) => r.text());
  const fontUrl = /url\((https?:\/\/[^)]+)\) format/.exec(css)?.[1];
  if (!fontUrl) throw new Error("Could not parse Google Fonts CSS");
  return fetch(fontUrl).then((r) => r.arrayBuffer());
}

export default async function OpenGraphImage() {
  // Gather the exact text we'll render so the font subsets are minimal.
  const wordmarkRoman = "§ Scaffold";
  const headlineRoman = "Agents that know your ";
  const headlineItalic = "entire";
  const headlineTail = " Substack archive.";
  const tagline = "A working memory for everything you've written.";

  const [serifRegular, serifItalic, serifSemibold] = await Promise.all([
    loadEditorialFont(
      wordmarkRoman + headlineRoman + headlineTail + tagline + "0123456789",
      400,
      false,
    ),
    loadEditorialFont(headlineItalic, 400, true),
    loadEditorialFont(headlineRoman + headlineTail, 600, false),
  ]);

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
          fontFamily: "'Source Serif 4'",
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
            <span>Agents that know your&nbsp;</span>
            <span style={{ position: "relative", display: "flex" }}>
              <span style={{ fontStyle: "italic", fontWeight: 400 }}>entire</span>
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 8,
                  height: 10,
                  background: "rgba(217, 154, 110, 0.55)",
                  transform: "skewX(-6deg)",
                  borderRadius: 3,
                  zIndex: -1,
                }}
              />
            </span>
            <span>&nbsp;Substack archive.</span>
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
                display: "inline-block",
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
    {
      ...size,
      fonts: [
        { name: "Source Serif 4", data: serifRegular, style: "normal", weight: 400 },
        { name: "Source Serif 4", data: serifItalic, style: "italic", weight: 400 },
        { name: "Source Serif 4", data: serifSemibold, style: "normal", weight: 600 },
      ],
    },
  );
}
