import { ProjectMediaGrid } from '@/components/atlas/ProjectMediaGrid';
import type { Entry } from '@/lib/types';

type ProjectPreviewCardProps = {
  entry: Entry;
  x: number;
  y: number;
  width?: number;
};

export function ProjectPreviewCard({ entry, x, y, width = 260 }: ProjectPreviewCardProps) {
  const mediaWidth = 104;
  const textX = x + mediaWidth + 24;
  const textWidth = width - mediaWidth - 38;
  const titleLines = wrapText(entry.title, Math.max(16, Math.floor(textWidth / 7.2))).slice(0, 2);
  const themeTags = entry.themes.slice(0, 4);

  return (
    <g className="project-preview-card">
      <rect x={x} y={y} width={width} height="148" fill="#050505" stroke="#f7f7f4" strokeWidth="1" opacity="0.96" />
      <path d={`M ${x} ${y + 148} L ${x + width} ${y + 148}`} stroke="#f7f7f4" strokeWidth="0.7" opacity="0.4" />
      <ProjectMediaGrid media={entry.media} x={x + 10} y={y + 10} slotWidth={48} slotHeight={36} gap={7} />
      <text fill="#f7f7f4" fontSize="13.2" fontWeight="700" fontFamily="var(--font-sans), system-ui, sans-serif">
        {titleLines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={textX} y={y + 22 + index * 15}>
            {line}
          </tspan>
        ))}
      </text>
      <text x={textX} y={y + 47 + (titleLines.length - 1) * 8} fill="#b8b8b8" fontSize="8.5" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
        {formatYear(entry.year_start)}
      </text>
      <WrappedText text={entry.one_sentence} x={textX} y={y + 65 + (titleLines.length - 1) * 8} maxChars={Math.max(24, Math.floor(textWidth / 5.6))} lineHeight={12} maxLines={5} />
      <g transform={`translate(${textX} ${y + 120})`}>
        {themeTags.map((theme, index) => {
          const chipX = index * 43;
          return (
            <g key={theme} className="preview-theme-chip" transform={`translate(${chipX} 0)`}>
              <rect width="36" height="12" fill="#050505" stroke={themeColor(index)} strokeWidth="0.65" opacity="0.9" />
              <text x="18" y="8.5" textAnchor="middle" fill={themeColor(index)} fontSize="5.8" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
                {themeCode(theme)}
              </text>
            </g>
          );
        })}
      </g>
      <text x={textX} y={y + 141} fill="#b8b8b8" fontSize="7.4" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.16em">
        ÖFFNEN · {entryTypeLabel(entry.entry_type).toUpperCase()}
      </text>
    </g>
  );
}

function WrappedText({ text, x, y, maxChars, lineHeight, maxLines }: { text: string; x: number; y: number; maxChars: number; lineHeight: number; maxLines: number }) {
  const wrappedLines = wrapText(text, maxChars);
  const lines = ellipsizeLines(wrappedLines, maxLines, maxChars);

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

function themeCode(theme: string) {
  return theme
    .split('-')
    .map((part) => part[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
}

function themeColor(index: number) {
  return ['#c9fff4', '#d7c7ff', '#ffd7a8', '#ffc1d6'][index % 4];
}

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} v. Chr.` : `${year}`;
}

function entryTypeLabel(value: string) {
  const labels: Record<string, string> = {
    building: 'Gebäude',
    housing: 'Wohnbau',
    landscape: 'Landschaft',
    infrastructure: 'Infrastruktur',
    urban_plan: 'Stadtentwurf'
  };
  return labels[value] ?? value.replace(/_/g, ' ');
}
