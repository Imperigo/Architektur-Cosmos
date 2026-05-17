import { ProjectMediaGrid } from '@/components/atlas/ProjectMediaGrid';
import type { Entry } from '@/lib/types';

type ProjectDetailCardProps = {
  entry: Entry;
  x: number;
  y: number;
};

export function ProjectDetailCard({ entry, x, y }: ProjectDetailCardProps) {
  const location = [entry.city, entry.country].filter(Boolean).join(', ');

  return (
    <g>
      <rect x={x} y={y} width="352" height="292" fill="#050505" stroke="#f7f7f4" strokeWidth="1.1" opacity="0.97" />
      <text x={x + 16} y={y + 27} fill="#b8b8b8" fontSize="9" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.2em">
        PROJECT DOSSIER
      </text>
      <text x={x + 16} y={y + 54} fill="#f7f7f4" fontSize="22" fontWeight="700" fontFamily="var(--font-sans), system-ui, sans-serif">
        {entry.title}
      </text>
      <text x={x + 16} y={y + 74} fill="#b8b8b8" fontSize="10" fontFamily="var(--font-sans), system-ui, sans-serif">
        {formatYear(entry.year_start)}{location ? ` · ${location}` : ''}
      </text>
      <ProjectMediaGrid media={entry.media} x={x + 16} y={y + 92} slotWidth={72} slotHeight={50} gap={9} showLabels />
      <WrappedText text={entry.full_description} x={x + 184} y={y + 101} maxChars={31} lineHeight={12} maxLines={13} />
    </g>
  );
}

function WrappedText({ text, x, y, maxChars, lineHeight, maxLines }: { text: string; x: number; y: number; maxChars: number; lineHeight: number; maxLines: number }) {
  const wrappedLines = wrapText(text, maxChars);
  const lines = ellipsizeLines(wrappedLines, maxLines, maxChars);

  return (
    <text fill="#f7f7f4" fontSize="9.5" fontFamily="var(--font-sans), system-ui, sans-serif">
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} y={y + index * lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function ellipsizeLines(lines: string[], maxLines: number, maxChars: number) {
  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  const last = visible[visible.length - 1] ?? '';
  visible[visible.length - 1] = `${last.replace(/[,.:\s]+$/, '').slice(0, Math.max(0, maxChars - 3))}...`;
  return visible;
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} v. Chr.` : `${year}`;
}
