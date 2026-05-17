import { ProjectMediaGrid } from '@/components/atlas/ProjectMediaGrid';
import type { Entry, StyleSectorId } from '@/lib/types';

type ProjectDetailCardProps = {
  entry: Entry;
  x: number;
  y: number;
};

export function ProjectDetailCard({ entry, x, y }: ProjectDetailCardProps) {
  const location = [entry.city, entry.country].filter(Boolean).join(', ');
  const accent = styleColor(entry.style_sector);
  const courseLabel = courseGroupLabel(entry);
  const layerLabel = layerLabelForEntry(entry);
  const headlineLines = wrapText(entry.one_sentence || entry.short_description, 46).slice(0, 3);
  const bodyLines = ellipsizeLines(wrapText(entry.full_description, 48), 9, 48);
  const chips = [layerLabel, ...entry.themes.slice(0, 3)].map((item) => item.replace(/_/g, ' '));

  return (
    <g className="project-detail-card">
      <rect x={x} y={y} width="352" height="292" fill="#050505" stroke={accent} strokeWidth="1" opacity="0.96" />
      <rect x={x + 1} y={y + 1} width="350" height="290" fill={accent} opacity="0.055" />
      <path className="detail-card-scanline" d={`M ${x + 12} ${y + 38} H ${x + 340}`} stroke={accent} strokeWidth="0.5" strokeDasharray="2 10" opacity="0.62" />
      <text x={x + 16} y={y + 24} fill={accent} fontSize="7.7" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.18em">
        {courseLabel.toUpperCase()}
      </text>
      <text x={x + 16} y={y + 48} fill="#f7f7f4" fontSize="20" fontWeight="700" fontFamily="var(--font-sans), system-ui, sans-serif">
        {entry.title}
      </text>
      <text x={x + 16} y={y + 67} fill="#b8b8b8" fontSize="8.4" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
        {formatYear(entry.year_start)}{location ? ` · ${location}` : ''}
      </text>
      <ProjectMediaGrid media={entry.media} x={x + 16} y={y + 86} slotWidth={72} slotHeight={48} gap={9} showLabels accent={accent} />
      <text fill="#f7f7f4" fontSize="9.4" fontWeight="620" fontFamily="var(--font-sans), system-ui, sans-serif">
        {headlineLines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={x + 184} y={y + 94 + index * 12}>
            {line}
          </tspan>
        ))}
      </text>
      <text fill="#cfcfca" fontSize="7.7" fontFamily="var(--font-sans), system-ui, sans-serif">
        {bodyLines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={x + 184} y={y + 139 + index * 10.4}>
            {line}
          </tspan>
        ))}
      </text>
      <text x={x + 16} y={y + 248} fill="#b8b8b2" fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.1em">
        LAYER / FILTER
      </text>
      {chips.slice(0, 4).map((chip, index) => {
        const chipWidth = Math.min(88, Math.max(42, chip.length * 4.2 + 14));
        return (
          <g key={`${chip}-${index}`} transform={`translate(${x + 16 + index * 80} ${y + 260})`}>
            <rect width={chipWidth} height="14" rx="7" fill="#061315" stroke={index === 0 ? accent : '#f7f7f4'} strokeWidth="0.45" opacity="0.88" />
            <text x={chipWidth / 2} y="9.5" textAnchor="middle" fill={index === 0 ? accent : '#d7d7d0'} fontSize="6.6" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
              {chip.toUpperCase()}
            </text>
          </g>
        );
      })}
    </g>
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

function courseGroupLabel(entry: Entry) {
  const source = entry.source_documents?.join(' ') ?? '';
  const cluster = entry.lecture_cluster?.join(' ') ?? '';
  const combined = `${source} ${cluster}`.toLowerCase();

  if (combined.includes('landschaft')) return 'Landschaftsarchitektur ETH';
  if (combined.includes('global') || combined.includes('urban')) return 'Global History ETH';
  if (combined.includes('architekturgeschichte') || combined.includes('architecture_history') || combined.includes('architectural_history')) return 'Architekturgeschichte ETH';
  if (combined.includes('theory')) return 'Theoriegeschichte ETH';
  return entry.source_quality.replace(/_/g, ' ');
}

function layerLabelForEntry(entry: Entry) {
  return `${entry.entry_type.replace(/_/g, ' ')} / ${entry.style_sector.replace(/_/g, ' ')}`;
}

function styleColor(styleSector: StyleSectorId) {
  const colors: Record<StyleSectorId, string> = {
    classical_architecture: '#9b6dff',
    pre_modern_architecture: '#ffb000',
    modern_architecture: '#00e7ff',
    postwar_modern_architecture: '#ff4d1f',
    sustainable_architecture: '#65ff9a',
    vernacular_architecture: '#ff007a'
  };

  return colors[styleSector];
}
