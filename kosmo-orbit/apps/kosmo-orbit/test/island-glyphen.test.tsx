// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ISLAND_GLYPHEN, ISLAND_PILL_GLYPHEN } from '../src/modules/design/island/island-glyphen';
import { ISLAND_REIHENFOLGE, WERKZEUG_KATALOG } from '../src/modules/design/island/island-katalog';
import { VIS_ISLAND_REIHENFOLGE } from '../src/modules/vis/island/vis-island-katalog';
import { PUBLISH_ISLAND_REIHENFOLGE } from '../src/modules/publish/island/publish-island-katalog';
import { PREPARE_ISLAND_REIHENFOLGE } from '../src/modules/prepare/island/prepare-island-katalog';

/**
 * `island-glyphen.tsx` — Regressionsschutz für die Werkzeug- + Pill-Icons:
 * rendert alle, prüft leeren `textContent`, GENAU EINEN Akzentpunkt je Icon,
 * `currentColor`-Striche (keine hartkodierte Farbe ausser dem Akzent-Token)
 * und die vollständige Abdeckung der Katalog-Ids ohne echtes SVG (diese
 * Datei importiert `WERKZEUG_KATALOG` NUR zum Diff — sie wird von
 * `island-katalog.ts` selbst NICHT importiert, bleibt also unverdrahtet, s.
 * Kopfkommentar dort).
 *
 * **PE2 (v0.8.4, Bauauftrag Punkte 2+3):** zwei Erweiterungen gegenüber der
 * ursprünglichen v0.8.4-W1-Fassung:
 * 1. `skizze` bekam ihr echtes SVG (21. Werkzeug-Icon) — die frühere
 *    `BEWUSST_AUSSEN_VOR`-Ausnahme ist damit weg, ALLE 29 Katalog-Ids ohne
 *    ein `werkzeug-icons.tsx`-Icon haben jetzt ein `ISLAND_GLYPHEN`-Icon.
 * 2. `ISLAND_PILL_GLYPHEN` wuchs von 4 auf 11 Einträge — die vier
 *    design-Inseln PLUS alle Insel-Ids von vis/publish/prepare, die noch
 *    keinen Eintrag hatten (`graph`/`stimmung`, `blatt`/`darstellung`,
 *    `aufnahme`/`wissen`/`bestand`). `ansicht`/`projekt`/`austausch`
 *    brauchten KEINEN neuen Eintrag — sie sind bereits über design
 *    abgedeckt, `IslandShell.tsx` löst die Pille stationsunabhängig rein
 *    über den String-Insel-Id auf.
 *
 * v0.8.9 §9 E11 (PBL2, `docs/V089-SPEZ.md`): + 1 weiterer Eintrag `sonne`
 * (12. Pille) für die neue, fünfte vis-Insel SONNE (Sonnenstunden-Client,
 * `vis-island-katalog.ts`) — dieselbe additive Logik wie PE2 oben.
 *
 * **Wichtig für die Distinktheits-Probe:** `ISLAND_GLYPHEN` (Werkzeug-Icons)
 * und `ISLAND_PILL_GLYPHEN` (Insel-Pillen) teilen sich zwei Schlüssel
 * (`graph`, `darstellung`) — das sind bewusst ZWEI VERSCHIEDENE Zeichnungen
 * in zwei getrennten Namensräumen (Werkzeug vs. Insel), kein Duplikat. Ein
 * naives `{ ...ISLAND_GLYPHEN, ...ISLAND_PILL_GLYPHEN }`-Merge würde den
 * Werkzeug-Eintrag beim Spread STILLSCHWEIGEND überschreiben und ihn aus
 * jeder Distinktheits-/Bauvorschrift-Probe herausfallen lassen — die Tests
 * unten iterieren darum über zwei separat präfigierte Namenslisten
 * (`werkzeug:*` / `pille:*`), nie über einen blossen Objekt-Merge.
 */

/** Katalog-Ids, die BEREITS ein echtes SVG in `werkzeug-icons.tsx` haben
 *  (D12-Bestand: 9 Icons — Auswahl/Wand/Volumen/Zone/Dach/Treppe/Stütze/
 *  Mesh + Schnitt, wobei `schnitt` kein Katalog-Werkzeug ist). */
const KATALOG_IDS_BEREITS_ECHT = ['auswahl', 'wand', 'volumen', 'zone', 'dach', 'treppe', 'stuetze', 'mesh'];

function katalogIdsOhneSvg(): string[] {
  const alleIds = WERKZEUG_KATALOG.map((w) => w.id);
  return alleIds.filter((id) => !KATALOG_IDS_BEREITS_ECHT.includes(id));
}

function alsDom(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

function zaehleAkzentpunkte(html: string): number {
  return (html.match(/r="1\.13"/g) ?? []).length;
}

describe('island-glyphen: 25 Werkzeug-Icons decken exakt die Katalog-Lücke ab (inkl. skizze, PE2; v0.9.1 P-B2: + gelaender/rampe; v0.9.2 P-P2: + profil)', () => {
  it('WERKZEUG_KATALOG hat 33 Einträge (Fundament 29 unverändert, D-Vertrag §3.1-§3.4; v0.9.1 P-B2: +gelaender/rampe, v0.9.2 P-P2: +profil; v0.9.2 P-D-Nachzug: +detail)', () => {
    expect(WERKZEUG_KATALOG).toHaveLength(33);
  });

  it('ISLAND_GLYPHEN deckt exakt die Katalog-Ids ohne echtes werkzeug-icons.tsx-SVG ab — ALLE 33 Werkzeuge sind jetzt SVG-vollständig', () => {
    const erwartet = katalogIdsOhneSvg().sort();
    const tatsaechlich = Object.keys(ISLAND_GLYPHEN).sort();
    expect(tatsaechlich).toEqual(erwartet);
    expect(tatsaechlich).toHaveLength(25);
  });

  it('jeder ISLAND_GLYPHEN-Schlüssel ist eine echte Katalog-Id (kein Tippfehler)', () => {
    const gueltigeIds = new Set(WERKZEUG_KATALOG.map((w) => w.id));
    for (const id of Object.keys(ISLAND_GLYPHEN)) {
      expect(gueltigeIds.has(id), id).toBe(true);
    }
  });

  it('ISLAND_GLYPHEN überschneidet sich NICHT mit den 8 bereits echten `werkzeug-icons.tsx`-Ids', () => {
    for (const id of KATALOG_IDS_BEREITS_ECHT) {
      expect(Object.keys(ISLAND_GLYPHEN)).not.toContain(id);
    }
  });

  it('kein Katalog-Werkzeug trägt mehr einen Text-Kürzel-Fallback als `glyphe` (alle 33 sind ComponentType)', () => {
    for (const w of WERKZEUG_KATALOG) {
      expect(typeof w.glyphe, w.id).not.toBe('string');
    }
  });
});

describe('island-glyphen: 11 Pill-Icons decken alle Insel-Ids aller vier Stationen ab (PE2)', () => {
  it('ISLAND_PILL_GLYPHEN enthält die 4 design-Inseln', () => {
    for (const id of ISLAND_REIHENFOLGE) {
      expect(Object.keys(ISLAND_PILL_GLYPHEN), id).toContain(id);
    }
  });

  it('ISLAND_PILL_GLYPHEN enthält alle 4 vis-Inseln (graph/stimmung neu, ansicht/austausch bereits über design abgedeckt)', () => {
    for (const id of VIS_ISLAND_REIHENFOLGE) {
      expect(Object.keys(ISLAND_PILL_GLYPHEN), id).toContain(id);
    }
  });

  it('ISLAND_PILL_GLYPHEN enthält alle 4 publish-Inseln (blatt/darstellung neu, projekt/austausch bereits über design abgedeckt)', () => {
    for (const id of PUBLISH_ISLAND_REIHENFOLGE) {
      expect(Object.keys(ISLAND_PILL_GLYPHEN), id).toContain(id);
    }
  });

  it('ISLAND_PILL_GLYPHEN enthält alle 4 prepare-Inseln (aufnahme/wissen/bestand neu, austausch bereits über design abgedeckt)', () => {
    for (const id of PREPARE_ISLAND_REIHENFOLGE) {
      expect(Object.keys(ISLAND_PILL_GLYPHEN), id).toContain(id);
    }
  });

  it('genau 12 Pill-Icons total (4 design + graph/stimmung + blatt/darstellung + aufnahme/wissen/bestand + sonne)', () => {
    expect(Object.keys(ISLAND_PILL_GLYPHEN).sort()).toEqual(
      [
        'ansicht',
        'aufnahme',
        'austausch',
        'bestand',
        'blatt',
        'darstellung',
        'graph',
        'projekt',
        'sonne',
        'stimmung',
        'wissen',
        'zeichnen',
      ].sort(),
    );
    expect(Object.keys(ISLAND_PILL_GLYPHEN)).toHaveLength(12);
  });

  it('jeder ISLAND_PILL_GLYPHEN-Schlüssel ist eine echte Insel-Id einer der vier Stationen (kein Tippfehler)', () => {
    const gueltigeIds = new Set([
      ...ISLAND_REIHENFOLGE,
      ...VIS_ISLAND_REIHENFOLGE,
      ...PUBLISH_ISLAND_REIHENFOLGE,
      ...PREPARE_ISLAND_REIHENFOLGE,
    ]);
    for (const id of Object.keys(ISLAND_PILL_GLYPHEN)) {
      expect(gueltigeIds.has(id), id).toBe(true);
    }
  });
});

describe('island-glyphen: alle 37 Icons (25 Werkzeug + 12 Pille) — Bauvorschrift je Icon (werkzeug-icons.tsx:1-31)', () => {
  // s. Datei-Kopfkommentar: bewusst KEIN Objekt-Merge (würde die zwei
  // geteilten Schlüssel `graph`/`darstellung` stillschweigend kollabieren)
  // — stattdessen zwei präfigierte Namenslisten über eine gemeinsame Map.
  const ALLE = new Map<string, (typeof ISLAND_GLYPHEN)[string]>();
  for (const [id, Icon] of Object.entries(ISLAND_GLYPHEN)) ALLE.set(`werkzeug:${id}`, Icon);
  for (const [id, Icon] of Object.entries(ISLAND_PILL_GLYPHEN)) ALLE.set(`pille:${id}`, Icon);
  const NAMEN = [...ALLE.keys()];

  it('insgesamt genau 37 Icons (25 Werkzeug + 12 Pille), keine Kollision beim Zählen', () => {
    expect(NAMEN).toHaveLength(37);
  });

  it('jedes Icon rendert ein SVG mit viewBox 0 0 24 24, strokeWidth 1.75, runden Kappen/Joins, aria-hidden', () => {
    for (const name of NAMEN) {
      const Icon = ALLE.get(name)!;
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
      const Icon = ALLE.get(name)!;
      const html = renderToStaticMarkup(<Icon />);
      expect(zaehleAkzentpunkte(html), name).toBe(1);
      expect((html.match(/fill="var\(--k-accent\)"/g) ?? []).length, name).toBe(1);
    }
  });

  it('jedes Icon ist ansonsten currentColor-only — keine hartkodierte Farbe ausser dem Akzent-Token', () => {
    for (const name of NAMEN) {
      const Icon = ALLE.get(name)!;
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
      const Icon = ALLE.get(name)!;
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

  it('die 36 Zeichnungen sind paarweise verschieden (kein Copy-Paste-Duplikat — auch nicht zwischen werkzeug:graph/pille:graph oder werkzeug:darstellung/pille:darstellung oder werkzeug:sonne/pille:sonne)', () => {
    const markup = NAMEN.map((name) => renderToStaticMarkup(ALLE.get(name)!({})));
    expect(new Set(markup).size).toBe(NAMEN.length);
  });
});
