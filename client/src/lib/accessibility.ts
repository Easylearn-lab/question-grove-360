/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 */

/**
 * Check color contrast ratio (WCAG 2.1)
 * Returns true if contrast ratio meets AA standards (4.5:1 for normal text, 3:1 for large text)
 */
export function checkContrastRatio(foreground: string, background: string, isLargeText = false): boolean {
  const fgLuminance = getRelativeLuminance(foreground);
  const bgLuminance = getRelativeLuminance(background);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  const contrastRatio = (lighter + 0.05) / (darker + 0.05);
  const minRatio = isLargeText ? 3 : 4.5;

  return contrastRatio >= minRatio;
}

/**
 * Calculate relative luminance for color contrast
 */
function getRelativeLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): number[] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

/**
 * Keyboard navigation helpers
 */
export const KeyboardKeys = {
  ENTER: "Enter",
  ESCAPE: "Escape",
  SPACE: " ",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
  PAGE_UP: "PageUp",
  PAGE_DOWN: "PageDown",
};

/**
 * Check if key is arrow key
 */
export function isArrowKey(key: string): boolean {
  return [
    KeyboardKeys.ARROW_UP,
    KeyboardKeys.ARROW_DOWN,
    KeyboardKeys.ARROW_LEFT,
    KeyboardKeys.ARROW_RIGHT,
  ].includes(key);
}

/**
 * ARIA labels for common patterns
 */
export const ariaLabels = {
  close: "Close dialog",
  menu: "Open menu",
  search: "Search",
  loading: "Loading",
  error: "Error",
  success: "Success",
  warning: "Warning",
  info: "Information",
  previous: "Previous page",
  next: "Next page",
  firstPage: "First page",
  lastPage: "Last page",
};

/**
 * Skip to main content link
 */
export function createSkipLink(): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = "#main-content";
  link.textContent = "Skip to main content";
  link.className = "sr-only focus:not-sr-only";
  return link;
}

/**
 * Screen reader only class
 * Add to Tailwind: .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
 */
export const srOnlyClass = "sr-only";

/**
 * Focus visible class for keyboard navigation
 */
export const focusVisibleClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite"): void {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement is read
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focus management utilities
 */
export function focusElement(element: HTMLElement | null): void {
  if (element) {
    element.focus();
    // For elements that don't naturally show focus
    element.classList.add("focus-visible");
  }
}

/**
 * Trap focus within a modal
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== KeyboardKeys.TAB) return;

  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * Accessible form validation
 */
export function setFieldError(field: HTMLElement, error: string): void {
  const errorId = `${field.id}-error`;
  const errorElement = document.getElementById(errorId) || document.createElement("div");

  errorElement.id = errorId;
  errorElement.className = "text-red-600 text-sm mt-1";
  errorElement.textContent = error;
  errorElement.setAttribute("role", "alert");

  if (!document.getElementById(errorId)) {
    field.parentElement?.appendChild(errorElement);
  }

  field.setAttribute("aria-invalid", "true");
  field.setAttribute("aria-describedby", errorId);
}

/**
 * Clear field error
 */
export function clearFieldError(field: HTMLElement): void {
  const errorId = `${field.id}-error`;
  const errorElement = document.getElementById(errorId);

  if (errorElement) {
    errorElement.remove();
  }

  field.setAttribute("aria-invalid", "false");
  field.removeAttribute("aria-describedby");
}

/**
 * Accessible tooltip
 */
export function createAccessibleTooltip(trigger: HTMLElement, content: string): void {
  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  const tooltip = document.createElement("div");
  tooltip.id = tooltipId;
  tooltip.className = "absolute bg-gray-900 text-white px-3 py-2 rounded text-sm";
  tooltip.textContent = content;
  tooltip.setAttribute("role", "tooltip");

  trigger.setAttribute("aria-describedby", tooltipId);
  trigger.parentElement?.appendChild(tooltip);

  // Show on hover/focus
  trigger.addEventListener("mouseenter", () => {
    tooltip.style.display = "block";
  });

  trigger.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
  });

  trigger.addEventListener("focus", () => {
    tooltip.style.display = "block";
  });

  trigger.addEventListener("blur", () => {
    tooltip.style.display = "none";
  });
}
