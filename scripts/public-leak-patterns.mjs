export const publicLeakPatterns = [
  /\/mnt\//i,
  /\/home\//i,
  /\/users\//i,
  /\/volumes\//i,
  /\b[a-z]:\/(?:users|mnt|home|onedrive|architekturkosmos)\//i,
  /file:\/\/\//i,
  /source-root/i,
  /private-library/i,
  /onedrive/i,
  /archiv\/architekturkosmos\/assets/i,
  /_overseer/i,
  /\.claude/i,
  /\.codex/i,
  /worker[-_\s]?logs?/i,
  /worker[-_\s]?outputs?/i,
  /\.pdf($|\?)/i,
  /archive-intake/i,
  /(?:raw[-_\s]?archive|archive[-_\s]?raw)/i,
  /(?:private|source)[-_\s]?scans?/i,
  /(?:ocr|scan)[-_\s]?transcripts?/i,
  /\bocr\b/i
];

export function publicLeakMatches(value) {
  const variants = publicLeakVariants(value);
  return publicLeakPatterns
    .filter((pattern) => variants.some((text) => pattern.test(text)))
    .map((pattern) => pattern.toString());
}

export function publicLeakVariants(value) {
  const variants = new Set([String(value)]);
  for (const text of [...variants]) {
    variants.add(decodeBasicHtmlEntities(text));
    variants.add(decodeUriComponentSafely(text));
    variants.add(text.replace(/\\/g, '/'));
  }
  for (const text of [...variants]) {
    variants.add(decodeBasicHtmlEntities(decodeUriComponentSafely(text)).replace(/\\/g, '/'));
  }
  return [...variants];
}

function decodeUriComponentSafely(value) {
  let decoded = String(value);
  for (let index = 0; index < 2; index += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return decoded;
      decoded = next;
    } catch {
      return decodePercentTriplets(decoded);
    }
  }
  return decoded;
}

function decodePercentTriplets(value) {
  return String(value).replace(/(?:%[0-9a-f]{2})+/gi, (segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
}

function decodeBasicHtmlEntities(value) {
  return String(value)
    .replace(/&sol;|&#47;|&#x2f;/gi, '/')
    .replace(/&bsol;|&#92;|&#x5c;/gi, '\\')
    .replace(/&#45;|&#x2d;/gi, '-')
    .replace(/&#46;|&#x2e;/gi, '.')
    .replace(/&amp;/gi, '&');
}
