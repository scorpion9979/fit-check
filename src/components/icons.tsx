/** Small stroke-icon set matching the reference design (lucide-style paths). */
import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={2.4} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconBidUp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="M12 3v18M7 8l5-5 5 5" />
  </svg>
);

export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={2.6} {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={2} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const IconSpark = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
  </svg>
);

export const IconUpload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const IconShield = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="M12 22c5-2 8-6 8-12V5l-8-3-8 3v5c0 6 3 10 8 12z" />
  </svg>
);

export const IconTabSource = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={1.9} {...p}>
    <rect x="4" y="3" width="16" height="18" rx="3" />
    <path d="M4 15l4-3 4 3 4-4 4 3" />
  </svg>
);

export const IconTabSell = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={1.9} {...p}>
    <path d="M12 15V5M8 9l4-4 4 4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const IconTabBids = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={1.9} {...p}>
    <path d="M4 19V5M4 8h11M4 13h7M18 4v10M15 7l3-3 3 3" />
  </svg>
);
