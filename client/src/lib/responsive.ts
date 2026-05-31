/**
 * Responsive design utilities for mobile-first approach
 */

export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  "2xl": `@media (min-width: ${breakpoints["2xl"]}px)`,
};

/**
 * Responsive font sizes
 */
export const responsiveFontSizes = {
  h1: {
    mobile: "1.875rem", // 30px
    tablet: "2.25rem", // 36px
    desktop: "3rem", // 48px
  },
  h2: {
    mobile: "1.5rem", // 24px
    tablet: "1.875rem", // 30px
    desktop: "2.25rem", // 36px
  },
  h3: {
    mobile: "1.25rem", // 20px
    tablet: "1.5rem", // 24px
    desktop: "1.875rem", // 30px
  },
  body: {
    mobile: "0.875rem", // 14px
    tablet: "1rem", // 16px
    desktop: "1rem", // 16px
  },
};

/**
 * Responsive spacing
 */
export const responsiveSpacing = {
  xs: {
    mobile: "0.25rem",
    tablet: "0.5rem",
    desktop: "0.5rem",
  },
  sm: {
    mobile: "0.5rem",
    tablet: "0.75rem",
    desktop: "1rem",
  },
  md: {
    mobile: "1rem",
    tablet: "1.5rem",
    desktop: "2rem",
  },
  lg: {
    mobile: "1.5rem",
    tablet: "2rem",
    desktop: "3rem",
  },
  xl: {
    mobile: "2rem",
    tablet: "3rem",
    desktop: "4rem",
  },
};

/**
 * Get responsive class names for Tailwind
 */
export function getResponsiveClasses(base: string, sm: string, md: string, lg: string): string {
  return `${base} sm:${sm} md:${md} lg:${lg}`;
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < breakpoints.md;
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= breakpoints.md && window.innerWidth < breakpoints.lg;
}

/**
 * Check if device is desktop
 */
export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= breakpoints.lg;
}

/**
 * Get current breakpoint
 */
export function getCurrentBreakpoint(): keyof typeof breakpoints {
  if (typeof window === "undefined") return "md";

  const width = window.innerWidth;
  if (width < breakpoints.sm) return "xs";
  if (width < breakpoints.md) return "sm";
  if (width < breakpoints.lg) return "md";
  if (width < breakpoints.xl) return "lg";
  if (width < breakpoints["2xl"]) return "xl";
  return "2xl";
}

/**
 * Responsive container widths
 */
export const containerWidths = {
  xs: "100%",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

/**
 * Touch-friendly button sizes
 */
export const touchFriendlySizes = {
  small: "32px", // 32x32 minimum
  medium: "44px", // 44x44 minimum (iOS recommendation)
  large: "56px", // 56x56 minimum
};
