// shared utility functions used across multiple components

// approved platform categories
export const PLATFORMS = [
  'eBay',
  'Poshmark',
  'His Facebook Marketplace',
  'Her Facebook Marketplace'
];

// normalize messy platform strings into one of the approved values
export function normalizePlatform(raw) {
  if (typeof raw !== 'string') return '';
  const v = raw.trim();
  if (!v) return '';
  const clean = v.toLowerCase();

  // map known keywords into one of the approved values
  if (clean.includes('ebay')) return 'eBay';
  if (clean.includes('posh')) return 'Poshmark';
  if (clean.includes('facebook')) {
    // prefer his/her if specified, otherwise default to generic
    if (clean.includes('his')) return 'His Facebook Marketplace';
    if (clean.includes('her')) return 'Her Facebook Marketplace';
    // generic facebook marketplace
    return 'Her Facebook Marketplace';
  }

  // if nothing matched, return trimmed input so it can be examined later
  return v;
}

// normalize a value that may already be an array or a delimited string
// into a cleaned array of approved platform names (or freeform values).
export function normalizePlatforms(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(r => normalizePlatform(r))
      .filter(Boolean);
  }
  // if it's a string, split on commas/semicolons and map
  if (typeof raw === 'string') {
    return raw
      .split(/[;,]/)
      .map(s => normalizePlatform(s))
      .filter(Boolean);
  }
  // otherwise, ignore
  return [];
}

// helper for building a scan URL up to the current origin
export function makeQrUrl(id) {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/scan/${id}`;
}
