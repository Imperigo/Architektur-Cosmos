import type { CSSProperties } from 'react';
import type { RefEntry } from '@kosmo/data';
import { Hairline } from '@kosmo/ui';
import './data.css';
import { EPOCHEN_BAENDER, epocheVonEntry } from './epochen';
import { quellenFacetten } from './ref-ableitung';

/**
 * Linke Spalte der Datenstationen-Tabelle (Soll-Bild `Kosmo Viz
 * Datenstationen.dc.html`, README §10): Datenquellen-Liste (je Rollenfarbe
 * + Zähler, aus `source_quality` gezählt) + Epochen-Facetten (aus
 * `year_start` abgeleitet, `epochen.ts`) — beide klickbar, beide filtern die
 * `ReferenzTabelle` daneben. Reine Anzeige/Interaktion, kein eigener State
 * ausserhalb der von `DataWorkspace.tsx` übergebenen Callbacks.
 *
 * v0.8.0B / W6 (Spez §2/§3): Inline-Styles → `data.css`-Klassen
 * (`kd-quelle-*`); nur die Facettenfarbe selbst (`farbe`, aus
 * `ref-ableitung.ts`/`epochen.ts`, keine feste Palette) bleibt ein gezielter
 * Style-Override — genau der «CSS-Var-Carrier»-Fall, den die Spez zulässt.
 */

function knopfFarbStil(aktiv: boolean, farbe: string): CSSProperties | undefined {
  if (!aktiv) return undefined;
  return {
    borderColor: `color-mix(in srgb, ${farbe} 55%, transparent)`,
    background: `color-mix(in srgb, ${farbe} 14%, transparent)`,
    color: farbe,
  };
}

function Punkt({ farbe }: { farbe: string }) {
  return <span aria-hidden className="kd-quelle-punkt" style={{ background: farbe }} />;
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
    <aside data-testid="daten-quellen-liste" className="kd-quelle-liste">
      {quellen.length > 0 && (
        <div className="kd-quelle-gruppe">
          <span className="kd-quelle-label">Datenquellen</span>
          <button
            type="button"
            data-testid="quelle-facette-alle"
            onClick={() => setQuelleFacet(null)}
            className="kd-quelle-knopf"
            style={knopfFarbStil(quelleFacet === null, 'var(--k-ink-faint)')}
          >
            <Punkt farbe="var(--k-ink-faint)" />
            <span className="kd-fill">Alle</span>
            <span className="kd-mono">{entries.length}</span>
          </button>
          {quellen.map((q) => (
            <button
              key={q.id}
              type="button"
              data-testid={`quelle-facette-${q.id}`}
              title={q.label}
              onClick={() => setQuelleFacet(quelleFacet === q.id ? null : q.id)}
              className="kd-quelle-knopf"
              style={knopfFarbStil(quelleFacet === q.id, q.farbe)}
            >
              <Punkt farbe={q.farbe} />
              <span className="kd-fill kd-ellipsis">{q.label}</span>
              <span className="kd-mono">{q.anzahl}</span>
            </button>
          ))}
        </div>
      )}

      {epochenMitDaten.length > 0 && (
        <div className="kd-quelle-gruppe">
          <Hairline />
          <span className="kd-quelle-label kd-quelle-label--epochen">Epochen</span>
          <button
            type="button"
            data-testid="epoche-facette-alle"
            onClick={() => setEpoche(null)}
            className="kd-quelle-knopf"
            style={knopfFarbStil(epoche === null, 'var(--k-ink-faint)')}
          >
            <span className="kd-fill">Alle</span>
            <span className="kd-mono">{entries.length}</span>
          </button>
          {epochenMitDaten.map((b) => (
            <button
              key={b.id}
              type="button"
              data-testid={`epoche-facette-${b.id}`}
              onClick={() => setEpoche(epoche === b.id ? null : b.id)}
              className="kd-quelle-knopf"
              style={knopfFarbStil(epoche === b.id, 'var(--k-signal)')}
            >
              <span className="kd-fill">{b.label}</span>
              <span className="kd-mono">{epochenZaehlung.get(b.id)}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
