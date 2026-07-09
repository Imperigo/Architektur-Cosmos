import type { CSSProperties } from 'react';

/**
 * D-Leerbild (W4, UI-KONZEPT-065 §4/§4.5 «Leerzustände sind gezeichnet»,
 * Chefbefund 5) — Referenz-/Material-Karten ohne Bild zeigten bisher eine
 * leere beige Fläche. Statt eines Fake-Thumbnails oder eines generierten
 * Bildes (Owner-Mandat, Ehrlichkeit vor Politur) zeichnet dieses Signet ein
 * kleines Tusche-Liniensymbol je Typ:
 * - `referenz`: isometrischer Baukörper-Umriss (ein einfacher axonometrischer
 *   Quader — «hier stünde ein Gebäude»).
 * - `material`: Schraffur-Quadrat (45°-Hatch, wie eine SIA-Schnittschraffur
 *   ohne Farbe).
 *
 * Beide Signets: 1.5px-Stroke, `--k-ink-faint`, kein Fill. Darunter der
 * ehrliche Satz «kein Bild hinterlegt» (`--k-t-xs`, `--k-ink-faint`).
 * `data-testid="karte-leerbild"` sitzt auf dem SVG-Signet selbst (W4-Vertrag).
 */
export type DataLeerbildTyp = 'referenz' | 'material';

const SIGNET_BASE: CSSProperties = {
  display: 'block',
};

function ReferenzSignet() {
  return (
    <svg
      data-testid="karte-leerbild"
      aria-hidden="true"
      viewBox="0 0 40 40"
      width={30}
      height={30}
      fill="none"
      stroke="var(--k-ink-faint)"
      strokeWidth={1.5}
      strokeLinejoin="round"
      strokeLinecap="round"
      style={SIGNET_BASE}
    >
      {/* Kopf: die obere Raute (Dach-/Deckenfläche eines einfachen Quaders in Isometrie) */}
      <path d="M20 5 34 12.5 20 20 6 12.5Z" />
      {/* die drei sichtbaren Vertikalkanten */}
      <path d="M34 12.5V25.5M20 20V33M6 12.5V25.5" />
      {/* der sichtbare Sockel */}
      <path d="M34 25.5 20 33 6 25.5" />
    </svg>
  );
}

function MaterialSignet() {
  return (
    <svg
      data-testid="karte-leerbild"
      aria-hidden="true"
      viewBox="0 0 40 40"
      width={30}
      height={30}
      fill="none"
      stroke="var(--k-ink-faint)"
      strokeWidth={1.5}
      strokeLinecap="round"
      style={SIGNET_BASE}
    >
      <rect x={6} y={6} width={28} height={28} />
      {/* 45°-Schraffur, exakt im Quadrat berechnet — kein clipPath (mehrere
          Instanzen auf derselben Seite dürfen keine doppelten SVG-IDs teilen). */}
      <path d="M20 6 6 20M28 6 6 28M34 12 12 34M34 20 20 34" strokeWidth={1} opacity={0.7} />
    </svg>
  );
}

export interface DataLeerbildProps {
  typ: DataLeerbildTyp;
  style?: CSSProperties;
}

/** Platzhalter-Block: Signet + ehrlicher Satz, mittig in seinem Container. */
export function DataLeerbild({ typ, style }: DataLeerbildProps) {
  return (
    <div
      style={{
        display: 'grid',
        justifyItems: 'center',
        alignContent: 'center',
        gap: 'var(--k-s2)',
        ...style,
      }}
    >
      {typ === 'referenz' ? <ReferenzSignet /> : <MaterialSignet />}
      <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>kein Bild hinterlegt</span>
    </div>
  );
}
