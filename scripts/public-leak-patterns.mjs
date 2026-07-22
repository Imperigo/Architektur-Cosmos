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
  /worker[-_\s]?outputs?/i,
  /\.pdf($|\?)/i,
  /archive-intake/i,
  /(?:raw[-_\s]?archive|archive[-_\s]?raw)/i,
  /(?:private|source)[-_\s]?scans?/i,
  /(?:ocr|scan)[-_\s]?transcripts?/i,
  /\bocr\b/i
];

export function publicLeakMatches(value) {
  const text = String(value);
  return publicLeakPatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.toString());
}
