import { beforeEach, describe, expect, it } from 'vitest';
import { alleUiBefehle, fuehreUiBefehlAus, UiBefehlError } from '../src/state/ui-befehle';
// Seiteneffekt-Import — registriert die sieben `ui.dock*`-Befehle bei der
// (eingefrorenen) `ui-befehle.ts`-Registry, exakt wie `kosmo-ui-werkzeuge.ts`
// es für die echte App tut (s. dortigen Kommentar).
import '../src/state/dock-befehle';
import { neuLadenAusSpeicher, useDockZustand } from '../src/state/dock-zustand';
import { setzeAktiveDockStationFuerTest } from '../src/state/dock-aktive-station';
import { kosmoUiWerkzeuge, type UiAktionMeldung } from '../src/state/kosmo-ui-werkzeuge';

/**
 * v0.7.8 Welle 3 / Paket P7 («Kosmo ordnet») — die sieben `ui.dock*`-Befehle
 * (`state/dock-befehle.ts`): Schema-Validierung, Aktive-Station-Auflösung
 * (`dock-aktive-station.ts`), Mutation von `useDockZustand`, der stille
 * Lese-Befehl, und die Chat-Quittungstexte (`kosmo-ui-werkzeuge.ts`s
 * `beschreibeAktion`). Muster wie `ui-befehle.test.ts`/`dock-zustand.test.ts`.
 */

beforeEach(() => {
  localStorage.clear();
  neuLadenAusSpeicher();
  setzeAktiveDockStationFuerTest('design');
});

describe('Registry', () => {
  it('listet alle sieben ui.dock*-Befehle (additiv zu den bestehenden sieben ui.*-Befehlen)', () => {
    const ids = alleUiBefehle()
      .map((b) => b.id)
      .filter((id) => id.startsWith('ui.dock'))
      .sort();
    expect(ids).toEqual([
      'ui.dockAnheften',
      'ui.dockEinklappen',
      'ui.dockGroesseSetzen',
      'ui.dockLayoutLesen',
      'ui.dockSetzen',
      'ui.dockZurueckLegen',
      'ui.dockZuruecksetzen',
    ]);
  });

  it('jeder ui.dock*-Befehl trägt eine ehrliche Beschreibung', () => {
    for (const b of alleUiBefehle()) {
      if (!b.id.startsWith('ui.dock')) continue;
      expect(b.beschreibung.length).toBeGreaterThan(10);
    }
  });
});

describe('Aktive Station', () => {
  it('ohne aktive Station → UiBefehlError statt stillem No-op', () => {
    setzeAktiveDockStationFuerTest(undefined);
    expect(() => fuehreUiBefehlAus('ui.dockEinklappen', { panelId: 'kennzahlen', eingeklappt: true })).toThrow(
      UiBefehlError,
    );
  });

  it('unbekannte panelId wird abgelehnt — Meldung nennt die aktive Station', () => {
    try {
      fuehreUiBefehlAus('ui.dockEinklappen', { panelId: 'gibtsNicht', eingeklappt: true });
      expect.fail('hätte werfen müssen');
    } catch (err) {
      expect(err).toBeInstanceOf(UiBefehlError);
      expect((err as UiBefehlError).message).toContain('design');
      expect((err as UiBefehlError).message).toContain('gibtsNicht');
    }
  });
});

describe('ui.dockSetzen', () => {
  it('dockt links/rechts um und löscht dabei alte Float-Felder', () => {
    useDockZustand.getState().panelOverrideSetzen('design', 'kennzahlen', { dock: 'float', anker: 'top', fx: 10, fy: 20 });
    fuehreUiBefehlAus('ui.dockSetzen', { panelId: 'kennzahlen', dock: 'left' });
    const ov = useDockZustand.getState().layoutFuer('design').panels['kennzahlen'];
    expect(ov).toEqual({ dock: 'left' });
  });

  it('float im Modus A setzt anker default "top"', () => {
    expect(useDockZustand.getState().modus).toBe('A');
    fuehreUiBefehlAus('ui.dockSetzen', { panelId: 'kennzahlen', dock: 'float' });
    const ov = useDockZustand.getState().layoutFuer('design').panels['kennzahlen'];
    expect(ov?.dock).toBe('float');
    expect(ov?.anker).toBe('top');
  });

  it('float im Modus A mit explizitem anker', () => {
    fuehreUiBefehlAus('ui.dockSetzen', { panelId: 'kennzahlen', dock: 'float', anker: 'bottom-left' });
    const ov = useDockZustand.getState().layoutFuer('design').panels['kennzahlen'];
    expect(ov?.anker).toBe('bottom-left');
  });

  it('float im Modus B → ehrlicher UiBefehlError statt stillem Fehlschlag', () => {
    useDockZustand.getState().modusSetzen('B');
    expect(() => fuehreUiBefehlAus('ui.dockSetzen', { panelId: 'kennzahlen', dock: 'float' })).toThrow(UiBefehlError);
    try {
      fuehreUiBefehlAus('ui.dockSetzen', { panelId: 'kennzahlen', dock: 'float' });
    } catch (err) {
      expect((err as UiBefehlError).message).toContain('Modus');
    }
  });

  it('unbekanntes dock-Ziel wird von zod abgelehnt', () => {
    expect(() => fuehreUiBefehlAus('ui.dockSetzen', { panelId: 'kennzahlen', dock: 'rail' })).toThrow(UiBefehlError);
  });
});

describe('ui.dockGroesseSetzen', () => {
  it('klemmt nach unten an das Panel-Minimum (kennzahlen: min 200)', () => {
    const r = fuehreUiBefehlAus('ui.dockGroesseSetzen', { panelId: 'kennzahlen', groesse: 10 }) as { groesse: number };
    expect(r.groesse).toBe(200);
    expect(useDockZustand.getState().layoutFuer('design').panels['kennzahlen']?.groesse).toBe(200);
  });

  it('klemmt nach oben an eine grosszügige Obergrenze (kennzahlen: groesse 380 → Deckel 1140)', () => {
    const r = fuehreUiBefehlAus('ui.dockGroesseSetzen', { panelId: 'kennzahlen', groesse: 999999 }) as { groesse: number };
    expect(r.groesse).toBe(1140);
  });

  it('ein Wert innerhalb des Bands bleibt unverändert', () => {
    const r = fuehreUiBefehlAus('ui.dockGroesseSetzen', { panelId: 'kennzahlen', groesse: 400 }) as { groesse: number };
    expect(r.groesse).toBe(400);
  });
});

describe('ui.dockAnheften / ui.dockEinklappen', () => {
  it('heftet an und löst wieder', () => {
    fuehreUiBefehlAus('ui.dockAnheften', { panelId: 'kennzahlen', angeheftet: true });
    expect(useDockZustand.getState().layoutFuer('design').panels['kennzahlen']?.angeheftet).toBe(true);
    fuehreUiBefehlAus('ui.dockAnheften', { panelId: 'kennzahlen', angeheftet: false });
    expect(useDockZustand.getState().layoutFuer('design').panels['kennzahlen']?.angeheftet).toBe(false);
  });

  it('klappt ein und wieder auf', () => {
    fuehreUiBefehlAus('ui.dockEinklappen', { panelId: 'kennzahlen', eingeklappt: true });
    expect(useDockZustand.getState().layoutFuer('design').panels['kennzahlen']?.eingeklappt).toBe(true);
    fuehreUiBefehlAus('ui.dockEinklappen', { panelId: 'kennzahlen', eingeklappt: false });
    expect(useDockZustand.getState().layoutFuer('design').panels['kennzahlen']?.eingeklappt).toBe(false);
  });
});

describe('ui.dockZurueckLegen', () => {
  it('ein nicht-schwebendes Panel → UiBefehlError ("nichts zum Zurücklegen")', () => {
    expect(() => fuehreUiBefehlAus('ui.dockZurueckLegen', { panelId: 'kennzahlen' })).toThrow(UiBefehlError);
  });

  it('ein schwebendes Panel verliert alle Float-Felder', () => {
    fuehreUiBefehlAus('ui.dockSetzen', { panelId: 'kennzahlen', dock: 'float' });
    fuehreUiBefehlAus('ui.dockZurueckLegen', { panelId: 'kennzahlen' });
    const ov = useDockZustand.getState().layoutFuer('design').panels['kennzahlen'];
    expect(ov).toEqual({});
  });
});

describe('ui.dockZuruecksetzen', () => {
  it('löscht NUR die aktive Station/den aktiven Modus, andere Layouts bleiben unberührt', () => {
    useDockZustand.getState().panelOverrideSetzen('design', 'kennzahlen', { eingeklappt: true });
    useDockZustand.getState().panelOverrideSetzen('vis', 'visPalette', { eingeklappt: true });
    setzeAktiveDockStationFuerTest('design');
    fuehreUiBefehlAus('ui.dockZuruecksetzen', {});
    expect(useDockZustand.getState().layoutFuer('design').panels).toEqual({});
    expect(useDockZustand.getState().layoutFuer('vis').panels['visPalette']?.eingeklappt).toBe(true);
  });
});

describe('ui.dockLayoutLesen', () => {
  it('liefert einen vollständigen Schnappschuss (Modus, Spaltenbreiten, Overrides, eingeklappte Panels)', () => {
    fuehreUiBefehlAus('ui.dockEinklappen', { panelId: 'kennzahlen', eingeklappt: true });
    const snap = fuehreUiBefehlAus('ui.dockLayoutLesen', {}) as {
      station: string;
      modus: string;
      leftW: number;
      rightW: number;
      panels: Record<string, unknown>;
      eingeklappt: string[];
    };
    expect(snap.station).toBe('design');
    expect(snap.modus).toBe('A');
    expect(typeof snap.leftW).toBe('number');
    expect(typeof snap.rightW).toBe('number');
    expect(snap.eingeklappt).toContain('kennzahlen');
    expect(snap.panels['kennzahlen']).toBeDefined();
  });
});

describe('beschreibeAktion — Chat-Quittungstexte (kosmo-ui-werkzeuge.ts)', () => {
  it('dockEinklappen/dockAnheften/dockSetzen/dockZuruecksetzen erzeugen art:"dock"-Meldungen mit dem echten Panel-Titel', () => {
    const meldungen: UiAktionMeldung[] = [];
    const tools = kosmoUiWerkzeuge((m) => meldungen.push(m));

    const dockEinklappen = tools.find((t) => t.name === 'ui_dockEinklappen')!;
    dockEinklappen.execute({ panelId: 'kennzahlen', eingeklappt: true });
    expect(meldungen.at(-1)).toMatchObject({ art: 'dock' });
    expect(meldungen.at(-1)?.text).toContain('Kennzahlen');
    expect(meldungen.at(-1)?.text).toContain('eingeklappt');

    const dockAnheften = tools.find((t) => t.name === 'ui_dockAnheften')!;
    dockAnheften.execute({ panelId: 'kennzahlen', angeheftet: true });
    expect(meldungen.at(-1)?.text).toContain('angeheftet');

    const dockSetzen = tools.find((t) => t.name === 'ui_dockSetzen')!;
    dockSetzen.execute({ panelId: 'kennzahlen', dock: 'left' });
    expect(meldungen.at(-1)?.text).toContain('links angedockt');

    const dockZuruecksetzen = tools.find((t) => t.name === 'ui_dockZuruecksetzen')!;
    dockZuruecksetzen.execute({});
    expect(meldungen.at(-1)?.text).toContain('zurückgesetzt');
  });

  it('ui.dockLayoutLesen bleibt still — keine Meldung für einen reinen Lesezugriff', () => {
    const meldungen: UiAktionMeldung[] = [];
    const tools = kosmoUiWerkzeuge((m) => meldungen.push(m));
    const dockLayoutLesen = tools.find((t) => t.name === 'ui_dockLayoutLesen')!;
    dockLayoutLesen.execute({});
    expect(meldungen).toHaveLength(0);
  });
});
