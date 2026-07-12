import { useMemo } from 'react';
import { BILDSCHIRM_SCHNITT, deriveSection, koteLabel, schraffurFuer, schraffurLinien, type SectionSpec } from '@kosmo/kernel';
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
  // Links Raum für die Höhenkoten lassen (Dreieck + Meter-Label)
  const kotenRand = doc.settings.bemassung.hoehenKoten ? 1800 : 0;
  const vb = `${b.minS - pad - kotenRand} ${-(b.maxZ + pad)} ${b.maxS - b.minS + 2 * pad + kotenRand} ${b.maxZ - b.minZ + 2 * pad}`;

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--k-plan-paper)' }}>
      <svg
        data-testid={`section-${title}`}
        viewBox={vb}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Terrain: ohne Profil flache Linie bei z=0, sonst die gesetzten
            Profile — gewachsen gestrichelt, neu ausgezogen (SIA 400 C.2.1) */}
        {graphic.terrain.length === 0 ? (
          <line
            x1={b.minS - pad}
            y1={0}
            x2={b.maxS + pad}
            y2={0}
            stroke="var(--k-ink-faint)"
            strokeWidth={BILDSCHIRM_SCHNITT.terrainGewachsen}
            strokeDasharray={BILDSCHIRM_SCHNITT.terrainDash}
          />
        ) : (
          graphic.terrain.map((t, i) => (
            <polyline
              key={`terr${i}`}
              data-testid={`terrain-${t.typ}`}
              points={t.pts.map((p) => `${p.s},${-p.z}`).join(' ')}
              fill="none"
              stroke={t.typ === 'neu' ? 'var(--k-ink)' : 'var(--k-ink-faint)'}
              strokeWidth={t.typ === 'neu' ? BILDSCHIRM_SCHNITT.terrainNeu : BILDSCHIRM_SCHNITT.terrainGewachsen}
              strokeDasharray={t.typ === 'gewachsen' ? BILDSCHIRM_SCHNITT.terrainDash : undefined}
            />
          ))
        )}
        {/* Material-Poché nach SIA-Phase: Vorprojekt grau, Bauprojekt Tönung, Werkplan + Schraffur */}
        {graphic.faces.map((f, i) => {
          const phase = doc.settings.phase;
          const s = schraffurFuer(f.material, f.functionKey);
          const d = f.loops
            .map((loop) => `M ${loop.map((p) => `${p.s} ${-p.z}`).join(' L ')} Z`)
            .join(' ');
          const fill = phase === 'vorprojekt' ? 'var(--k-line)' : s.tint;
          return (
            <g key={`f${i}`}>
              {fill && <path d={d} fillRule="evenodd" fill={fill} stroke="none" />}
              {phase === 'werkplan' &&
                schraffurLinien(f.loops, s, BILDSCHIRM_SCHNITT.schraffurMassstab).map((linie, j) => (
                  <polyline
                    key={j}
                    points={linie.map((p) => `${p.s},${-p.z}`).join(' ')}
                    fill="none"
                    stroke="var(--k-ink-soft)"
                    strokeWidth={BILDSCHIRM_SCHNITT.schraffur}
                  />
                ))}
            </g>
          );
        })}
        {graphic.projections.map((l, i) => (
          <line
            key={`p${i}`}
            x1={l.a.s}
            y1={-l.a.z}
            x2={l.b.s}
            y2={-l.b.z}
            stroke="var(--k-ink-soft)"
            strokeWidth={BILDSCHIRM_SCHNITT.projektion}
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
            strokeWidth={BILDSCHIRM_SCHNITT.geschnitten}
            strokeLinecap="square"
          />
        ))}
        {/* D2-Leibung (v0.7.3): Öffnungsrechteck ab Vorprojekt + Werkplan-
            Rahmenlinie — derselbe derive-Kanal wie der Druckweg
            (deriveSection().leibungen, Parität via Stilblatt), am Bildschirm
            in Theme-Tinte unterhalb der Flügelsymbolik. Leer im Wettbewerb. */}
        {graphic.leibungen.map((l, i) => (
          <line
            key={`lb${i}`}
            className={l.classes.join(' ')}
            x1={l.a.s}
            y1={-l.a.z}
            x2={l.b.s}
            y2={-l.b.z}
            stroke="var(--k-ink)"
            strokeWidth={l.classes.includes('rahmen') ? BILDSCHIRM_SCHNITT.rahmen : BILDSCHIRM_SCHNITT.leibung}
          />
        ))}
        {/* SIA-Öffnungssymbolik (v0.7.1 E5/4B, Restfix Stream 6B): additiv zum
            Druck-/Export-Weg (plansvg.ts `sectionInnerSvg`, dort die 0.18er-
            Klasse) — dünner Stift, klar schwächer als der cuts-Stift oben
            (strokeWidth 7 wie die Projektionslinien, aber volle Tinte statt
            gedämpft, analog plansvg #333 vs. #444). Leer, solange keine
            Öffnung ein `fluegelTyp` trägt (deriveSection-Guard) — bestehende
            Schnitte/Ansichten bleiben unverändert. */}
        {graphic.fenstersymbole.map((l, i) => (
          <line
            key={`fs${i}`}
            data-testid={`fluegelsymbol-${l.classes[1] ?? 'symbol'}`}
            className={l.classes.join(' ')}
            x1={l.a.s}
            y1={-l.a.z}
            x2={l.b.s}
            y2={-l.b.z}
            stroke="var(--k-ink)"
            strokeWidth={BILDSCHIRM_SCHNITT.symbolik}
          />
        ))}
        {/* Höhenkoten je Geschoss (OK fertig Boden) — Stil-Einstellung «hoehenKoten» */}
        {doc.settings.bemassung.hoehenKoten &&
          doc.storeysOrdered().map((st) => (
            <g key={st.id} data-testid="hoehenkote" stroke="var(--k-ink-soft)" fill="var(--k-ink-soft)">
              <path
                d={`M ${b.minS - 400} ${-st.elevation} l -80 -160 h 160 Z`}
                fill="none"
                strokeWidth={BILDSCHIRM_SCHNITT.koten}
              />
              <text
                x={b.minS - 560}
                y={-st.elevation - 220}
                textAnchor="end"
                fontSize={260}
                stroke="none"
                fontFamily="var(--k-font-mono)"
              >
                {koteLabel(st.elevation)}
              </text>
            </g>
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
