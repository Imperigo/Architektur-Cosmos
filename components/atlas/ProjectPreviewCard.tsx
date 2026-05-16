import { ProjectMediaGrid } from '@/components/atlas/ProjectMediaGrid';
import type { Entry } from '@/lib/types';

type ProjectPreviewCardProps = {
  entry: Entry;
  x: number;
  y: number;
};

export function ProjectPreviewCard({ entry, x, y }: ProjectPreviewCardProps) {
  return (
    <g>
      <rect x={x} y={y} width="238" height="148" fill="#050505" stroke="#f7f7f4" strokeWidth="1" opacity="0.96" />
      <ProjectMediaGrid media={entry.media} x={x + 10} y={y + 10} slotWidth={48} slotHeight={36} gap={7} />
      <text x={x + 126} y={y + 24} fill="#f7f7f4" fontSize="15" fontWeight="700" fontFamily="var(--font-sans), system-ui, sans-serif">
        {entry.title}
      </text>
      <text x={x + 126} y={y + 43} fill="#b8b8b8" fontSize="9" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
        {formatYear(entry.year_start)}
      </text>
      <WrappedText text={entry.one_sentence} x={x + 126} y={y + 63} maxChars={34} lineHeight={13} maxLines={5} />
    </g>
  );
}

function WrappedText({ text, x, y, maxChars, lineHeight, maxLines }: { text: string; x: number; y: number; maxChars: number; lineHeight: number; maxLines: number }) {
  const lines = wrapText(text, maxChars).slice(0, maxLines);

  return (
    <text fill="#f7f7f4" fontSize="10" fontFamily="var(--font-sans), system-ui, sans-serif">
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} y={y + index * lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
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
