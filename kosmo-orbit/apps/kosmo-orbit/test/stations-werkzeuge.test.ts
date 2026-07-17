import { describe, expect, it } from 'vitest';

describe('Stations-Werkzeuge (Serie K / A2, Owner-Befund K12): Hover-Stichworte je Kachel', () => {
  it('deckt ALLE 14 Zentrale-Kachel-Ids ab, je 3–5 nichtleere Stichworte', async () => {
    const { STATIONS_WERKZEUGE, STATIONS_MODUL_IDS } = await import('../src/shell/stations-werkzeuge');

    expect(Object.keys(STATIONS_WERKZEUGE).sort()).toEqual([...STATIONS_MODUL_IDS].sort());
    // v0.8.1 / P11 (docs/V081-SPEZ.md §7(a), C-29): 12 → 13 — KosmoTrust
    // (.kxp-Viewer + Trust-Layer) ist eine ECHTE 13. Station, kein Kachel-
    // Attrappen-Zuwachs (s. `stations-werkzeuge.ts` STATIONS_MODUL_IDS).
    // v0.8.1 / P14 (§7(e)/C-28/C-30): 13 → 14 — KosmoPackage (Export-Hub +
    // .kxp-Übersicht) ist die ECHTE 14. Station, sanktioniert im Bau-Auftrag
    // («literale Stationszahl-Tests 13→14 als direkte Folge sind sanktioniert»).
    expect(STATIONS_MODUL_IDS).toHaveLength(14);

    for (const id of STATIONS_MODUL_IDS) {
      const woerter = STATIONS_WERKZEUGE[id];
      expect(woerter.length, `Station ${id}`).toBeGreaterThanOrEqual(3);
      expect(woerter.length, `Station ${id}`).toBeLessThanOrEqual(5);
      for (const stichwort of woerter) {
        expect(stichwort.trim().length, `Station ${id}: "${stichwort}"`).toBeGreaterThan(3);
      }
      // Keine Duplikate innerhalb einer Station.
      expect(new Set(woerter).size).toBe(woerter.length);
    }
  });

  it('nennt reale Fähigkeiten (Stichprobe gegen bekannte Workspace-Merkmale)', async () => {
    const { STATIONS_WERKZEUGE } = await import('../src/shell/stations-werkzeuge');
    expect(STATIONS_WERKZEUGE.design.join(' ')).toMatch(/Volumenstudien/);
    expect(STATIONS_WERKZEUGE.design.join(' ')).toMatch(/DXF\/IFC/);
    expect(STATIONS_WERKZEUGE.vis.join(' ')).toMatch(/HomeStation/);
    expect(STATIONS_WERKZEUGE.vis.join(' ')).toMatch(/Node-Graph/);
    expect(STATIONS_WERKZEUGE.speak.join(' ')).toMatch(/Kosmo/);
    expect(STATIONS_WERKZEUGE.sketch.join(' ')).toMatch(/Wandachse/);
  });

  it('werkzeugeFuerStation liefert für orbit/kosmo bewusst leer (keine eigene Zentrale-Kachel)', async () => {
    const { werkzeugeFuerStation, STATIONS_MODUL_IDS } = await import('../src/shell/stations-werkzeuge');
    expect(werkzeugeFuerStation('orbit')).toEqual([]);
    expect(werkzeugeFuerStation('kosmo')).toEqual([]);
    for (const id of STATIONS_MODUL_IDS) {
      expect(werkzeugeFuerStation(id).length).toBeGreaterThan(0);
    }
  });
});
