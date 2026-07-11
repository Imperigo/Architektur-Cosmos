import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  STATION_GLYPHE,
  WerkzeugGlyphe,
  type WerkzeugGlyphenArt,
} from '../src/shell/werkzeug-glyphen';
import { STATIONS_MODUL_IDS } from '../src/shell/stations-werkzeuge';

/**
 * V0.7.2 W1-B (Paket 02) — Regressionsschutz für die neue Glyphen-
 * Bibliothek (`docs/V072-VISUELLES-UPDATE-SPEZ.md` §3): 14 Arten (12
 * Stations-Glyphen + `skizze`/`lernen`), Norm sw 1.75, genau EIN Akzent-
 * Punkt (`<circle r="1.7">`) ausser bei `orbit` (Quadrat-Ausnahme), und
 * `STATION_GLYPHE` deckt alle 12 echten Stationen ab.
 */

const ALLE_ARTEN: WerkzeugGlyphenArt[] = [
  'chat',
  'pipeline',
  'draw',
  'data',
  'viz',
  'publish',
  'prepare',
  'connect',
  'office',
  'zentrale',
  'odysseus',
  'orbit',
  'skizze',
  'lernen',
];

function zaehleAkzentPunkte(html: string): number {
  return (html.match(/<circle[^>]*r="1\.7"/g) ?? []).length;
}

describe('werkzeug-glyphen (V0.7.2 W1-B Paket 02): die 14 Grundformen aus Spec-§3', () => {
  it('registriert exakt 14 Arten', () => {
    expect(ALLE_ARTEN).toHaveLength(14);
    expect(new Set(ALLE_ARTEN).size).toBe(14);
  });

  it('jede Art rendert ein SVG mit ViewBox 0 0 24 24, fill none, aria-hidden', () => {
    for (const art of ALLE_ARTEN) {
      const html = renderToStaticMarkup(<WerkzeugGlyphe art={art} />);
      expect(html, art).toContain('<svg');
      expect(html, art).toContain('viewBox="0 0 24 24"');
      expect(html, art).toContain('aria-hidden="true"');
    }
  });

  it('jede Grundform trägt die Strichstärke 1.75 (var(--k-ink), sw-Norm Spec-§3)', () => {
    for (const art of ALLE_ARTEN) {
      const html = renderToStaticMarkup(<WerkzeugGlyphe art={art} />);
      expect(html, art).toContain('stroke-width="1.75"');
      expect(html, art).toContain('var(--k-ink)');
    }
  });

  it('jede Glyphe AUSSER orbit hat GENAU EINEN Akzent-Punkt-Kreis (r=1.7)', () => {
    for (const art of ALLE_ARTEN) {
      const html = renderToStaticMarkup(<WerkzeugGlyphe art={art} />);
      if (art === 'orbit') {
        expect(zaehleAkzentPunkte(html), art).toBe(0);
      } else {
        expect(zaehleAkzentPunkte(html), art).toBe(1);
      }
    }
  });

  it('orbit trägt ein Quadrat (rx 1, 3.2×3.2) statt eines Punkts, plus ein Teal-Viertel (var(--k-signal))', () => {
    const html = renderToStaticMarkup(<WerkzeugGlyphe art="orbit" />);
    expect(html).toContain('width="3.2"');
    expect(html).toContain('height="3.2"');
    expect(html).toContain('rx="1"');
    expect(html).toContain('var(--k-signal)');
  });

  it('ohne `rolle` erbt der Akzent-Punkt currentColor (einfarbig-fähig)', () => {
    const html = renderToStaticMarkup(<WerkzeugGlyphe art="chat" />);
    expect(html).toContain('fill="currentColor"');
  });

  it('mit `rolle` füllt der Akzent-Punkt `var(--k-rolle-*)`, ohne die var()-Klammer doppelt zu setzen', () => {
    const html = renderToStaticMarkup(<WerkzeugGlyphe art="chat" rolle="--k-signal" />);
    expect(html).toContain('fill="var(--k-signal)"');
    expect(html).not.toContain('var(var(');
  });

  it('`size` steuert die gerenderte Kantenlänge, die ViewBox bleibt 24', () => {
    const html = renderToStaticMarkup(<WerkzeugGlyphe art="draw" size={64} />);
    expect(html).toContain('width="64"');
    expect(html).toContain('height="64"');
    expect(html).toContain('viewBox="0 0 24 24"');
  });

  it('STATION_GLYPHE deckt alle 12 echten Stationen (STATIONS_MODUL_IDS) ab — je genau ein Eintrag', () => {
    const stationen = Object.keys(STATION_GLYPHE).sort();
    expect(stationen).toEqual([...STATIONS_MODUL_IDS].sort());
    expect(stationen).toHaveLength(12);
    for (const [station, eintrag] of Object.entries(STATION_GLYPHE)) {
      expect(ALLE_ARTEN, station).toContain(eintrag.art);
      expect(eintrag.rolle.startsWith('--'), station).toBe(true);
    }
  });

  it('die Zeichnungen sind paarweise verschieden (kein Copy-Paste-Duplikat)', () => {
    const markup = ALLE_ARTEN.map((art) => renderToStaticMarkup(<WerkzeugGlyphe art={art} />));
    expect(new Set(markup).size).toBe(ALLE_ARTEN.length);
  });
});
