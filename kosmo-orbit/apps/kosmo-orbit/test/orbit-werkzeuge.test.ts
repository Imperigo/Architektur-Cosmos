import { describe, expect, it } from 'vitest';

describe('Orbit-Werkzeuge (Serie K / F3, Owner-Auftrag «rund statt Blöcke»): Hauptwerkzeug → Untertool-Mapping', () => {
  it('zeigt GENAU 4 Hauptwerkzeuge in der Owner-Reihenfolge KosmoDesign/KosmoData/Kosmo/KosmoOffice', async () => {
    const { ORBIT_HAUPTWERKZEUGE } = await import('../src/shell/orbit-werkzeuge');
    expect(ORBIT_HAUPTWERKZEUGE).toHaveLength(4);
    expect(ORBIT_HAUPTWERKZEUGE.map((h) => h.id)).toEqual(['design', 'data', 'kosmo', 'office']);
    expect(ORBIT_HAUPTWERKZEUGE.map((h) => h.titel)).toEqual([
      'KosmoDesign',
      'KosmoData',
      'Kosmo',
      'KosmoOffice',
    ]);
  });

  it('nur KosmoOffice ist «kommend» — die drei aktiven Hauptwerkzeuge öffnen echte Stationen', async () => {
    const { ORBIT_HAUPTWERKZEUGE } = await import('../src/shell/orbit-werkzeuge');
    for (const h of ORBIT_HAUPTWERKZEUGE) {
      if (h.id === 'office') {
        expect(h.kommend).toBe(true);
      } else {
        expect(h.kommend).toBeUndefined();
      }
    }
  });

  it('jede der 14 echten Stationen (STATIONS_MODUL_IDS) trägt genau EIN kanonisches Untertool mit `module-<id>`-Testid', async () => {
    const { alleUntertools } = await import('../src/shell/orbit-werkzeuge');
    const { STATIONS_MODUL_IDS } = await import('../src/shell/stations-werkzeuge');

    const kanonisch = alleUntertools().filter((u) => u.moduleId && !u.kommend && !u.testidOverride);
    const kanonischeIds = kanonisch.map((u) => u.moduleId).sort();
    expect(kanonischeIds).toEqual([...STATIONS_MODUL_IDS].sort());
    // Keine doppelte `module-<id>`-Testid — jede moduleId genau einmal kanonisch.
    expect(new Set(kanonischeIds).size).toBe(kanonischeIds.length);
  });

  it('Sonderfall «Modell»: navigiert ehrlich zu `design` (FreeMesh lebt dort), OHNE die module-design-Testid zu kapern', async () => {
    const { alleUntertools } = await import('../src/shell/orbit-werkzeuge');
    const modell = alleUntertools().find((u) => u.id === 'modell');
    expect(modell?.moduleId).toBe('design');
    expect(modell?.testidOverride).toBe('orbit-sub-modell');
    expect(modell?.kommend).toBeUndefined();
    expect(modell?.faehigkeit).toMatch(/FreeMesh/);
  });

  it('KosmoOffice listet Lead/HR/Lehre/Bau als «kommend», keines trägt eine moduleId (kein Klick zu einem leeren Screen)', async () => {
    const { ORBIT_HAUPTWERKZEUGE } = await import('../src/shell/orbit-werkzeuge');
    const office = ORBIT_HAUPTWERKZEUGE.find((h) => h.id === 'office')!;
    expect(office.untertools).toHaveLength(4);
    expect(office.untertools.map((u) => u.id).sort()).toEqual(['bau', 'buero-hr', 'lead', 'lehre'].sort());
    for (const u of office.untertools) {
      expect(u.kommend).toBe(true);
      expect(u.moduleId).toBeUndefined();
      expect(u.titel.length).toBeGreaterThan(0);
      expect(u.kurzbeschrieb.length).toBeGreaterThan(5);
    }
  });

  it('jedes Untertool trägt Titel, Kurzbeschrieb und eine mehrere Sätze lange Fähigkeitsbeschreibung', async () => {
    const { alleUntertools } = await import('../src/shell/orbit-werkzeuge');
    for (const u of alleUntertools()) {
      expect(u.titel.length, u.id).toBeGreaterThan(0);
      expect(u.kurzbeschrieb.length, u.id).toBeGreaterThan(5);
      expect(u.faehigkeit.length, u.id).toBeGreaterThan(20);
    }
  });

  it('Asset wandert zu KosmoData, Prepare zu KosmoDesign (Owner-Wortlaut, abweichend von der alten T7-Familie)', async () => {
    const { ORBIT_HAUPTWERKZEUGE } = await import('../src/shell/orbit-werkzeuge');
    const data = ORBIT_HAUPTWERKZEUGE.find((h) => h.id === 'data')!;
    const design = ORBIT_HAUPTWERKZEUGE.find((h) => h.id === 'design')!;
    expect(data.untertools.some((u) => u.moduleId === 'asset')).toBe(true);
    expect(design.untertools.some((u) => u.moduleId === 'prepare')).toBe(true);
  });
});
