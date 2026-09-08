import { useId } from "react";

export type MascotPose = "idle" | "flying" | "crashed";

interface ChickenMascotProps {
  pose?: MascotPose;
  className?: string;
  title?: string;
}

/**
 * Hand-drawn flat-vector chicken pilot mascot. Inline SVG (no external image
 * request, nothing to 404) so it always renders, at any size, in both themes.
 * Gradient ids are namespaced with useId() so multiple instances on one page
 * (header mark + hero + in-game marker) never collide.
 */
export function ChickenMascot({ pose = "idle", className, title }: ChickenMascotProps) {
  const uid = useId();
  const bodyGrad = `${uid}-body`;
  const combGrad = `${uid}-comb`;
  const scarfGrad = `${uid}-scarf`;
  const tilt = pose === "flying" ? -8 : pose === "crashed" ? 14 : -2;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe39b" />
          <stop offset="100%" stopColor="#f3a832" />
        </linearGradient>
        <linearGradient id={combGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f68a72" />
          <stop offset="100%" stopColor="#df6457" />
        </linearGradient>
        <linearGradient id={scarfGrad} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e4685a" />
          <stop offset="100%" stopColor="#c94f43" />
        </linearGradient>
      </defs>

      <g transform={`rotate(${tilt} 100 108)`}>
        {/* trailing scarf */}
        <path
          d="M56 118 C34 112 18 122 10 140 C24 132 36 132 46 138 C34 138 24 146 20 158 C34 150 46 148 56 152 Z"
          fill={`url(#${scarfGrad})`}
        />

        {/* tail feathers */}
        <path d="M132 100 C158 84 172 60 168 34 C154 56 140 70 122 82 Z" fill="#df6457" opacity="0.9" />
        <path d="M126 112 C154 104 172 86 174 60 C156 78 140 88 120 96 Z" fill="#f6b73c" />

        {/* back wing */}
        <path
          d={pose === "flying" ? "M118 96 C140 78 148 52 138 28 C126 50 112 66 96 76 Z" : "M120 108 C140 100 150 84 146 66 C132 78 118 88 104 92 Z"}
          fill={`url(#${bodyGrad})`}
        />

        {/* body */}
        <ellipse cx="98" cy="112" rx="52" ry="46" fill={`url(#${bodyGrad})`} />
        {/* belly patch */}
        <ellipse cx="92" cy="128" rx="30" ry="22" fill="#fff3d6" opacity="0.55" />

        {/* legs */}
        {pose !== "flying" && (
          <g stroke="#d98b2b" strokeWidth="5" strokeLinecap="round">
            <path d="M84 154 L80 172" />
            <path d="M108 154 L114 172" />
          </g>
        )}

        {/* head */}
        <circle cx="90" cy="66" r="34" fill={`url(#${bodyGrad})`} />

        {/* comb */}
        <path
          d="M70 38 C68 26 76 18 82 22 C82 14 92 10 96 18 C100 10 110 12 108 22 C116 18 122 28 116 36 C110 32 100 32 92 36 C84 32 76 34 70 38 Z"
          fill={`url(#${combGrad})`}
        />
        {/* wattle */}
        <path d="M78 84 C76 92 80 98 86 96 C88 90 86 84 82 82 Z" fill="#df6457" />

        {/* beak */}
        <path d="M60 68 L40 64 L60 58 Z" fill="#f5a94e" />

        {/* aviator goggles */}
        <g>
          <rect x="52" y="52" width="46" height="24" rx="12" fill="#241703" opacity="0.9" />
          {pose === "crashed" ? (
            <g stroke="#ffe5a1" strokeWidth="3" strokeLinecap="round">
              <path d="M60 58 L72 70 M72 58 L60 70" />
              <path d="M80 58 L92 70 M92 58 L80 70" />
            </g>
          ) : (
            <>
              <circle cx="66" cy="64" r="10" fill="#bfe7ff" />
              <circle cx="86" cy="64" r="10" fill="#bfe7ff" />
              <circle cx="63" cy="61" r="3" fill="#fff" opacity="0.8" />
              <circle cx="83" cy="61" r="3" fill="#fff" opacity="0.8" />
            </>
          )}
        </g>
      </g>
    </svg>
  );
}

/** Compact head-only mark for tight spaces (header brand, favicon-style use). */
export function ChickenMark({ className }: { className?: string }) {
  const uid = useId();
  const bodyGrad = `${uid}-mark-body`;
  const combGrad = `${uid}-mark-comb`;

  return (
    <svg viewBox="0 0 64 64" className={className} role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe39b" />
          <stop offset="100%" stopColor="#f3a832" />
        </linearGradient>
        <linearGradient id={combGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f68a72" />
          <stop offset="100%" stopColor="#df6457" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="36" r="22" fill={`url(#${bodyGrad})`} />
      <path
        d="M20 16 C18 8 26 3 31 8 C32 1 42 1 42 9 C48 5 54 12 49 19 C43 15 35 15 28 18 C24 16 22 16 20 16 Z"
        fill={`url(#${combGrad})`}
      />
      <path d="M14 38 L2 34 L14 28 Z" fill="#f5a94e" />
      <rect x="16" y="26" width="32" height="16" rx="8" fill="#241703" />
      <circle cx="24" cy="34" r="6.5" fill="#bfe7ff" />
      <circle cx="40" cy="34" r="6.5" fill="#bfe7ff" />
    </svg>
  );
}
