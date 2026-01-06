import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  structuredData?: object;
}

/**
 * SEO Component for managing page meta tags
 * Updates document head on mount and cleans up on unmount
 */
export function SEO({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage = 'https://assetmx.com.au/og-image.png',
  ogType = 'website',
  structuredData,
}: SEOProps) {
  useEffect(() => {
    // Update title
    const fullTitle = title.includes('AssetMX') ? title : `${title} | AssetMX`;
    document.title = fullTitle;

    // Helper to update or create meta tag
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update meta tags
    updateMeta('description', description);
    if (keywords) updateMeta('keywords', keywords);
    updateMeta('title', fullTitle);

    // Open Graph
    updateMeta('og:title', fullTitle, true);
    updateMeta('og:description', description, true);
    updateMeta('og:type', ogType, true);
    updateMeta('og:image', ogImage, true);
    if (canonicalUrl) {
      updateMeta('og:url', canonicalUrl, true);
    }

    // Twitter
    updateMeta('twitter:title', fullTitle, true);
    updateMeta('twitter:description', description, true);
    updateMeta('twitter:image', ogImage, true);

    // Update canonical link
    if (canonicalUrl) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', canonicalUrl);
    }

    // Add structured data if provided
    let jsonLdScript: HTMLScriptElement | null = null;
    if (structuredData) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.id = 'page-structured-data';
      jsonLdScript.textContent = JSON.stringify(structuredData);

      // Remove existing page-specific structured data
      const existing = document.getElementById('page-structured-data');
      if (existing) existing.remove();

      document.head.appendChild(jsonLdScript);
    }

    // Cleanup function
    return () => {
      if (jsonLdScript) {
        jsonLdScript.remove();
      }
    };
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, structuredData]);

  return null;
}
