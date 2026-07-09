import React from "react";
import Svg, { SvgProps, Path, Circle, Rect } from "react-native-svg";
import { useTheme } from "../context/ThemeContext";

export type IconProps = SvgProps & {
  color?: string;
  size?: number;
};

export const BaseIcon = ({ children, color, size = 20, ...props }: IconProps & { children: React.ReactNode }) => {
  const { theme } = useTheme();
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || theme.ink}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </Svg>
  );
};

export const IconTelescope = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="m11 15-3.5 6" />
    <Path d="M14 15v6" />
    <Path d="m3.6 9.5 15.5-4.2 1.5 3.6L5.1 13.1z" />
    <Path d="m2.6 12.9 3.5-1 1 3.6-3.5 1z" />
    <Circle cx="12" cy="18" r="0" />
  </BaseIcon>
);

export const IconTrend = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M3 17 9 11l4 4 8-8" />
    <Path d="M17 4h4v4" />
  </BaseIcon>
);

export const IconGrid = (p: IconProps) => (
  <BaseIcon {...p}>
    <Rect x="3" y="3" width="7" height="7" rx="1" />
    <Rect x="14" y="3" width="7" height="7" rx="1" />
    <Rect x="3" y="14" width="7" height="7" rx="1" />
    <Rect x="14" y="14" width="7" height="7" rx="1" />
  </BaseIcon>
);

export const IconFlame = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M12 3c1.5 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.8-2.6C9.4 9.6 10 8 9 6c2 .5 3 1.5 3 3 .8-1.4 1-3.5 0-6Z" />
  </BaseIcon>
);

export const IconSparkle = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <Path d="M12 8.5 13.2 11 15.5 12l-2.3 1L12 15.5 10.8 13 8.5 12l2.3-1z" />
  </BaseIcon>
);

export const IconBell = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </BaseIcon>
);

export const IconBookmark = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </BaseIcon>
);

export const IconArrowUp = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M12 19V5M6 11l6-6 6 6" />
  </BaseIcon>
);

export const IconExternal = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M15 3h6v6" />
    <Path d="M10 14 21 3" />
    <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </BaseIcon>
);

export const IconAlert = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <Path d="M12 9v4M12 17h.01" />
  </BaseIcon>
);

export const IconRefresh = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <Path d="M21 3v5h-5" />
    <Path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <Path d="M3 21v-5h5" />
  </BaseIcon>
);

export const IconSun = (p: IconProps) => (
  <BaseIcon {...p}>
    <Circle cx="12" cy="12" r="4" />
    <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </BaseIcon>
);

export const IconMoon = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </BaseIcon>
);

export const IconChevron = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="m6 9 6 6 6-6" />
  </BaseIcon>
);

export const IconPlus = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M12 5v14M5 12h14" />
  </BaseIcon>
);

export const IconSearch = (p: IconProps) => (
  <BaseIcon {...p}>
    <Circle cx="11" cy="11" r="7" />
    <Path d="m21 21-4.3-4.3" />
  </BaseIcon>
);

export const IconLibrary = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M4 5v14M9 5v14" />
    <Path d="M13 5.5 15 5l4 14-2 .5z" />
    <Path d="M4 19h16" />
  </BaseIcon>
);

export const IconGap = (p: IconProps) => (
  <BaseIcon {...p}>
    <Circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
    <Path d="M12 8v4l3 2" />
  </BaseIcon>
);

export const IconX = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M18 6 6 18M6 6l12 12" />
  </BaseIcon>
);

export const IconFilter = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M3 5h18M6 12h12M10 19h4" />
  </BaseIcon>
);

export const IconSort = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M7 4v16M7 20l-3-3M7 4l3 3" />
    <Path d="M17 20V4M17 4l3 3M17 20l-3-3" />
  </BaseIcon>
);

export const IconQuote = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M7 7H4v6h5V7l-2 4M18 7h-3v6h5V7l-2 4" />
  </BaseIcon>
);

export const IconArrowRight = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M5 12h14M12 5l7 7-7 7" />
  </BaseIcon>
);

export const IconArrowLeft = (p: IconProps) => (
  <BaseIcon {...p}>
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </BaseIcon>
);
