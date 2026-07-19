// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PREPARE_GLYPHEN } from '../src/modules/prepare/island/prepare-glyphen';
import { PREPARE_WERKZEUG_KATALOG } from '../src/modules/prepare/island/prepare-island-katalog';

/**
 * `prepare-glyphen.tsx` — Regressionsschutz (PA4, `docs/V085-SPEZ.md` §3 E6
 * + §7 C-13): rendert alle 9 Prepare-Werkzeug-Icons, prüft leeren
 * `textContent`, GENAU EINEN Akzentpunkt je Icon, `currentColor`-Striche
 * (keine hartkodierte Farbe ausser dem Akzent-Token) und die vollständige
 * Abdeckung von `PREPARE_WERKZEUG_KATALOG` — kein Katalog-Werkzeug trägt
 * mehr einen Text-Kürzel-Fallback als `glyphe`. Muster: `island-glyphen.
 * test.tsx`.
 */

function alsDom(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

function zaehleAkzentpunkte(html: string): number {
  return (html.match(/r="1\.13"/g) ?? []).length;
}

describe('prepare-glyphen: 9 Werkzeug-Icons decken den kompletten Prepare-Katalog ab', () => {
  it('PREPARE_WERKZEUG_KATALOG hat 9 Einträge (Fundament unverändert)', () => {
    expect(PREPARE_WERKZEUG_KATALOG).toHaveLength(9);
  });

  it('PREPARE_GLYPHEN deckt exakt die 9 Katalog-Ids ab', () => {
    const erwartet = PREPARE_WERKZEUG_KATALOG.map((w) => w.id).sort();
    const tatsaechlich = Object.keys(PREPARE_GLYPHEN).sort();
    expect(tatsaechlich).toEqual(erwartet);
    expect(tatsaechlich).toHaveLength(9);
  });

  it('kein Prepare-Katalog-Werkzeug trägt mehr einen Text-Kürzel-Fallback als `glyphe` (alle 9 sind ComponentType)', () => {
    for (const w of PREPARE_WERKZEUG_KATALOG) {
      expect(typeof w.glyphe, w.id).not.toBe('string');
    }
  });
});

describe('prepare-glyphen: Bauvorschrift je Icon (werkzeug-icons.tsx:1-31, 24er-Norm)', () => {
  const NAMEN = Object.keys(PREPARE_GLYPHEN);

  it('jedes Icon rendert ein SVG mit viewBox 0 0 24 24, strokeWidth 1.75, runden Kappen/Joins, aria-hidden', () => {
    for (const name of NAMEN) {
      const Icon = PREPARE_GLYPHEN[name]!;
      const html = renderToStaticMarkup(<Icon />);
      expect(html, name).toContain('<svg');
      expect(html, name).toContain('viewBox="0 0 24 24"');
      expect(html, name).toContain('stroke-width="1.75"');
      expect(html, name).toContain('stroke-linecap="round"');
      expect(html, name).toContain('stroke-linejoin="round"');
      expect(html, name).toContain('aria-hidden="true"');
    }
  });

  it('jedes Icon trägt GENAU EINEN Akzentpunkt-Kreis (r=1.13, var(--k-accent))', () => {
    for (const name of NAMEN) {
      const Icon = PREPARE_GLYPHEN[name]!;
      const html = renderToStaticMarkup(<Icon />);
      expect(zaehleAkzentpunkte(html), name).toBe(1);
      expect((html.match(/fill="var\(--k-accent\)"/g) ?? []).length, name).toBe(1);
    }
  });

  it('jedes Icon ist ansonsten currentColor-only — keine hartkodierte Farbe ausser dem Akzent-Token', () => {
    for (const name of NAMEN) {
      const Icon = PREPARE_GLYPHEN[name]!;
      const html = renderToStaticMarkup(<Icon />);
      expect(html, name).toContain('stroke="currentColor"');
      const ohneAkzent = html.replace(/var\(--k-accent\)/g, '');
      expect(ohneAkzent, name).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      expect(ohneAkzent, name).not.toMatch(/rgb[a]?\(/);
    }
  });

  it('jedes Icon hat einen leeren textContent (kein <text>-Kind)', () => {
    for (const name of NAMEN) {
      const Icon = PREPARE_GLYPHEN[name]!;
      const html = renderToStaticMarkup(<Icon />);
      const dom = alsDom(html);
      expect(dom.textContent, name).toBe('');
      expect(html, name).not.toContain('<text');
    }
  });

  it('`size` steuert die gerenderte Kantenlänge, die ViewBox bleibt 24', () => {
    const Icon = PREPARE_GLYPHEN.suche!;
    const html = renderToStaticMarkup(<Icon size={40} />);
    expect(html).toContain('width="40"');
    expect(html).toContain('height="40"');
    expect(html).toContain('viewBox="0 0 24 24"');
  });

  it('die 9 Zeichnungen sind paarweise verschieden (kein Copy-Paste-Duplikat)', () => {
    const markup = NAMEN.map((name) => renderToStaticMarkup(PREPARE_GLYPHEN[name]!({})));
    expect(new Set(markup).size).toBe(NAMEN.length);
  });
});
