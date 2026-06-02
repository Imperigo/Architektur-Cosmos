import { ProjectMediaGrid } from '@/components/atlas/ProjectMediaGrid';
import { styleSectorColors } from '@/lib/atlas-layout';
import { prettifyGermanText } from '@/lib/display-text';
import type { Entry, StyleSectorId } from '@/lib/types';

type ProjectDetailCardProps = {
  entry: Entry;
  x: number;
  y: number;
  onSelectFilter?: (_filter: ProjectDetailFilter) => void;
};

export type ProjectDetailFilter = {
  kind: 'style' | 'tag';
  value: StyleSectorId | string;
  label: string;
};

export function ProjectDetailCard({ entry, x, y, onSelectFilter }: ProjectDetailCardProps) {
  const location = [entry.city, entry.country].filter(Boolean).join(', ');
  const accent = styleColor(entry.style_sector);
  const detailHref = `/atlas/${entry.slug}/`;
  const courseLabel = courseGroupLabel(entry);
  const layerLabel = layerLabelForEntry(entry);
  const titleLines = ellipsizeLines(wrapText(entry.title, 29), 2, 29);
  const titleFontSize = titleLines.length > 1 ? 15.2 : entry.title.length > 33 ? 16.2 : 18;
  const metaY = y + 60 + (titleLines.length - 1) * 15;
  const mediaY = y + 88 + (titleLines.length - 1) * 8;
  const headlineLines = ellipsizeLines(wrapText(prettifyGermanText(entry.one_sentence || entry.short_description), 32), 3, 32);
  const bodyLines = ellipsizeLines(wrapText(prettifyGermanText(entry.full_description), 38), entry.source_url || entry.source_assets?.length ? 4 : 5, 38);
  const sourceLabel = sourceLabelForEntry(entry);
  const sourceAssetCount = entry.source_assets?.length ?? 0;
  const mediaCredit = primaryMediaCredit(entry);
  const databaseProfile = entry.database_profile;
  const isDatabasePilot = Boolean(databaseProfile);
  const filterChips = buildFilterChips({ entry, layerLabel, isDatabasePilot });
  const modelSummary = summaryList(entry.model_assets?.map((model) => model.model_type), 3);
  const analysisSummary = summaryList(entry.analysis_layers?.map((analysis) => analysis.analysis_type), 3);
  const archiveMetrics = archiveStatusMetrics({
    sources: databaseProfile?.source_count ?? 0,
    media: databaseProfile?.media_count ?? sourceAssetCount,
    models: databaseProfile?.model_count ?? entry.model_assets?.length ?? 0,
    analysis: databaseProfile?.analysis_count ?? entry.analysis_layers?.length ?? 0
  });

  return (
    <g className="project-detail-card">
      <rect x={x} y={y} width="352" height="292" fill="#050505" stroke={accent} strokeWidth="0.72" opacity="0.95" />
      <rect x={x + 1} y={y + 1} width="350" height="290" fill={accent} opacity="0.045" />
      <path className="detail-card-scanline" d={`M ${x + 12} ${y + 38} H ${x + 340}`} stroke={accent} strokeWidth="0.5" strokeDasharray="2 10" opacity="0.62" />
      <g className="dossier-reactive-textblock">
        <rect x={x + 10} y={y + 10} width="172" height="18" fill="#fff" opacity="0.001" />
        <text x={x + 16} y={y + 24} fill={accent} fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.18em">
          {courseLabel.toUpperCase()}
        </text>
      </g>
      {isDatabasePilot ? (
        <g transform={`translate(${x + 238} ${y + 13})`}>
          <rect width="96" height="16" rx="8" fill={accent} opacity="0.16" stroke={accent} strokeWidth="0.5" />
          <text x="48" y="10.7" textAnchor="middle" fill={accent} fontSize="5.7" fontWeight="700" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.12em">
            DATENBANK PILOT
          </text>
        </g>
      ) : null}
      <a href={detailHref} className="dossier-title-link" aria-label={`Eintrag öffnen: ${entry.title}`}>
        <rect x={x + 10} y={y + 30} width="210" height={titleLines.length > 1 ? 38 : 24} fill="#fff" opacity="0.001" />
        <text fill="#f7f7f4" fontSize={titleFontSize} fontWeight="700" fontFamily="var(--font-sans), system-ui, sans-serif">
          {titleLines.map((line, index) => (
            <tspan key={`${line}-${index}`} x={x + 16} y={y + 47 + index * 15}>
              {readableSvgLine(line, index, titleLines.length)}
            </tspan>
          ))}
        </text>
      </a>
      <g className="dossier-reactive-textblock">
        <rect x={x + 10} y={metaY - 12} width="166" height="17" fill="#fff" opacity="0.001" />
        <text x={x + 16} y={metaY} fill="#b8b8b8" fontSize="7.9" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
          {formatYear(entry.year_start)}{location ? ` · ${location}` : ''}
        </text>
      </g>
      <ProjectMediaGrid media={entry.media} x={x + 16} y={mediaY} slotWidth={72} slotHeight={48} gap={9} showLabels accent={accent} detailHref={detailHref} />
      <g className="dossier-reactive-textblock">
        <rect x={x + 178} y={y + 77} width="160" height="42" fill="#fff" opacity="0.001" />
        <text fill="#f7f7f4" fontSize="7.6" fontWeight="600" fontFamily="var(--font-sans), system-ui, sans-serif">
          {headlineLines.map((line, index) => (
            <tspan key={`${line}-${index}`} x={x + 184} y={y + 91 + index * 10}>
              {readableSvgLine(line, index, headlineLines.length)}
            </tspan>
          ))}
        </text>
      </g>
      <g className="dossier-reactive-textblock">
        <rect x={x + 178} y={y + 122} width="160" height="50" fill="#fff" opacity="0.001" />
        <text fill="#cfcfca" fontSize="6.55" fontFamily="var(--font-sans), system-ui, sans-serif">
          {bodyLines.map((line, index) => (
            <tspan key={`${line}-${index}`} x={x + 184} y={y + 133 + index * 8.8}>
              {readableSvgLine(line, index, bodyLines.length)}
            </tspan>
          ))}
        </text>
      </g>
      {isDatabasePilot ? (
        <g className="detail-database-pilot">
          <text x={x + 184} y={y + 207} fill={accent} fontSize="6.8" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.12em">
            ARCHIVPROFIL
          </text>
          <rect x={x + 184} y={y + 214} width="150" height="43" fill="#061315" stroke={accent} strokeWidth="0.45" opacity="0.86" />
          {archiveMetrics.map((metric, index) => {
            const rowY = y + 225 + index * 8;
            const barWidth = 52 * metric.ratio;
            return (
              <g key={metric.label} className="dossier-archive-metric">
                <text x={x + 192} y={rowY} fill="#f7f7f4" fontSize="5.65" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.05em">
                  {metric.label}
                </text>
                <rect x={x + 252} y={rowY - 4.4} width="52" height="3.2" rx="1.6" fill="#f7f7f4" opacity="0.11" />
                <rect x={x + 252} y={rowY - 4.4} width={barWidth} height="3.2" rx="1.6" fill={metric.color ?? accent} opacity="0.78" />
                <text x={x + 312} y={rowY} fill="#c7c7c2" fontSize="5.55" fontFamily="var(--font-sans), system-ui, sans-serif" textAnchor="end">
                  {metric.value}
                </text>
              </g>
            );
          })}
          <text x={x + 184} y={y + 269} fill={accent} fontSize="6.6" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.1em">
            3D / ANALYSE
          </text>
          <text x={x + 184} y={y + 281} fill="#d7d7d0" fontSize="6.05" fontFamily="var(--font-sans), system-ui, sans-serif">
            {modelSummary}
          </text>
          <text x={x + 184} y={y + 290} fill="#9c9c96" fontSize="5.75" fontFamily="var(--font-sans), system-ui, sans-serif">
            {analysisSummary}
          </text>
        </g>
      ) : sourceLabel ? (
        <g className="detail-source-trail">
          <text x={x + 184} y={y + 218} fill={accent} fontSize="6.8" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.12em">
            QUELLENPFAD
          </text>
          <text x={x + 184} y={y + 231} fill="#d7d7d0" fontSize="7.1" fontFamily="var(--font-sans), system-ui, sans-serif">
            {sourceLabel}
          </text>
          <text x={x + 184} y={y + 243} fill="#9c9c96" fontSize="6.4" fontFamily="var(--font-sans), system-ui, sans-serif">
            {sourceAssetCount ? `${sourceAssetCount} lokale Assets` : 'Quelle verlinkt'}{mediaCredit ? ` · ${mediaCredit}` : ''}
          </text>
        </g>
      ) : null}
      <g className="dossier-reactive-textblock">
        <rect x={x + 10} y={y + 230} width="108" height="17" fill="#fff" opacity="0.001" />
        <text x={x + 16} y={y + 242} fill="#b8b8b2" fontSize="7.2" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.1em">
          FILTER AKTIVIEREN
        </text>
      </g>
      {filterChips.slice(0, isDatabasePilot ? 3 : 4).map((filter, index) => {
        const column = isDatabasePilot ? 0 : index % 2;
        const row = isDatabasePilot ? index : Math.floor(index / 2);
        const chipWidth = isDatabasePilot ? 146 : 148;
        const chipHeight = isDatabasePilot ? 11 : 13;
        const chipRadius = chipHeight / 2;
        const rowGap = isDatabasePilot ? 14 : 17;
        const chipLabel = ellipsizeText(filter.label.replace(/_/g, ' '), isDatabasePilot ? 21 : 28);
        return (
          <g
            key={`${filter.value}-${index}`}
            className="dossier-filter-chip"
            role="button"
            tabIndex={0}
            aria-label={`Filter aktivieren: ${filter.label}`}
            transform={`translate(${x + 16 + column * 160} ${y + 252 + row * rowGap})`}
            onClick={(event) => {
              if (!onSelectFilter) return;
              event.preventDefault();
              event.stopPropagation();
              onSelectFilter(filter);
            }}
            onKeyDown={(event) => {
              if (!onSelectFilter || (event.key !== 'Enter' && event.key !== ' ')) return;
              event.preventDefault();
              event.stopPropagation();
              onSelectFilter(filter);
            }}
          >
            <rect width={chipWidth} height={chipHeight} rx={chipRadius} fill="#061315" stroke={index === 0 ? accent : '#f7f7f4'} strokeWidth="0.45" opacity="0.88" />
            <text x={chipWidth / 2} y={isDatabasePilot ? 7.8 : 9} textAnchor="middle" fill={index === 0 ? accent : '#d7d7d0'} fontSize={isDatabasePilot ? 5.3 : 5.9} fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.07em">
              {chipLabel.toUpperCase()}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function buildFilterChips({ entry, layerLabel, isDatabasePilot }: { entry: Entry; layerLabel: string; isDatabasePilot: boolean }): ProjectDetailFilter[] {
  if (isDatabasePilot && entry.database_tags?.length) {
    return entry.database_tags.slice(0, 4).map((tag) => ({
      kind: tag.startsWith('style:') ? 'style' : 'tag',
      value: tag,
      label: cleanDatabaseTag(tag)
    }));
  }

  return [
    {
      kind: 'style',
      value: entry.style_sector,
      label: layerLabel
    },
    ...entry.themes.slice(0, 3).map((theme) => ({
      kind: 'tag' as const,
      value: theme,
      label: theme
    }))
  ];
}

function ellipsizeLines(lines: string[], maxLines: number, maxChars: number) {
  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  const last = visible[visible.length - 1] ?? '';
  visible[visible.length - 1] = `${last.replace(/[,.:\s]+$/, '').slice(0, Math.max(0, maxChars - 3))}...`;
  return visible;
}

function ellipsizeText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function readableSvgLine(line: string, index: number, total: number) {
  return index < total - 1 && !line.endsWith('...') ? `${line} ` : line;
}

function archiveStatusMetrics(values: { sources: number; media: number; models: number; analysis: number }) {
  return [
    { label: 'QUELLEN', value: values.sources, max: 6, color: '#00e7ff' },
    { label: 'MEDIEN', value: values.media, max: 4, color: '#f6d15f' },
    { label: 'MODELLE', value: values.models, max: 4, color: '#ff5ad8' },
    { label: 'ANALYSE', value: values.analysis, max: 6, color: '#7dff6a' }
  ].map((metric) => ({
    ...metric,
    ratio: Math.max(0.08, Math.min(1, metric.value / metric.max))
  }));
}

function summaryList(items: string[] | undefined, maxItems: number) {
  const cleanItems = (items ?? []).map((item) => item.replace(/_/g, ' '));
  if (cleanItems.length === 0) return 'geplante Layer offen';
  const visible = cleanItems.slice(0, maxItems).join(' / ');
  const suffix = cleanItems.length > maxItems ? ` +${cleanItems.length - maxItems}` : '';
  return ellipsizeText(`${visible}${suffix}`, 39);
}

function cleanDatabaseTag(tag: string) {
  const parts = tag.split(':');
  return (parts.length > 1 ? parts.slice(1).join(':') : tag).replace(/[_-]/g, ' ');
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

  if (combined.includes('afasia')) return 'Afasia Source Pull';
  if (combined.includes('landschaft')) return 'Landschaftsarchitektur ETH';
  if (combined.includes('global') || combined.includes('urban')) return 'Global History ETH';
  if (combined.includes('architekturgeschichte') || combined.includes('architecture_history') || combined.includes('architectural_history')) return 'Architekturgeschichte ETH';
  if (combined.includes('theory')) return 'Theoriegeschichte ETH';
  return entry.source_quality.replace(/_/g, ' ');
}

function sourceLabelForEntry(entry: Entry) {
  if (entry.source_url?.includes('afasia') || entry.source_documents?.some((item) => item.toLowerCase().includes('afasia'))) {
    return 'Afasia Archzine';
  }

  if (entry.source_documents?.length) {
    return ellipsizeText(entry.source_documents.join(' / '), 42);
  }

  return '';
}

function primaryMediaCredit(entry: Entry) {
  const credit = entry.media.find((item) => item.credit)?.credit ?? entry.source_assets?.find((item) => item.credit)?.credit ?? '';
  return ellipsizeText(credit.replace('© ', ''), 28);
}

function layerLabelForEntry(entry: Entry) {
  return `${entry.entry_type.replace(/_/g, ' ')} / ${entry.style_sector.replace(/_/g, ' ')}`;
}

function styleColor(styleSector: StyleSectorId) {
  return styleSectorColors[styleSector];
}
