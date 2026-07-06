import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { enthaeltPrivatspur } from '../src/privatspur';

/**
 * visibility-Leak-Gate (Serie I, Batch B1, R1 aus docs/SERIE-I-BUILDPLAN.md).
 *
 * Laufendes Test-Gate dafür, dass `private`-Daten NIE in einen
 * Publish-/Export-/Seed-Pfad gelangen:
 *
 * 1. Positivkontrolle: `enthaeltPrivatspur` erkennt jedes im Bauplan
 *    genannte Muster (kein blindes Grün durch eine leere/kaputte Prüfung).
 * 2. Jeder Eintrag des gebauten `kosmodata-seed.json` liefert `[]`.
 * 3. Kein Seed-Eintrag trägt `visibility !== 'public'`.
 * 4. Regressionsfall: ein synthetischer, bewusst "verseuchter" Eintrag wird
 *    vom echten Builder (`buildSeedEntry`/`scrubDeep` aus
 *    `tools/build-kosmodata-seed.mjs`) nachweislich redigiert — bricht,
 *    sollte die Redaktion in Zukunft ausgedünnt werden.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const kosmoOrbitRoot = path.resolve(here, '..', '..', '..');
const seedPath = path.join(kosmoOrbitRoot, 'apps', 'kosmo-orbit', 'public', 'kosmodata-seed.json');
const builderPath = path.join(kosmoOrbitRoot, 'tools', 'build-kosmodata-seed.mjs');

interface Seed {
  schema: string;
  source: string;
  count: number;
  entries: Array<Record<string, unknown>>;
}

const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as Seed;

// tools/build-kosmodata-seed.mjs ist ein .mjs-Skript ausserhalb dieses
// Packages; dynamischer Import lädt es als Modul, ohne die Datei zu
// schreiben (main() läuft nur bei direktem CLI-Start, siehe dortige
// isDirectRun-Weiche).
const builderModule = (await import(pathToFileURL(builderPath).href)) as {
  buildSeedEntry: (entry: Record<string, unknown>) => Record<string, unknown>;
};

describe('enthaeltPrivatspur — Positivkontrolle (Muster aus docs/SERIE-I-BUILDPLAN.md B1)', () => {
  it('erkennt jedes genannte Muster in einem bewusst verseuchten Wert', () => {
    const dirty = {
      a: 'Quelle lag unter /mnt/nas/architektur/scan.pdf',
      b: 'Backup in /home/andrin/privat/notizen.md',
      c: 'gesperrt hinter source-root',
      d: 'siehe private-library/vortrag.pdf',
      e: 'Kopie unter C:\\Users\\andrin\\Archiv\\scan.pdf',
      f: 'Netzlaufwerk \\\\heimserver\\archiv\\scan.pdf',
      g: 'liegt in der OneDrive-Ablage',
      nested: { visibility: 'private', title: 'Interner Entwurf' },
    };
    const hits = enthaeltPrivatspur(dirty);
    const names = hits.map((hit) => hit.split(': ')[1]?.split(' ')[0]);
    expect(names).toEqual(
      expect.arrayContaining([
        'unix-mnt-pfad',
        'unix-home-pfad',
        'source-root',
        'private-library',
        'windows-laufwerk-pfad',
        'windows-unc-pfad',
        'onedrive-pfad',
      ]),
    );
    expect(hits.some((hit) => hit.includes("visibility:'private'"))).toBe(true);
  });

  it('liefert [] für einen sauberen Wert', () => {
    expect(enthaeltPrivatspur({ id: 'a', title: 'Museum X', visibility: 'public', notes: 'alles öffentlich' })).toEqual([]);
  });
});

describe('kosmodata-seed.json — visibility-Leak-Gate', () => {
  it('lädt einen nichtleeren Seed', () => {
    expect(seed.entries.length).toBeGreaterThan(0);
  });

  it('jeder Seed-Eintrag liefert enthaeltPrivatspur() === []', () => {
    const dirtyEntries: string[] = [];
    for (const entry of seed.entries) {
      const hits = enthaeltPrivatspur(entry);
      if (hits.length > 0) {
        dirtyEntries.push(`${String(entry.id ?? entry.slug ?? '?')}: ${hits.join(' | ')}`);
      }
    }
    expect(dirtyEntries).toEqual([]);
  });

  it('kein Seed-Eintrag trägt visibility !== "public"', () => {
    const offenders = seed.entries
      .filter((entry) => entry.visibility !== 'public')
      .map((entry) => String(entry.id ?? entry.slug ?? '?'));
    expect(offenders).toEqual([]);
  });
});

describe('tools/build-kosmodata-seed.mjs — Regressionsfall: synthetischer private-Eintrag', () => {
  it('redigiert einen bewusst verseuchten synthetischen Eintrag nachweislich', () => {
    const synthetic = {
      id: 'synthetic-leak-probe',
      slug: 'synthetic-leak-probe',
      title: 'Synthetische Privatspur-Probe',
      entry_type: 'building',
      year_start: 2000,
      visibility: 'private',
      one_sentence: 'Quelle liegt unter /mnt/nas/architektur/scan.pdf.',
      short_description: 'Notiz aus /home/andrin/privat/dossier.md, siehe private-library/ordner.',
      full_description: 'Gesperrt hinter source-root, Kopie via OneDrive-Ordner.',
      source_quality: 'Entwurf, Referenz aus private-library-Archiv.',
      media: [
        {
          type: 'exterior',
          label: 'Aussenansicht',
          placeholder: 'Platzhalter',
          url: 'https://example.com/bild.jpg',
          license: 'all_rights_reserved',
        },
      ],
      source_candidates: [
        {
          title: 'Primärquelle',
          url: 'https://intern.example/quelle',
          local_path: '/home/andrin/quellen/dokument.pdf',
          notes: 'liegt unter source-root',
        },
      ],
      asset_candidates: [
        {
          title: 'Asset',
          local_path: '/mnt/nas/assets/modell.glb',
          public_display_allowed: false,
          planned_r2_key: 'assets/modell.glb',
        },
      ],
      model_packages: [{ planned_paths: ['/home/andrin/pakete/modell.zip'], notes: 'liegt in private-library' }],
      architecture_text: {
        overview: 'Text',
        source_basis: '/mnt/nas/quelle.pdf',
        chapters: [{ title: 'Kap 1', text: 'Text mit /home/andrin/notiz.md', source_basis: '/mnt/nas/kap1.pdf' }],
      },
      model_3d: { source_basis: '/home/andrin/modelle/quelle.glb' },
    };

    const output = builderModule.buildSeedEntry(synthetic);

    // visibility ist im Seed immer 'public', unabhängig vom Quelleneintrag.
    expect(output.visibility).toBe('public');

    // Der geprüfte Regressionsfall: das Leak-Gate findet nach der Redaktion
    // keine Privatspur mehr.
    expect(enthaeltPrivatspur(output)).toEqual([]);

    // Zusätzlich: die rohen Fundstücke selbst dürfen wörtlich nicht mehr
    // im redigierten Ergebnis auftauchen.
    const serialized = JSON.stringify(output);
    expect(serialized).not.toContain('/mnt/nas');
    expect(serialized).not.toContain('/home/andrin');
    expect(serialized.toLowerCase()).not.toContain('onedrive');
    expect(serialized.toLowerCase()).not.toContain('source-root');
    expect(serialized).not.toContain('private-library');

    // Pfadfelder wurden strukturell entfernt (nicht nur textlich ersetzt).
    const sourceCandidates = output.source_candidates as Array<Record<string, unknown>>;
    const assetCandidates = output.asset_candidates as Array<Record<string, unknown>>;
    expect(sourceCandidates[0]).not.toHaveProperty('local_path');
    expect(sourceCandidates[0]).not.toHaveProperty('url');
    expect(assetCandidates[0]).not.toHaveProperty('local_path');
  });
});
