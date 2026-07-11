/** Inline SVG symbol library for garment tiles — referenced via <use href="#g-*" />. */
export default function Glyphs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="g-jacket" viewBox="0 0 100 120">
          <path
            d="M35 18 L50 26 L65 18 L86 34 L78 52 L70 46 L70 104 L30 104 L30 46 L22 52 L14 34 Z"
            fill="currentColor"
            opacity=".9"
          />
          <path
            d="M50 26 L50 104 M35 18 L44 40 M65 18 L56 40"
            stroke="rgba(255,255,255,.55)"
            strokeWidth="2.2"
            fill="none"
          />
          <rect x="41" y="60" width="7" height="16" rx="1.5" fill="rgba(255,255,255,.5)" />
        </symbol>
        <symbol id="g-denim" viewBox="0 0 100 120">
          <path
            d="M30 16 L70 16 L74 44 L66 108 L54 108 L50 60 L46 108 L34 108 L26 44 Z"
            fill="currentColor"
            opacity=".9"
          />
          <path
            d="M30 16 L70 16 M50 20 L50 58"
            stroke="rgba(255,255,255,.55)"
            strokeWidth="2.2"
            fill="none"
          />
          <rect
            x="33"
            y="24"
            width="12"
            height="9"
            rx="2"
            fill="none"
            stroke="rgba(255,255,255,.55)"
            strokeWidth="2"
          />
        </symbol>
        <symbol id="g-tee" viewBox="0 0 100 120">
          <path
            d="M38 24 L50 30 L62 24 L84 36 L76 54 L68 50 L68 100 L32 100 L32 50 L24 54 L16 36 Z"
            fill="currentColor"
            opacity=".9"
          />
          <path
            d="M38 24 Q50 40 62 24"
            stroke="rgba(255,255,255,.6)"
            strokeWidth="2.4"
            fill="none"
          />
        </symbol>
        <symbol id="g-dress" viewBox="0 0 100 120">
          <path
            d="M40 18 L50 24 L60 18 L68 40 L60 46 L74 104 L26 104 L40 46 L32 40 Z"
            fill="currentColor"
            opacity=".9"
          />
          <path d="M50 24 L50 100" stroke="rgba(255,255,255,.55)" strokeWidth="2" fill="none" />
        </symbol>
        <symbol id="g-knit" viewBox="0 0 100 120">
          <path
            d="M34 22 L50 28 L66 22 L84 36 L75 54 L68 49 L68 102 L32 102 L32 49 L25 54 L16 36 Z"
            fill="currentColor"
            opacity=".9"
          />
          <path
            d="M34 34 H66 M34 46 H66 M34 58 H66 M34 70 H66 M34 82 H66"
            stroke="rgba(255,255,255,.45)"
            strokeWidth="2"
            fill="none"
          />
        </symbol>
        <symbol id="g-cargo" viewBox="0 0 100 120">
          <path
            d="M32 16 L68 16 L72 44 L64 108 L54 108 L50 62 L46 108 L36 108 L28 44 Z"
            fill="currentColor"
            opacity=".9"
          />
          <rect
            x="30"
            y="60"
            width="14"
            height="18"
            rx="2"
            fill="none"
            stroke="rgba(255,255,255,.55)"
            strokeWidth="2"
          />
          <rect
            x="56"
            y="60"
            width="14"
            height="18"
            rx="2"
            fill="none"
            stroke="rgba(255,255,255,.55)"
            strokeWidth="2"
          />
        </symbol>
      </defs>
    </svg>
  );
}
