import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple touch icon (iOS home screen). 180×180 PNG, generated at request time
 * by Next.js's ImageResponse → Satori pipeline.
 *
 * Same composition as the SVG favicon: bronze field + cream section mark,
 * drawn as an outlined path so Satori never has to resolve a serif font. The small
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
          borderRadius: 32,
        }}
      >
        <svg width="136" height="136" viewBox="0 0 32 32">
          <path d="M19.59 19.17Q20.35 19.66 20.67 20.24Q20.98 20.83 20.98 21.7Q20.98 23.15 20.15 24.55Q19.31 25.94 17.91 26.72Q16.51 27.5 14.93 27.5Q13.18 27.5 10.89 26.39Q11.22 24.22 11.22 22.76L11.18 22.23L12.05 22.24L12.47 22.23L12.45 22.83L12.43 23.64L12.47 24.71Q13.14 25.4 14.01 25.78Q14.88 26.16 15.75 26.16Q16.74 26.16 17.58 25.74Q18.41 25.33 18.84 24.63Q19.27 23.94 19.27 23.11Q19.27 22.23 18.74 21.62Q18.21 21.02 16.67 20.46Q12.86 19.08 12.31 18.79Q11.35 18.26 10.93 17.59Q10.52 16.92 10.52 16.05Q10.52 14.11 12.49 12.53Q11.82 12.07 11.48 11.4Q11.14 10.73 11.14 9.86Q11.14 7.82 12.82 6.16Q14.51 4.5 16.67 4.5Q17.98 4.5 20.23 5.13Q20.05 7.35 20.03 9.38L19.12 9.35L18.75 9.36Q18.85 8.32 18.85 7.15Q17.74 6.07 15.89 6.07Q14.47 6.07 13.59 6.86Q12.7 7.65 12.7 8.74Q12.7 9.43 13.07 9.99Q13.44 10.55 14.25 10.93Q15.05 11.31 18.03 12.21Q20.06 12.82 20.77 13.61Q21.48 14.41 21.48 15.68Q21.48 16.69 21.05 17.52Q20.63 18.34 19.59 19.17ZM13.32 12.96Q12.4 13.96 12.4 15Q12.4 15.55 12.63 15.94Q12.85 16.34 13.4 16.7Q13.96 17.06 15.84 17.67Q17.71 18.29 18.81 18.79Q19.59 17.58 19.59 16.64Q19.59 16.05 19.16 15.47Q18.73 14.89 17.73 14.49Z" fill="#fbf3ec" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
