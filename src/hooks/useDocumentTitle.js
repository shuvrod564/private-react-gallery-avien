import { useEffect } from 'react';

/**
 * Set the document title + SEO meta (description, canonical, OG, Twitter).
 * Works for every public route (spec §40).
 */
export function useDocumentTitle(title, { description, canonicalPath, image } = {}) {
  useEffect(() => {
    const full = title ? `${title} · Personal Gallery` : 'Personal Gallery';
    document.title = full;

    const setMeta = (attr, key, value) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    if (description) setMeta('name', 'description', description);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', description || '');
    if (image) setMeta('property', 'og:image', image);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', full);
    setMeta('name', 'twitter:description', description || '');
    if (image) setMeta('name', 'twitter:image', image);

    if (canonicalPath) {
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = `${window.location.origin}${canonicalPath}`;
    }
  }, [title, description, canonicalPath, image]);
}
