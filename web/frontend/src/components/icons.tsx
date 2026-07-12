import type { SVGProps } from "react";

/** Consistent 20px stroke icon set (single source, no mixed libraries). */
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconTelescope = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m11 15-3.5 6" />
    <path d="M14 15v6" />
    <path d="m3.6 9.5 15.5-4.2 1.5 3.6L5.1 13.1z" />
    <path d="m2.6 12.9 3.5-1 1 3.6-3.5 1z" />
    <circle cx="12" cy="18" r="0" />
  </svg>
);

export const IconTrend = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 17 9 11l4 4 8-8" />
    <path d="M17 4h4v4" />
  </svg>
);

export const IconGrid = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const IconFlame = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3c1.5 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.8-2.6C9.4 9.6 10 8 9 6c2 .5 3 1.5 3 3 .8-1.4 1-3.5 0-6Z" />
  </svg>
);

export const IconSparkle = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8.5 13.2 11 15.5 12l-2.3 1L12 15.5 10.8 13 8.5 12l2.3-1z" />
  </svg>
);

export const IconBell = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

export const IconBookmark = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const IconArrowUp = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

export const IconExternal = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

export const IconMap = (p: IconProps) => (
  <svg {...base} {...p}>
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
);

export const IconAlert = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const IconEdit = (p: IconProps) => (
  <svg {...base} viewBox="0 0 512 512" strokeWidth={32} {...p}>
    <path d="M384 224v184a40 40 0 01-40 40H104a40 40 0 01-40-40V168a40 40 0 0140-40h167.48" />
    <path d="M459.94 53.25a16.06 16.06 0 00-23.22-.56L424.35 65a8 8 0 000 11.31l11.34 11.32a8 8 0 0011.34 0l12.06-12c6.1-6.09 6.67-16.01.85-22.38zM399.34 90L218.82 270.2a9 9 0 00-2.31 3.93L208.16 299a3.91 3.91 0 004.86 4.86l24.85-8.35a9 9 0 003.93-2.31L422 112.66a9 9 0 000-12.66l-9.95-10a9 9 0 00-12.71 0z" />
  </svg>
);

export const IconTrash = (p: IconProps) => (
  <svg {...base} viewBox="0 0 512 512" strokeWidth={32} {...p}>
    <path d="M112 112l20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320" />
    <path d="M80 112h352" />
    <path d="M192 112V72h0a23.93 23.93 0 0124-24h80a23.93 23.93 0 0124 24h0v40" />
    <path d="M256 176v224M184 176l8 224M328 176l-8 224" />
  </svg>
);

export const IconRefresh = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export const IconSun = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconMoon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

export const IconChevron = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconPlus = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconSearch = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const IconLibrary = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 5v14M9 5v14" />
    <path d="M13 5.5 15 5l4 14-2 .5z" />
    <path d="M4 19h16" />
  </svg>
);

export const IconGap = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
    <path d="M12 8v4l3 2" />
  </svg>
);

export const IconX = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconFilter = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 5h18M6 12h12M10 19h4" />
  </svg>
);

export const IconSort = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M7 4v16M7 20l-3-3M7 4l3 3" />
    <path d="M17 20V4M17 4l3 3M17 20l-3-3" />
  </svg>
);

export const IconQuote = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M7 7H4v6h5V7l-2 4M18 7h-3v6h5V7l-2 4" />
  </svg>
);

export const IconUser = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
