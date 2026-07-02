import { useMemo } from 'react';
import { deriveSection, type SectionSpec } from '@kosmo/kernel';
import { Messrahmen } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * SectionView — Schnitt oder Ansicht als SVG aus dem Mesh-Slice.
 * Auto-Fit auf die Modellausdehnung; schwere Stifte für den Schnitt,
 * feine für die Projektion (SIA-Lesart).
 */

export function SectionView({ spec, title }: { spec: SectionSpec | null; title: string }) {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;

  const graphic = useMemo(
    () => (spec ? deriveSection(doc, spec) : null),
    [doc, spec, revision],
  );

  if (!spec || !graphic || !graphic.bounds) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'grid', background: 'var(--k-plan-paper)' }}>
        <Messrahmen
          height="100%"
          style={{ height: '100%' }}
          caption={
            spec
              ? 'Kein Modell im Schnittbereich'
              : title.startsWith('Ansicht')
                ? `${title} — erscheint, sobald das Modell Bauteile hat`
                : `${title} — Schnittlinie mit dem Werkzeug «Schnitt» setzen`
          }
        />
      </div>
    );
  }

  const b = graphic.bounds;
  const pad = Math.max((b.maxS - b.minS) * 0.08, 500);
  const vb = `${b.minS - pad} ${-(b.maxZ + pad)} ${b.maxS - b.minS + 2 * pad} ${b.maxZ - b.minZ + 2 * pad}`;

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--k-plan-paper)' }}>
      <svg
        data-testid={`section-${title}`}
        viewBox={vb}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Terrainlinie auf Höhe 0 */}
        <line
          x1={b.minS - pad}
          y1={0}
          x2={b.maxS + pad}
          y2={0}
          stroke="var(--k-ink-faint)"
          strokeWidth={10}
          strokeDasharray="200 120"
        />
        {graphic.projections.map((l, i) => (
          <line
            key={`p${i}`}
            x1={l.a.s}
            y1={-l.a.z}
            x2={l.b.s}
            y2={-l.b.z}
            stroke="var(--k-ink-soft)"
            strokeWidth={7}
          />
        ))}
        {graphic.cuts.map((l, i) => (
          <line
            key={`c${i}`}
            x1={l.a.s}
            y1={-l.a.z}
            x2={l.b.s}
            y2={-l.b.z}
            stroke="var(--k-ink)"
            strokeWidth={26}
            strokeLinecap="square"
          />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 10,
          top: 8,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--k-ink-faint)',
        }}
      >
        {title}
      </div>
    </div>
  );
}
