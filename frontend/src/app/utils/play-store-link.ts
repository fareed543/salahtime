import { environment } from 'src/environments/environment';

/**
 * CR-014: Play Store link with an install referrer, so Play Console (Acquisition reports) shows
 * installs that came from the website and from which section.
 *   medium   – where the link sits: 'banner' (bottom bar), 'header' (Play icon) or 'home'
 *              (NF-020 website home page cards)
 *   path     – the current router URL; its first segment becomes the campaign (home for '/')
 */
export function playStoreLink(medium: 'banner' | 'header' | 'home', path: string): string {
  const referrer = `utm_source=website&utm_medium=${medium}&utm_campaign=${siteSection(path)}`;
  return `${environment.playStoreUrl}&referrer=${encodeURIComponent(referrer)}`;
}

/** First URL segment, lower-case letters, digits and dashes only; 'home' for the home page. */
export function siteSection(path: string): string {
  const first = (path || '').split(/[?#]/)[0].split('/').filter(Boolean)[0] ?? '';
  return first.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'home';
}
