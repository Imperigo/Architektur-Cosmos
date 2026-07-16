import type { CSSProperties } from 'react';
import { KosmoOrb } from './KosmoOrb';
import { orbZustandFuerKarte, type CompanionKarte } from './companion-daten';

/**
 * SchwarmOrbs (v0.8.1 / P8, 0.7.2-Rest «Schwarm-Orbs», Spec §6.2/B-85 §11b) —
 * «max. 3 gleichzeitige Neben-Orbs (Owner-Grenze), Klick = Fokus». Nach dem
 * Bestands-Orb-Muster gebaut: derselbe wiederverwendbare `shell/KosmoOrb.tsx`
 * wie überall sonst (Symbol/Charakter-Fenster/Companion-Zentral-Orb) — kein
 * zweiter Orb-Automat, nur eine kleinere Instanz je aktivem Auftrag.
 *
 * Datenquelle: dieselben ECHTEN `CompanionKarte`s, die `Companion.tsx` schon
 * für die «Agenten & Aufträge»-Liste ableitet (`companion-daten.ts`, aus
 * `state/auftragsbuch.ts` + `modules/vis/vis-runtime.ts`) — kein erfundener
 * zweiter Zustand. Die Owner-Grenze «max. 3» ist eine reine Anzeige-Kappung
 * (nicht mehr als 3 Orbs auf einmal, um die Fläche nicht zuzumüllen); alle
 * weiteren aktiven Aufträge zählt ein ruhiger «+N»-Chip.
 *
 * «Klick = Fokus»: hebt die zugehörige Zeile in der vollen Liste hervor und
 * scrollt sie in den sichtbaren Bereich (`Companion.tsx` hält den
 * `fokusId`-State und das Scroll-Verhalten — diese Komponente ist reine
 * Anzeige + Klick-Weiterleitung).
 */
const SCHWARM_MAX = 3;

const ORB_KNOPF_STIL = (aktiv: boolean): CSSProperties => ({
  display: 'grid',
  placeItems: 'center',
  width: 34,
  height: 34,
  padding: 0,
  margin: 0,
  borderRadius: 999,
  background: aktiv ? 'color-mix(in srgb, var(--k-signal) 14%, transparent)' : 'transparent',
  border: `2px solid ${aktiv ? 'var(--k-signal)' : 'transparent'}`,
  cursor: 'pointer',
  font: 'inherit',
  color: 'inherit',
});

export function SchwarmOrbs({
  karten,
  fokusId,
  onFokus,
}: {
  karten: readonly CompanionKarte[];
  fokusId: string | null;
  onFokus: (id: string) => void;
}) {
  if (karten.length === 0) return null;
  const sichtbar = karten.slice(0, SCHWARM_MAX);
  const rest = karten.length - sichtbar.length;

  return (
    <div
      data-testid="schwarm-orbs"
      role="group"
      aria-label={`${karten.length} laufende Aufträge — Klick fokussiert`}
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      {sichtbar.map((karte) => (
        <button
          key={karte.id}
          type="button"
          data-testid={`schwarm-orb-${karte.id}`}
          className="k-druck"
          title={karte.titel}
          aria-label={`Fokus: ${karte.titel}`}
          aria-pressed={fokusId === karte.id}
          onClick={() => onFokus(karte.id)}
          style={ORB_KNOPF_STIL(fokusId === karte.id)}
        >
          <KosmoOrb zustand={orbZustandFuerKarte(karte)} size={26} />
        </button>
      ))}
      {rest > 0 && (
        <span
          data-testid="schwarm-orb-mehr"
          title={`${rest} weitere laufende Aufträge`}
          style={{
            fontFamily: 'var(--k-font-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: 'var(--k-ink-faint)',
            padding: '3px 7px',
            borderRadius: 'var(--k-radius-pill)',
            border: '1px solid var(--k-line)',
            background: 'var(--k-surface)',
          }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
