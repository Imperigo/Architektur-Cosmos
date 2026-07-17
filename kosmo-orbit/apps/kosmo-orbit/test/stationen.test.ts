import { describe, expect, it } from 'vitest';

describe('Stations-Familien (T7): Station-Id → Familie', () => {
  it('ordnet jede Station der richtigen Familie zu (Design/Data/Büro) und lässt Kosmo aussen vor', async () => {
    const { stationFamilie } = await import('../src/state/stationen');
    // KosmoDesign — Entwerfen & Produzieren (v0.8.2/P7a B5: trust/paket
    // nachgetragen — beide sind Produktions-/Ausgabe-Stationen derselben
    // Entwürfe wie draw/publish/asset, s. stationen.ts-Kopfkommentar zu
    // ZUORDNUNG).
    for (const id of ['design', 'draw', 'sketch', 'vis', 'publish', 'asset', 'trust', 'paket'] as const) {
      expect(stationFamilie(id)).toBe('design');
    }
    // KosmoData — Wissen & Daten
    for (const id of ['data', 'prepare', 'train'] as const) {
      expect(stationFamilie(id)).toBe('data');
    }
    // KosmoBüro — Büro & Meta (kleine dritte Familie)
    for (const id of ['dev', 'doc'] as const) {
      expect(stationFamilie(id)).toBe('buero');
    }
    // Kosmo/Speak: bewusst KEINE Familie — die übergeordnete Intelligenz
    expect(stationFamilie('speak')).toBe('kosmo');
  });

  it('deckt alle 14 Stationen ab (14/14, v0.8.2/P7a B5) — keine Station bleibt ohne Familie/Kosmo-Markierung', async () => {
    const { stationFamilie } = await import('../src/state/stationen');
    const { STATIONS_MODUL_IDS } = await import('../src/shell/stations-werkzeuge');
    for (const id of STATIONS_MODUL_IDS) {
      expect(stationFamilie(id)).not.toBeNull();
    }
  });

  it('STATION_FAMILIEN listet die drei Familien in Design → Data → Büro-Reihenfolge', async () => {
    const { STATION_FAMILIEN } = await import('../src/state/stationen');
    expect(STATION_FAMILIEN.map((f) => f.id)).toEqual(['design', 'data', 'buero']);
    for (const f of STATION_FAMILIEN) {
      expect(f.titel.length).toBeGreaterThan(0);
      expect(f.untertitel.length).toBeGreaterThan(0);
    }
  });

  it('V2_PLATZHALTER nennt alle vier Serie-F-Abteilungen mit Kurzbeschrieb', async () => {
    const { V2_PLATZHALTER } = await import('../src/state/stationen');
    expect(V2_PLATZHALTER.map((p) => p.name)).toEqual(
      expect.arrayContaining(['KosmoLead', 'KosmoLehre', 'KosmoBau']),
    );
    expect(V2_PLATZHALTER.length).toBeGreaterThanOrEqual(4);
    for (const p of V2_PLATZHALTER) {
      expect(p.id.length).toBeGreaterThan(0);
      expect(p.kurzbeschrieb.length).toBeGreaterThan(10);
    }
    // Ids sind eindeutig (werden 1:1 zu data-testid="v2-platzhalter-<id>")
    expect(new Set(V2_PLATZHALTER.map((p) => p.id)).size).toBe(V2_PLATZHALTER.length);
  });
});

describe('Fokus-/Wichtigkeits-Systematik (T7): Element → Stufe', () => {
  it('primär: Kosmo, Speichern, Öffnen — immer sichtbar, zentral', async () => {
    const { fokusStufe } = await import('../src/state/fokus');
    expect(fokusStufe('kosmo')).toBe('primaer');
    expect(fokusStufe('speichern')).toBe('primaer');
    expect(fokusStufe('oeffnen')).toBe('primaer');
  });

  it('sekundär: Sync — häufig, aber nicht dauerzentral', async () => {
    const { fokusStufe } = await import('../src/state/fokus');
    expect(fokusStufe('sync')).toBe('sekundaer');
  });

  it('selten: Thema/Akzent — dezent, tritt zurück', async () => {
    const { fokusStufe } = await import('../src/state/fokus');
    expect(fokusStufe('thema')).toBe('selten');
    expect(fokusStufe('akzent')).toBe('selten');
  });

  it('fokusKlasse übersetzt jede Stufe 1:1 in ihre aura.css-Klasse', async () => {
    const { fokusKlasse } = await import('../src/state/fokus');
    expect(fokusKlasse('primaer')).toBe('k-primaer');
    expect(fokusKlasse('sekundaer')).toBe('k-sekundaer');
    expect(fokusKlasse('selten')).toBe('k-selten');
  });
});
