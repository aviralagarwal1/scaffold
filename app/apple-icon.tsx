import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple touch icon (iOS home screen). 180×180 PNG, generated at request time
 * by Next.js's ImageResponse → Satori pipeline.
 *
 * Same composition as the SVG favicon: bronze field + cream §. The small
 * rounded corners are rendered as a slight border-radius; iOS will mask its
 * own larger rounded square on top, but giving us a small rx prevents the
 * solid color from looking square-cut if iOS ever stops masking.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#7d3d1a",
          color: "#fbf3ec",
          fontSize: 130,
          fontFamily: "serif",
          borderRadius: 32,
          // Optical: the § sits slightly above the geometric center because of
          // its top-curl ornament. Nudging it downward 4px reads as centered.
          paddingBottom: 4,
        }}
      >
        §
      </div>
    ),
    { ...size },
  );
}
