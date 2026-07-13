import type { CSSProperties } from 'react';
import type { RefEntry } from '@kosmo/data';
import { Hairline } from '@kosmo/ui';
import { EPOCHEN_BAENDER, epocheVonEntry } from './epochen';
import { quellenFacetten } from './ref-ableitung';

/**
 * Linke Spalte der Datenstationen-Tabelle (Soll-Bild `Kosmo Viz
 * Datenstationen.dc.html`, README §10): Datenquellen-Liste (je Rollenfarbe
 * + Zähler, aus `source_quality` gezählt) + Epochen-Facetten (aus
 * `year_start` abgeleitet, `epochen.ts`) — beide klickbar, beide filtern die
 * `ReferenzTabelle` daneben. Reine Anzeige/Interaktion, kein eigener State
 * ausserhalb der von `DataWorkspace.tsx` übergebenen Callbacks.
 */

const monoLabel: CSSProperties = {
  fontFamily: 'var(--k-font-mono)',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--k-ink-faint)',
};

function knopfStil(aktiv: boolean, farbe: string): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--k-s2)',
    padding: '5px 8px',
    borderRadius: 'var(--k-radius-sm)',
    border: aktiv ? `1px solid color-mix(in srgb, ${farbe} 55%, transparent)` : '1px solid transparent',
    background: aktiv ? `color-mix(in srgb, ${farbe} 14%, transparent)` : 'transparent',
    color: aktiv ? farbe : 'var(--k-ink-soft)',
    fontSize: 'var(--k-t-xs)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  };
}

function Punkt({ farbe }: { farbe: string }) {
  return (
    <span
      aria-hidden
      style={{ width: 6, height: 6, flex: 'none', borderRadius: 999, background: farbe }}
    />
  );
}

export function QuellenListe({
  entries,
  quelleFacet,
  setQuelleFacet,
  epoche,
  setEpoche,
}: {
  entries: readonly RefEntry[];
  quelleFacet: string | null;
  setQuelleFacet: (v: string | null) => void;
  epoche: string | null;
  setEpoche: (v: string | null) => void;
}) {
  // Guard: keine Daten, keine Facette (Golden-/Ruhe-Disziplin — kein leeres Gerüst).
  if (entries.length === 0) return null;

  const quellen = quellenFacetten(entries);

  const epochenZaehlung = new Map<string, number>();
  for (const e of entries) {
    const eb = epocheVonEntry(e);
    if (eb) epochenZaehlung.set(eb.id, (epochenZaehlung.get(eb.id) ?? 0) + 1);
  }
  const epochenMitDaten = EPOCHEN_BAENDER.filter((b) => (epochenZaehlung.get(b.id) ?? 0) > 0);

  return (
    <aside
      data-testid="daten-quellen-liste"
      style={{ width: 220, flex: 'none', display: 'grid', gap: 'var(--k-s4)', alignContent: 'start' }}
    >
      {quellen.length > 0 && (
        <div style={{ display: 'grid', gap: 3 }}>
          <span style={{ ...monoLabel, marginBottom: 2 }}>Datenquellen</span>
          <button
            type="button"
            data-testid="quelle-facette-alle"
            onClick={() => setQuelleFacet(null)}
            style={knopfStil(quelleFacet === null, 'var(--k-ink-faint)')}
          >
            <Punkt farbe="var(--k-ink-faint)" />
            <span style={{ flex: 1 }}>Alle</span>
            <span style={{ fontFamily: 'var(--k-font-mono)' }}>{entries.length}</span>
          </button>
          {quellen.map((q) => (
            <button
              key={q.id}
              type="button"
              data-testid={`quelle-facette-${q.id}`}
              title={q.label}
              onClick={() => setQuelleFacet(quelleFacet === q.id ? null : q.id)}
              style={knopfStil(quelleFacet === q.id, q.farbe)}
            >
              <Punkt farbe={q.farbe} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.label}
              </span>
              <span style={{ fontFamily: 'var(--k-font-mono)' }}>{q.anzahl}</span>
            </button>
          ))}
        </div>
      )}

      {epochenMitDaten.length > 0 && (
        <div style={{ display: 'grid', gap: 3 }}>
          <Hairline />
          <span style={{ ...monoLabel, margin: '2px 0' }}>Epochen</span>
          <button
            type="button"
            data-testid="epoche-facette-alle"
            onClick={() => setEpoche(null)}
            style={knopfStil(epoche === null, 'var(--k-ink-faint)')}
          >
            <span style={{ flex: 1 }}>Alle</span>
            <span style={{ fontFamily: 'var(--k-font-mono)' }}>{entries.length}</span>
          </button>
          {epochenMitDaten.map((b) => (
            <button
              key={b.id}
              type="button"
              data-testid={`epoche-facette-${b.id}`}
              onClick={() => setEpoche(epoche === b.id ? null : b.id)}
              style={knopfStil(epoche === b.id, 'var(--k-signal)')}
            >
              <span style={{ flex: 1 }}>{b.label}</span>
              <span style={{ fontFamily: 'var(--k-font-mono)' }}>{epochenZaehlung.get(b.id)}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
