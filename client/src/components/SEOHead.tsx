import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  image?: string;
  structuredData?: object;
}

const SITE_NAME = "Question Grove 360";
const TAGLINE = "Every exam, one platform";
const BASE_URL = "https://questiongrove360.com";
const DEFAULT_IMAGE = `${BASE_URL}/manus-storage/Move2Canada_careviv_c5e00de2.png`;
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;

export function SEOHead({ title, description, path, type = "website", image, structuredData }: SEOProps) {
  const fullTitle = `${title} — ${SITE_NAME}, ${TAGLINE}`;
  const canonicalUrl = `${BASE_URL}${path}`;
  const ogImage = image || DEFAULT_OG_IMAGE;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to set/update meta tags
    const setMeta = (property: string, content: string, isName = false) => {
      const attr = isName ? "name" : "property";
      let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, property);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    // Meta description
    setMeta("description", description, true);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // Open Graph tags
    setMeta("og:title", fullTitle);
    setMeta("og:description", description);
    setMeta("og:url", canonicalUrl);
    setMeta("og:type", type);
    setMeta("og:image", ogImage);
    setMeta("og:site_name", SITE_NAME);

    // Twitter Card tags
    setMeta("twitter:card", "summary_large_image", true);
    setMeta("twitter:title", fullTitle, true);
    setMeta("twitter:description", description, true);
    setMeta("twitter:image", ogImage, true);

    // Structured data
    if (structuredData) {
      let script = document.querySelector('#structured-data') as HTMLScriptElement;
      if (!script) {
        script = document.createElement("script");
        script.id = "structured-data";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    return () => {
      // Cleanup structured data on unmount
      const script = document.querySelector('#structured-data');
      if (script) script.remove();
    };
  }, [fullTitle, description, canonicalUrl, type, ogImage, structuredData]);

  return null;
}

// Pre-built structured data helpers
export function examPrepStructuredData(examName: string, description: string, questionCount: number) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": `${examName} Preparation — ${SITE_NAME}`,
    "description": description,
    "provider": {
      "@type": "Organization",
      "name": SITE_NAME,
      "url": BASE_URL,
    },
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "online",
      "courseWorkload": `${questionCount} practice questions`,
    },
  };
}

export function websiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_NAME,
    "alternateName": "QG360",
    "url": BASE_URL,
    "description": "Your complete platform for medical and academic exam success.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${BASE_URL}/questions?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
