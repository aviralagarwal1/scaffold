import { ImageResponse } from "next/og";
import { PRODUCT_NAME, PRODUCT_PROMISE } from "@/lib/copy";

export const alt = `${PRODUCT_NAME} — ${PRODUCT_PROMISE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social share image (Open Graph / Twitter / LinkedIn / Slack unfurls).
 *
 * This mirrors the landing hero at OG-card scale: a paper field with a
 * bronze accent wash top-left, the § wordmark up top, the 3-2-1 pyramid
 * headline on the left, and — the part that makes the card unmistakably
 * Scaffold — a condensed "Ask your library" answer card on the right,
 * carrying an answer and two numbered citations. Even at feed
 * thumbnail scale the card silhouette (status dot, dark question bubble,
 * highlighted phrase, cited rows) reads as "an answer drawn from your
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
            <svg width="34" height="34" viewBox="0 0 32 32" style={{ marginRight: 2 }}><path d="M19.59 19.17Q20.35 19.66 20.67 20.24Q20.98 20.83 20.98 21.7Q20.98 23.15 20.15 24.55Q19.31 25.94 17.91 26.72Q16.51 27.5 14.93 27.5Q13.18 27.5 10.89 26.39Q11.22 24.22 11.22 22.76L11.18 22.23L12.05 22.24L12.47 22.23L12.45 22.83L12.43 23.64L12.47 24.71Q13.14 25.4 14.01 25.78Q14.88 26.16 15.75 26.16Q16.74 26.16 17.58 25.74Q18.41 25.33 18.84 24.63Q19.27 23.94 19.27 23.11Q19.27 22.23 18.74 21.62Q18.21 21.02 16.67 20.46Q12.86 19.08 12.31 18.79Q11.35 18.26 10.93 17.59Q10.52 16.92 10.52 16.05Q10.52 14.11 12.49 12.53Q11.82 12.07 11.48 11.4Q11.14 10.73 11.14 9.86Q11.14 7.82 12.82 6.16Q14.51 4.5 16.67 4.5Q17.98 4.5 20.23 5.13Q20.05 7.35 20.03 9.38L19.12 9.35L18.75 9.36Q18.85 8.32 18.85 7.15Q17.74 6.07 15.89 6.07Q14.47 6.07 13.59 6.86Q12.7 7.65 12.7 8.74Q12.7 9.43 13.07 9.99Q13.44 10.55 14.25 10.93Q15.05 11.31 18.03 12.21Q20.06 12.82 20.77 13.61Q21.48 14.41 21.48 15.68Q21.48 16.69 21.05 17.52Q20.63 18.34 19.59 19.17ZM13.32 12.96Q12.4 13.96 12.4 15Q12.4 15.55 12.63 15.94Q12.85 16.34 13.4 16.7Q13.96 17.06 15.84 17.67Q17.71 18.29 18.81 18.79Q19.59 17.58 19.59 16.64Q19.59 16.05 19.16 15.47Q18.73 14.89 17.73 14.49Z" fill="#b45e2c" /></svg>
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
            <span style={{ display: "flex" }}>Everything you wrote</span>
            <span style={{ display: "flex", alignItems: "baseline" }}>
              <span>is&nbsp;</span>
              <span style={{ display: "flex", flexDirection: "column", position: "relative" }}>
                <span
                  style={{
                    fontStyle: "italic",
                    fontWeight: 400,
                    color: "#7d3d1a",
                    lineHeight: 1,
                  }}
                >
                  still
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
            <span style={{ display: "flex" }}>here.</span>
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

            {/* Answer */}
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
