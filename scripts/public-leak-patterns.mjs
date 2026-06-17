export const publicLeakPatterns = [
  /\/mnt\//i,
  /\/home\//i,
  /source-root/i,
  /private-library/i,
  /onedrive/i,
  /archiv\/architekturkosmos\/assets/i,
  /_overseer/i,
  /\.claude/i,
  /\.codex/i,
  /worker[-_\s]?logs?/i,
  /\.pdf($|\?)/i,
  /archive-intake/i,
  /\bocr\b/i
];

export function publicLeakMatches(value) {
  const text = String(value);
  return publicLeakPatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.toString());
}
