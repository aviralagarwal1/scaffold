import { ImageResponse } from "next/og";

export const alt = "Scaffold — a working memory of everything you've written";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social share image (Open Graph / Twitter / LinkedIn / Slack unfurls).
 *
 * This mirrors the landing hero at OG-card scale: a paper field with a
 * bronze accent wash top-left, the § wordmark up top, the 3-2-1 pyramid
 * headline on the left, and — the part that makes the card unmistakably
 * Scaffold — a condensed "Ask your library" answer card on the right,
 * carrying a Curator response and two numbered citations. Even at feed
 * thumbnail scale the card silhouette (status dot, dark question bubble,
 * highlighted phrase, cited rows) reads as "an agent answering about your
 * own writing," which is the product's whole claim.
 *
 * Satori constraints honored throughout: flexbox + absolute only, every
 * multi-child node declares display, no web-font payloads (Next's image
 * pipeline can't fetch woff2 during prerender), so we stay on the embedded
 * serif/mono generics — same approach as the original card.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          background: "#fbfaf6",
          padding: "64px 72px",
          fontFamily: "serif",
          color: "#22201d",
          position: "relative",
        }}
      >
        {/* Bronze accent wash anchored top-left, echoing the hero. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 820,
            height: 360,
            background:
              "radial-gradient(760px 320px at 12% -8%, rgba(180, 94, 44, 0.09), transparent 62%)",
          }}
        />

        {/* Left column: wordmark + pyramid headline, centered as a lockup. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 48,
            flex: 1,
            height: "100%",
            paddingRight: 44,
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              fontSize: 30,
              letterSpacing: "-0.012em",
              color: "#141311",
            }}
          >
            <span style={{ color: "#b45e2c" }}>§</span>
            <span>Scaffold</span>
          </div>

          {/* Headline — tapered 3-2-1 pyramid, italic accent on "entire". */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 64,
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              fontWeight: 600,
              color: "#141311",
            }}
          >
            <span style={{ display: "flex" }}>Agents that know</span>
            <span style={{ display: "flex", alignItems: "baseline" }}>
              <span>your&nbsp;</span>
              <span style={{ display: "flex", flexDirection: "column", position: "relative" }}>
                <span
                  style={{
                    fontStyle: "italic",
                    fontWeight: 400,
                    color: "#7d3d1a",
                    lineHeight: 1,
                  }}
                >
                  entire
                </span>
                {/* Bronze underline wash sitting just under the word, matching
                    the hero's accent-200/55. Anchored to the text box bottom so
                    it reads as an underline rather than a strike. */}
                <span
                  style={{
                    position: "absolute",
                    left: 2,
                    right: 2,
                    bottom: -6,
                    height: 10,
                    background: "rgba(232, 194, 164, 0.55)",
                    borderRadius: 3,
                  }}
                />
              </span>
            </span>
            <span style={{ display: "flex" }}>library.</span>
          </div>
        </div>

        {/* Right column: condensed "Ask your library" answer card. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 440,
            borderRadius: 14,
            border: "1px solid #e3e0d4",
            background: "#ffffff",
            boxShadow: "0 8px 30px rgba(20, 18, 15, 0.08)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Hairline accent on the top edge — the card's signature. */}
          <span
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background:
                "linear-gradient(90deg, rgba(216,154,110,0), #d99a6e 50%, rgba(216,154,110,0))",
            }}
          />

          {/* Workspace chrome */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid #e3e0d4",
              background: "#f6f4ee",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{ display: "flex", width: 8, height: 8, borderRadius: 9999, background: "#5b8a64" }}
              />
              <span style={{ fontFamily: "monospace", fontSize: 13, color: "#524d44" }}>
                yourname.substack.com
              </span>
            </div>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: "#a39d8a",
              }}
            >
              ASK
            </span>
          </div>

          {/* Conversation */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
            {/* User question */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <span
                style={{
                  display: "flex",
                  maxWidth: "86%",
                  background: "#141311",
                  color: "#fbfaf6",
                  borderRadius: 14,
                  borderTopRightRadius: 6,
                  padding: "9px 13px",
                  fontSize: 15,
                  lineHeight: 1.4,
                }}
              >
                What makes my best posts distinctive?
              </span>
            </div>

            {/* Curator response */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "flex", width: 24, height: 1, background: "#c87a48" }} />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    color: "#7d3d1a",
                  }}
                >
                  CURATOR
                </span>
                <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 11, color: "#a39d8a" }}>
                  Just now
                </span>
              </div>

              {/* Answer with an inline highlighted phrase. */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: "#22201d",
                }}
              >
                <span>Your strongest pieces open with a&nbsp;</span>
                <span
                  style={{
                    background: "#f4e1d2",
                    color: "#141311",
                    padding: "0 4px",
                    borderRadius: 3,
                  }}
                >
                  personal observation
                </span>
                <span>&nbsp;before widening into a broader argument.</span>
              </div>
            </div>

            {/* Cited posts */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "flex", width: 24, height: 1, background: "#c87a48" }} />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10.5,
                    letterSpacing: "0.14em",
                    color: "#7d3d1a",
                  }}
                >
                  CITED FROM YOUR LIBRARY
                </span>
              </div>

              <CitationRow num="01" date="Mar 14" title="The interface as ideology" />
              <CitationRow num="02" date="Feb 9" title="Notes from a quiet rewrite" />
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function CitationRow({ num, date, title }: { num: string; date: string; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        border: "1px solid #e3e0d4",
        borderRadius: 8,
        padding: "8px 10px",
        background: "#ffffff",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          height: 18,
          borderRadius: 4,
          background: "#fbf3ec",
          color: "#7d3d1a",
          fontFamily: "monospace",
          fontSize: 11,
        }}
      >
        {num}
      </span>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#777163" }}>{date}</span>
      <span style={{ fontSize: 14.5, color: "#141311" }}>{title}</span>
    </div>
  );
}
