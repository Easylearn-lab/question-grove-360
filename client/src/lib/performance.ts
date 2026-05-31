/**
 * Performance optimization utilities
 */

/**
 * Lazy load images with Intersection Observer
 */
export function lazyLoadImages(): void {
  if (!("IntersectionObserver" in window)) {
    // Fallback for browsers that don't support IntersectionObserver
    const images = document.querySelectorAll("img[data-src]");
    images.forEach((img) => {
      (img as HTMLImageElement).src = (img as HTMLImageElement).dataset.src || "";
    });
    return;
  }

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || "";
        img.removeAttribute("data-src");
        observer.unobserve(img);
      }
    });
  });

  document.querySelectorAll("img[data-src]").forEach((img) => {
    imageObserver.observe(img);
  });
}

/**
 * Debounce function for performance-critical operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for high-frequency events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request idle callback polyfill
 */
export function requestIdleCallback(callback: () => void, options?: { timeout?: number }): number {
  if ("requestIdleCallback" in window) {
    return (window as any).requestIdleCallback(callback, options);
  }

  const start = Date.now();
  return setTimeout(() => {
    callback();
  }, 1) as unknown as number;
}

/**
 * Measure performance
 */
export function measurePerformance(label: string): () => void {
  const start = performance.now();

  return () => {
    const end = performance.now();
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  };
}

/**
 * Prefetch resources
 */
export function prefetchResource(url: string, type: "link" | "script" = "link"): void {
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  if (type === "script") {
    link.as = "script";
  }
  document.head.appendChild(link);
}

/**
 * Preload resources
 */
export function preloadResource(url: string, type: string): void {
  const link = document.createElement("link");
  link.rel = "preload";
  link.href = url;
  link.as = type;
  document.head.appendChild(link);
}

/**
 * Code splitting helper
 */
export async function dynamicImport<T>(importFunc: () => Promise<T>): Promise<T> {
  try {
    return await importFunc();
  } catch (error) {
    console.error("Failed to load dynamic module:", error);
    throw error;
  }
}

/**
 * Memory leak detection
 */
export function detectMemoryLeaks(): void {
  if (!("memory" in performance)) {
    console.warn("Memory API not available in this browser");
    return;
  }

  const memory = (performance as any).memory;
  const usedMemory = memory.usedJSHeapSize / 1048576; // Convert to MB
  const totalMemory = memory.totalJSHeapSize / 1048576;
  const limit = memory.jsHeapSizeLimit / 1048576;

  console.log(`Memory Usage: ${usedMemory.toFixed(2)}MB / ${totalMemory.toFixed(2)}MB (Limit: ${limit.toFixed(2)}MB)`);

  if (usedMemory > limit * 0.9) {
    console.warn("Memory usage is near the limit!");
  }
}

/**
 * Network information API
 */
export function getNetworkInfo(): { effectiveType: string; downlink: number; rtt: number } | null {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  if (!connection) {
    return null;
  }

  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
  };
}

/**
 * Adaptive loading based on network
 */
export function shouldLoadHighQuality(): boolean {
  const info = getNetworkInfo();

  if (!info) {
    return true; // Assume high quality if no info
  }

  return info.effectiveType === "4g" && info.rtt < 100;
}

/**
 * Web Vitals tracking
 */
export function trackWebVitals(): void {
  // Largest Contentful Paint (LCP)
  if ("PerformanceObserver" in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log("[Web Vitals] LCP:", lastEntry.startTime);
      });

      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (error) {
      console.warn("LCP tracking not supported");
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            console.log("[Web Vitals] CLS:", clsValue);
          }
        }
      });

      clsObserver.observe({ entryTypes: ["layout-shift"] });
    } catch (error) {
      console.warn("CLS tracking not supported");
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log("[Web Vitals] FID:", (entry as any).processingDuration);
        });
      });

      fidObserver.observe({ entryTypes: ["first-input"] });
    } catch (error) {
      console.warn("FID tracking not supported");
    }
  }
}

/**
 * Cache management
 */
export const cache = {
  set: (key: string, value: any, ttl: number = 3600000): void => {
    const item = {
      value,
      expiry: Date.now() + ttl,
    };
    localStorage.setItem(key, JSON.stringify(item));
  },

  get: (key: string): any => {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const { value, expiry } = JSON.parse(item);
    if (Date.now() > expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return value;
  },

  remove: (key: string): void => {
    localStorage.removeItem(key);
  },

  clear: (): void => {
    localStorage.clear();
  },
};
