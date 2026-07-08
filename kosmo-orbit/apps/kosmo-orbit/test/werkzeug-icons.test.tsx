import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IconAuswahl, IconVolumen, IconWand, IconZone } from '../src/modules/design/werkzeug-icons';

/**
 * Serie K A5 (K15): die vier Werkzeug-Icons der Design-Werkzeugleiste —
 * Regressionsschutz für die Zugänglichkeits- und Stil-Verträge:
 * (a) rein dekorativ (`aria-hidden`, der Name sitzt am Button), (b) Farbe
 * ausschliesslich über `currentColor` (erbt Akzent/Ton vom KButton, nie eine
 * hartkodierte Farbe — Gestaltungskonzept «Tusche», Thema-/Akzentwechsel
 * wirken automatisch), (c) einheitliche 16er-Geometrie, (d) vier sichtbar
 * unterschiedliche Zeichnungen (kein Copy-Paste-Duplikat).
 */

const ALLE = [
  ['Auswahl', IconAuswahl],
  ['Wand', IconWand],
  ['Volumen', IconVolumen],
  ['Zone', IconZone],
] as const;

describe('werkzeug-icons (K15): dekorative Inline-SVGs im aura-Stil', () => {
  it('jedes Icon ist ein aria-hidden-SVG mit 16×16-Geometrie', () => {
    for (const [name, Icon] of ALLE) {
      const html = renderToStaticMarkup(<Icon />);
      expect(html, name).toContain('<svg');
      expect(html, name).toContain('aria-hidden="true"');
      expect(html, name).toContain('viewBox="0 0 16 16"');
      expect(html, name).toContain('width="16"');
      expect(html, name).toContain('height="16"');
    }
  });

  it('Farbe kommt ausschliesslich aus currentColor — keine hartkodierte Farbe', () => {
    for (const [name, Icon] of ALLE) {
      const html = renderToStaticMarkup(<Icon />);
      expect(html, name).toContain('currentColor');
      expect(html, name).not.toMatch(/#[0-9a-fA-F]{3,8}/); // kein Hex-Wert
      expect(html, name).not.toMatch(/rgb\(/);
    }
  });

  it('kein Text im Icon (der zugängliche Name sitzt am Button, nicht im SVG)', () => {
    for (const [name, Icon] of ALLE) {
      const html = renderToStaticMarkup(<Icon />);
      expect(html, name).not.toContain('<text');
      expect(html, name).not.toContain('<title');
    }
  });

  it('die vier Zeichnungen sind paarweise verschieden', () => {
    const markup = ALLE.map(([, Icon]) => renderToStaticMarkup(<Icon />));
    expect(new Set(markup).size).toBe(ALLE.length);
  });
});
