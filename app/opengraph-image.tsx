import { ImageResponse } from "next/og";
import { SCAFFOLD_MARK_PATH } from "@/components/ui/ScaffoldMark";
import {
  HERO_HEADLINE_ACCENT,
  HERO_HEADLINE_LEAD,
  HERO_HEADLINE_REST,
  PRODUCT_NAME,
  PRODUCT_PROMISE,
} from "@/lib/copy";
import {
  SAMPLE_ANSWER_FOLLOW,
  SAMPLE_ANSWER_LEAD,
  SAMPLE_ANSWER_WHEN,
  SAMPLE_CITATION_LABEL,
  SAMPLE_CITED_POSTS,
  SAMPLE_PUBLICATION,
  SAMPLE_QUESTION,
  SAMPLE_SECTION_LABEL,
} from "@/lib/sample-preview";

export const alt = `${PRODUCT_NAME} — ${PRODUCT_PROMISE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social share image (Open Graph / Twitter / LinkedIn / Slack unfurls).
 *
 * Layout only. The headline, mark, question, answer and cited posts come
 * from the same modules as the landing page. This renderer supports flexbox
 * and absolute positioning, not the page's CSS, so the card is a condensed
 * drawing of that content: no excerpts, no follow-ups, image-specific type sizes.
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
          padding: "56px 72px",
          fontFamily: "serif",
          color: "#22201d",
          position: "relative",
        }}
      >
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 30,
              letterSpacing: "-0.012em",
              color: "#141311",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 32 32">
              <path d={SCAFFOLD_MARK_PATH} fill="#b45e2c" />
            </svg>
            <span>{PRODUCT_NAME}</span>
          </div>

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
            <span style={{ display: "flex" }}>{HERO_HEADLINE_LEAD}</span>
            <span style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ display: "flex", flexDirection: "column", position: "relative" }}>
                <span
                  style={{
                    fontStyle: "italic",
                    fontWeight: 400,
                    color: "#7d3d1a",
                    lineHeight: 1,
                  }}
                >
                  {HERO_HEADLINE_ACCENT}
                </span>
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
              <span>&nbsp;{HERO_HEADLINE_REST}</span>
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 460,
            borderRadius: 14,
            border: "1px solid #e3e0d4",
            background: "#ffffff",
            boxShadow: "0 8px 30px rgba(20, 18, 15, 0.08)",
            overflow: "hidden",
            position: "relative",
          }}
        >
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
                {SAMPLE_PUBLICATION}
              </span>
            </div>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: "#a39d8a",
                textTransform: "uppercase",
              }}
            >
              {SAMPLE_SECTION_LABEL}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px 18px 18px" }}>
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
                {SAMPLE_QUESTION}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 32 32">
                  <path d={SCAFFOLD_MARK_PATH} fill="#c87a48" />
                </svg>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    color: "#7d3d1a",
                    textTransform: "uppercase",
                  }}
                >
                  {PRODUCT_NAME}
                </span>
                <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 11, color: "#a39d8a" }}>
                  {SAMPLE_ANSWER_WHEN}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: "#22201d",
                }}
              >
                <span>{SAMPLE_ANSWER_LEAD.before.trimEnd()}&nbsp;</span>
                <span
                  style={{
                    background: "#f4e1d2",
                    color: "#141311",
                    padding: "0 4px",
                    borderRadius: 3,
                  }}
                >
                  {SAMPLE_ANSWER_LEAD.highlight}
                </span>
                <span>&nbsp;{SAMPLE_ANSWER_LEAD.after.trimStart()}.</span>
              </div>
              <span style={{ fontSize: 15, lineHeight: 1.45, color: "#22201d" }}>{SAMPLE_ANSWER_FOLLOW}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: "#a39d8a",
                  textTransform: "uppercase",
                }}
              >
                {SAMPLE_CITATION_LABEL}
              </span>
              {SAMPLE_CITED_POSTS.map((post, i) => (
                <CitationRow
                  key={post.title}
                  num={String(i + 1).padStart(2, "0")}
                  date={post.date}
                  title={post.title}
                />
              ))}
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
        padding: "7px 10px",
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
      <span style={{ fontSize: 14, color: "#141311" }}>{title}</span>
    </div>
  );
}
