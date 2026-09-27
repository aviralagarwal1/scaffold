"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { ScaffoldMark } from "@/components/ui/ScaffoldMark";

// Idle sparkles drift around the glyph at staggered delays so the group
// breathes out of phase rather than blinking in unison.
const SPARKLES = [
  { top: "8%", right: "16%", fontSize: "10px", delay: "0s" },
  { top: "22%", left: "10%", fontSize: "8px", delay: "1.1s" },
  { bottom: "14%", right: "8%", fontSize: "9px", delay: "2.2s" },
  { bottom: "10%", left: "20%", fontSize: "7px", delay: "3.3s" },
  { top: "48%", right: "-2%", fontSize: "8px", delay: "1.7s" },
  { top: "38%", left: "-2%", fontSize: "6px", delay: "3.8s" },
];

// Eight evenly-spaced directions for the click burst.
const BURST_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * The § wordmark as an interactive CTA. Idle: gentle breathe, soft pulsing
 * glow, occasional sparkles around the glyph. Hover: brightens, faster
 * cadence. Click: radial sparkle burst, then navigates.
 *
 * There is no visible caption. The surrounding section already says what the
 * mark does, and a hover-only caption would have needed a separate touch
 * treatment. `label` is the link's accessible name, so it stays plain rather
 * than a tagline.
 *
 * The logged-in props let the same mark serve a returning user: it goes to
 * /account instead of /register, so it stops asking them to sign up for an
 * account they already have.
 */
export function LogoCTA({
  href,
  label,
  authenticatedHref,
  authenticatedLabel,
}: {
  href: string;
  label: string;
  authenticatedHref?: string;
  authenticatedLabel?: string;
}) {
  const [burstKey, setBurstKey] = useState(0);
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const finalHref = isAuthenticated && authenticatedHref ? authenticatedHref : href;
  const finalLabel = isAuthenticated && authenticatedLabel ? authenticatedLabel : label;

  return (
    <Link
      href={finalHref}
      onClick={() => setBurstKey((k) => k + 1)}
      aria-label={finalLabel}
      className="logo-cta"
    >
      <span aria-hidden="true" className="logo-cta-glow" />
      <ScaffoldMark className="logo-cta-mark" />

      {SPARKLES.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="logo-cta-sparkle"
          style={{
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
            fontSize: s.fontSize,
            animationDelay: s.delay,
          }}
        >
          ✦
        </span>
      ))}

      {burstKey > 0 && (
        <span key={burstKey} aria-hidden="true" className="logo-cta-burst">
          {BURST_DIRECTIONS.map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const x = Math.cos(rad) * 60;
            const y = Math.sin(rad) * 60;
            return (
              <span
                key={i}
                className="logo-cta-burst-particle"
                style={{ "--bx": `${x}px`, "--by": `${y}px` } as React.CSSProperties}
              >
                ✦
              </span>
            );
          })}
        </span>
      )}
    </Link>
  );
}
