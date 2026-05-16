import type { EntryMedia, EntryMediaType } from '@/lib/types';

type ProjectMediaGridProps = {
  media: EntryMedia[];
  x: number;
  y: number;
  slotWidth: number;
  slotHeight: number;
  gap: number;
  showLabels?: boolean;
  types?: EntryMediaType[];
};

const mediaOrder: EntryMediaType[] = ['exterior', 'interior', 'section', 'plan'];

export function ProjectMediaGrid({ media, x, y, slotWidth, slotHeight, gap, showLabels = false, types = mediaOrder }: ProjectMediaGridProps) {
  const mediaByType = new Map(media.map((item) => [item.type, item]));

  return (
    <g>
      {types.map((type, index) => {
        const mediaItem = mediaByType.get(type);
        const col = index % 2;
        const row = Math.floor(index / 2);
        const slotX = x + col * (slotWidth + gap);
        const slotY = y + row * (slotHeight + gap + (showLabels ? 13 : 0));

        return (
          <g key={type}>
            <rect x={slotX} y={slotY} width={slotWidth} height={slotHeight} fill="#f7f7f4" stroke="#101010" strokeWidth="0.8" />
            <MediaPlaceholder type={type} x={slotX} y={slotY} width={slotWidth} height={slotHeight} />
            {showLabels ? (
              <text x={slotX} y={slotY + slotHeight + 10} fill="#525252" fontSize="8" fontFamily="var(--font-sans), system-ui, sans-serif" letterSpacing="0.08em">
                {(mediaItem?.label ?? type).toUpperCase()}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function MediaPlaceholder({ type, x, y, width, height }: { type: EntryMediaType; x: number; y: number; width: number; height: number }) {
  if (type === 'exterior') {
    return (
      <g stroke="#101010" strokeWidth="0.8" fill="none" opacity="0.84">
        <path d={`M ${x + width * 0.18} ${y + height * 0.72} L ${x + width * 0.18} ${y + height * 0.4} L ${x + width * 0.5} ${y + height * 0.22} L ${x + width * 0.82} ${y + height * 0.4} L ${x + width * 0.82} ${y + height * 0.72} Z`} />
        <path d={`M ${x + width * 0.34} ${y + height * 0.72} V ${y + height * 0.5} H ${x + width * 0.47} V ${y + height * 0.72}`} />
        <path d={`M ${x + width * 0.58} ${y + height * 0.47} H ${x + width * 0.72} V ${y + height * 0.6} H ${x + width * 0.58} Z`} />
      </g>
    );
  }

  if (type === 'interior') {
    return (
      <g stroke="#101010" strokeWidth="0.75" fill="none" opacity="0.78">
        <path d={`M ${x + width * 0.18} ${y + height * 0.22} L ${x + width * 0.5} ${y + height * 0.5} L ${x + width * 0.82} ${y + height * 0.22}`} />
        <path d={`M ${x + width * 0.18} ${y + height * 0.78} L ${x + width * 0.5} ${y + height * 0.5} L ${x + width * 0.82} ${y + height * 0.78}`} />
        <path d={`M ${x + width * 0.5} ${y + height * 0.5} V ${y + height * 0.18}`} />
        <path d={`M ${x + width * 0.3} ${y + height * 0.36} H ${x + width * 0.7}`} strokeDasharray="2 3" />
      </g>
    );
  }

  if (type === 'section') {
    return (
      <g stroke="#101010" strokeWidth="0.75" fill="none" opacity="0.82">
        <path d={`M ${x + width * 0.15} ${y + height * 0.72} H ${x + width * 0.85}`} />
        <path d={`M ${x + width * 0.22} ${y + height * 0.72} V ${y + height * 0.28} H ${x + width * 0.52} V ${y + height * 0.72}`} />
        <path d={`M ${x + width * 0.52} ${y + height * 0.42} H ${x + width * 0.76} V ${y + height * 0.72}`} />
        <path d={`M ${x + width * 0.26} ${y + height * 0.62} L ${x + width * 0.46} ${y + height * 0.34}`} strokeDasharray="2 3" />
      </g>
    );
  }

  return (
    <g stroke="#101010" strokeWidth="0.75" fill="none" opacity="0.82">
      <rect x={x + width * 0.18} y={y + height * 0.22} width={width * 0.64} height={height * 0.56} />
      <path d={`M ${x + width * 0.18} ${y + height * 0.5} H ${x + width * 0.82}`} />
      <path d={`M ${x + width * 0.48} ${y + height * 0.22} V ${y + height * 0.78}`} />
      <path d={`M ${x + width * 0.64} ${y + height * 0.5} V ${y + height * 0.78}`} strokeDasharray="2 3" />
    </g>
  );
}
