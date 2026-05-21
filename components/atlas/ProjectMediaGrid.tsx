import type { EntryMedia, EntryMediaType } from '@/lib/types';
import { publicDisplayMediaUrl } from '@/lib/media';

type ProjectMediaGridProps = {
  media: EntryMedia[];
  x: number;
  y: number;
  slotWidth: number;
  slotHeight: number;
  gap: number;
  showLabels?: boolean;
  types?: EntryMediaType[];
  accent?: string;
  detailHref?: string;
};

const mediaOrder: EntryMediaType[] = ['exterior', 'interior', 'section', 'plan'];

export function ProjectMediaGrid({ media, x, y, slotWidth, slotHeight, gap, showLabels = false, types = mediaOrder, accent = '#f7f7f4', detailHref }: ProjectMediaGridProps) {
  const mediaByType = new Map(media.map((item) => [item.type, item]));

  return (
    <g>
      {types.map((type, index) => {
        const mediaItem = mediaByType.get(type);
        const mediaUrl = publicDisplayMediaUrl(mediaItem);
        const col = index % 2;
        const row = Math.floor(index / 2);
        const slotX = x + col * (slotWidth + gap);
        const slotY = y + row * (slotHeight + gap + (showLabels ? 13 : 0));

        const slotContent = (
          <g>
            <rect x={slotX} y={slotY} width={slotWidth} height={slotHeight} fill="#050505" stroke={accent} strokeWidth="0.72" opacity="0.94" />
            {mediaUrl ? (
              <g>
                <image href={mediaUrl} x={slotX + 1} y={slotY + 1} width={slotWidth - 2} height={slotHeight - 2} preserveAspectRatio="xMidYMid slice" opacity="0.9" />
                <rect x={slotX} y={slotY} width={slotWidth} height={slotHeight} fill="none" stroke={accent} strokeWidth="0.72" opacity="0.82" />
              </g>
            ) : (
              <MediaPlaceholder type={type} x={slotX} y={slotY} width={slotWidth} height={slotHeight} accent={accent} seed={stableHash(mediaItem?.placeholder ?? type)} />
            )}
            {showLabels ? (
              <text x={slotX} y={slotY + slotHeight + 10} fill="#b8b8b8" fontSize="7.4" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
                {(mediaItem?.label ?? type).toUpperCase()}
              </text>
            ) : null}
          </g>
        );

        return detailHref ? (
          <a key={type} href={detailHref} className="dossier-media-link" aria-label={`Eintrag öffnen: ${(mediaItem?.label ?? type)}`}>
            {slotContent}
          </a>
        ) : (
          <g key={type}>
            {slotContent}
          </g>
        );
      })}
    </g>
  );
}

function MediaPlaceholder({ type, x, y, width, height, accent, seed }: { type: EntryMediaType; x: number; y: number; width: number; height: number; accent: string; seed: number }) {
  const jitter = (seed % 7) / 100;

  if (type === 'exterior') {
    return (
      <g stroke="#f7f7f4" strokeWidth="0.72" fill="none" opacity="0.84">
        <path d={`M ${x + width * 0.16} ${y + height * 0.74} L ${x + width * 0.16} ${y + height * (0.42 - jitter)} L ${x + width * 0.5} ${y + height * 0.2} L ${x + width * 0.84} ${y + height * (0.42 - jitter)} L ${x + width * 0.84} ${y + height * 0.74} Z`} />
        <path d={`M ${x + width * 0.32} ${y + height * 0.74} V ${y + height * 0.5} H ${x + width * 0.47} V ${y + height * 0.74}`} />
        <path d={`M ${x + width * 0.58} ${y + height * 0.45} H ${x + width * 0.73} V ${y + height * 0.6} H ${x + width * 0.58} Z`} stroke={accent} />
        <path d={`M ${x + width * 0.1} ${y + height * 0.82} H ${x + width * 0.9}`} stroke={accent} opacity="0.52" strokeDasharray="2 4" />
      </g>
    );
  }

  if (type === 'interior') {
    return (
      <g stroke="#f7f7f4" strokeWidth="0.68" fill="none" opacity="0.78">
        <path d={`M ${x + width * 0.18} ${y + height * 0.22} L ${x + width * 0.5} ${y + height * 0.5} L ${x + width * 0.82} ${y + height * 0.22}`} />
        <path d={`M ${x + width * 0.18} ${y + height * 0.78} L ${x + width * 0.5} ${y + height * 0.5} L ${x + width * 0.82} ${y + height * 0.78}`} />
        <path d={`M ${x + width * 0.5} ${y + height * 0.5} V ${y + height * 0.18}`} stroke={accent} />
        <path d={`M ${x + width * 0.28} ${y + height * (0.34 + jitter)} H ${x + width * 0.72}`} strokeDasharray="2 3" />
      </g>
    );
  }

  if (type === 'section') {
    return (
      <g stroke="#f7f7f4" strokeWidth="0.68" fill="none" opacity="0.82">
        <path d={`M ${x + width * 0.15} ${y + height * 0.72} H ${x + width * 0.85}`} />
        <path d={`M ${x + width * 0.22} ${y + height * 0.72} V ${y + height * 0.28} H ${x + width * 0.52} V ${y + height * 0.72}`} />
        <path d={`M ${x + width * 0.52} ${y + height * (0.42 - jitter)} H ${x + width * 0.76} V ${y + height * 0.72}`} stroke={accent} />
        <path d={`M ${x + width * 0.26} ${y + height * 0.62} L ${x + width * 0.46} ${y + height * 0.34}`} strokeDasharray="2 3" />
      </g>
    );
  }

  return (
    <g stroke="#f7f7f4" strokeWidth="0.68" fill="none" opacity="0.82">
      <rect x={x + width * 0.18} y={y + height * 0.22} width={width * 0.64} height={height * 0.56} />
      <path d={`M ${x + width * 0.18} ${y + height * 0.5} H ${x + width * 0.82}`} />
      <path d={`M ${x + width * (0.46 + jitter)} ${y + height * 0.22} V ${y + height * 0.78}`} stroke={accent} />
      <path d={`M ${x + width * 0.64} ${y + height * 0.5} V ${y + height * 0.78}`} strokeDasharray="2 3" />
    </g>
  );
}

function stableHash(value: string) {
  return value.split('').reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}
