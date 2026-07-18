// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ISLAND_GLYPHEN, ISLAND_PILL_GLYPHEN } from '../src/modules/design/island/island-glyphen';
import { ISLAND_REIHENFOLGE, WERKZEUG_KATALOG } from '../src/modules/design/island/island-katalog';

/**
 * `island-glyphen.tsx` (v0.8.4 W1, Spez §3 E8) — Regressionsschutz für die
 * 20 Werkzeug- + 4 Pill-Icons: rendert alle 24, prüft leeren `textContent`,
 * GENAU EINEN Akzentpunkt je Icon, `currentColor`-Striche (keine
 * hartkodierte Farbe ausser dem Akzent-Token) und die vollständige
 * Abdeckung der Katalog-Ids ohne echtes SVG (diese Datei importiert
 * `WERKZEUG_KATALOG` NUR zum Diff — sie wird von `island-katalog.ts` selbst
 * NICHT importiert, bleibt also unverdrahtet, s. Kopfkommentar dort).
 */

/** Katalog-Ids, die BEREITS ein echtes SVG in `werkzeug-icons.tsx` haben
 *  (D12-Bestand: 9 Icons — Auswahl/Wand/Volumen/Zone/Dach/Treppe/Stütze/
 *  Mesh + Schnitt, wobei `schnitt` kein Katalog-Werkzeug ist). */
const KATALOG_IDS_BEREITS_ECHT = ['auswahl', 'wand', 'volumen', 'zone', 'dach', 'treppe', 'stuetze', 'mesh'];

/** `skizze` ist die einzige verbleibende Katalog-Id ohne echtes SVG, die
 *  NICHT Teil dieser 20er-Lieferung ist (Bauauftrag zählt sie nicht zu den
 *  20 auf — s. Kopfkommentar `island-glyphen.tsx`). Explizit benannt statt
 *  stillschweigend durchzufallen. */
const BEWUSST_AUSSEN_VOR = ['skizze'];

function katalogIdsOhneSvg(): string[] {
  const alleIds = WERKZEUG_KATALOG.map((w) => w.id);
  return alleIds.filter((id) => !KATALOG_IDS_BEREITS_ECHT.includes(id) && !BEWUSST_AUSSEN_VOR.includes(id));
}

function alsDom(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

function zaehleAkzentpunkte(html: string): number {
  return (html.match(/r="1\.13"/g) ?? []).length;
}

describe('island-glyphen: 20 Werkzeug-Icons decken exakt die Katalog-Lücke ab', () => {
  it('WERKZEUG_KATALOG hat 29 Einträge (Fundament unverändert, D-Vertrag §3.1-§3.4)', () => {
    expect(WERKZEUG_KATALOG).toHaveLength(29);
  });

  it('ISLAND_GLYPHEN deckt exakt die Katalog-Ids ohne echtes SVG ab (minus der bewusst ausgenommenen `skizze`)', () => {
    const erwartet = katalogIdsOhneSvg().sort();
    const tatsaechlich = Object.keys(ISLAND_GLYPHEN).sort();
    expect(tatsaechlich).toEqual(erwartet);
    expect(tatsaechlich).toHaveLength(20);
  });

  it('jeder ISLAND_GLYPHEN-Schlüssel ist eine echte Katalog-Id (kein Tippfehler)', () => {
    const gueltigeIds = new Set(WERKZEUG_KATALOG.map((w) => w.id));
    for (const id of Object.keys(ISLAND_GLYPHEN)) {
      expect(gueltigeIds.has(id), id).toBe(true);
    }
  });

  it('ISLAND_GLYPHEN überschneidet sich NICHT mit den 9 bereits echten `werkzeug-icons.tsx`-Ids', () => {
    for (const id of KATALOG_IDS_BEREITS_ECHT) {
      expect(Object.keys(ISLAND_GLYPHEN)).not.toContain(id);
    }
  });
});

describe('island-glyphen: 4 Pill-Icons decken exakt die 4 IslandIds ab', () => {
  it('ISLAND_PILL_GLYPHEN-Schlüssel entsprechen exakt ISLAND_REIHENFOLGE', () => {
    expect(Object.keys(ISLAND_PILL_GLYPHEN).sort()).toEqual([...ISLAND_REIHENFOLGE].sort());
    expect(Object.keys(ISLAND_PILL_GLYPHEN)).toHaveLength(4);
  });
});

describe('island-glyphen: 24 Icons insgesamt — Bauvorschrift je Icon (werkzeug-icons.tsx:1-31)', () => {
  const ALLE: Record<string, (typeof ISLAND_GLYPHEN)[string]> = { ...ISLAND_GLYPHEN, ...ISLAND_PILL_GLYPHEN };
  const NAMEN = Object.keys(ALLE);

  it('insgesamt genau 24 Icons (20 Werkzeug + 4 Pille)', () => {
    expect(NAMEN).toHaveLength(24);
  });

  it('jedes Icon rendert ein SVG mit viewBox 0 0 24 24, strokeWidth 1.75, runden Kappen/Joins, aria-hidden', () => {
    for (const name of NAMEN) {
      const Icon = ALLE[name]!;
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
      const Icon = ALLE[name]!;
      const html = renderToStaticMarkup(<Icon />);
      expect(zaehleAkzentpunkte(html), name).toBe(1);
      expect((html.match(/fill="var\(--k-accent\)"/g) ?? []).length, name).toBe(1);
    }
  });

  it('jedes Icon ist ansonsten currentColor-only — keine hartkodierte Farbe ausser dem Akzent-Token', () => {
    for (const name of NAMEN) {
      const Icon = ALLE[name]!;
      const html = renderToStaticMarkup(<Icon />);
      expect(html, name).toContain('stroke="currentColor"');
      // Jede Hex-/rgb()-Farbe ist verboten — die einzige erlaubte Nicht-
      // currentColor-Farbe ist das Akzent-Token `var(--k-accent)`.
      const ohneAkzent = html.replace(/var\(--k-accent\)/g, '');
      expect(ohneAkzent, name).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      expect(ohneAkzent, name).not.toMatch(/rgb[a]?\(/);
    }
  });

  it('jedes Icon hat einen leeren textContent (kein <text>-Kind, Sanktion 3)', () => {
    for (const name of NAMEN) {
      const Icon = ALLE[name]!;
      const html = renderToStaticMarkup(<Icon />);
      const dom = alsDom(html);
      expect(dom.textContent, name).toBe('');
      expect(html, name).not.toContain('<text');
    }
  });

  it('`size` steuert die gerenderte Kantenlänge, die ViewBox bleibt 24', () => {
    const Icon = ISLAND_GLYPHEN.sonne!;
    const html = renderToStaticMarkup(<Icon size={40} />);
    expect(html).toContain('width="40"');
    expect(html).toContain('height="40"');
    expect(html).toContain('viewBox="0 0 24 24"');
  });

  it('die 24 Zeichnungen sind paarweise verschieden (kein Copy-Paste-Duplikat)', () => {
    const markup = NAMEN.map((name) => renderToStaticMarkup(ALLE[name]!({})));
    expect(new Set(markup).size).toBe(NAMEN.length);
  });
});
