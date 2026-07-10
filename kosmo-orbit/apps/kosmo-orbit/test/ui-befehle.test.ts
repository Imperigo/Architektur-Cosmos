import { beforeEach, describe, expect, it } from 'vitest';
import { alleUiBefehle, fuehreUiBefehlAus, UiBefehlError } from '../src/state/ui-befehle';
import { neuLadenAusSpeicher, useUiZustand } from '../src/state/ui-zustand';
import { useProject } from '../src/state/project-store';

/**
 * v0.6.6 BEWEGUNGSKONZEPT §6 — `ui.*`-Command-Namensraum. Flüchtige,
 * undo-freie Registry: jeder Befehl validiert seine Params (zod), mutiert
 * ausschliesslich `ui-zustand.ts`, `ui.zustandLesen` liefert einen Snapshot.
 */

beforeEach(() => {
  localStorage.clear();
  neuLadenAusSpeicher();
});

describe('Registry', () => {
  it('listet alle sieben ui.*-Befehle', () => {
    const ids = alleUiBefehle().map((b) => b.id).sort();
    expect(ids).toEqual([
      'ui.ansichtSetzen',
      'ui.geschossSetzen',
      'ui.modusAutomatik',
      'ui.modusSetzen',
      'ui.panelSetzen',
      'ui.werkzeugSetzen',
      'ui.zustandLesen',
    ]);
  });

  it('jeder Befehl trägt eine Beschreibung', () => {
    for (const b of alleUiBefehle()) expect(b.beschreibung.length).toBeGreaterThan(10);
  });
});

describe('ui.werkzeugSetzen / ui.ansichtSetzen', () => {
  it('validiert Params und mutiert den Store', () => {
    fuehreUiBefehlAus('ui.werkzeugSetzen', { tool: 'wand' });
    expect(useUiZustand.getState().tool).toBe('wand');

    fuehreUiBefehlAus('ui.ansichtSetzen', { viewMode: '2d' });
    expect(useUiZustand.getState().viewMode).toBe('2d');
  });

  it('unbekanntes Werkzeug/Ansicht → UiBefehlError, kein stiller Fehlschlag', () => {
    expect(() => fuehreUiBefehlAus('ui.werkzeugSetzen', { tool: 'zauberstab' })).toThrow(UiBefehlError);
    expect(() => fuehreUiBefehlAus('ui.ansichtSetzen', { viewMode: 'vr' })).toThrow(UiBefehlError);
  });
});

describe('ui.panelSetzen', () => {
  it('öffnet und schliesst ein Panel per Namen', () => {
    fuehreUiBefehlAus('ui.panelSetzen', { panel: 'kvOffen', offen: true });
    expect(useUiZustand.getState().kvOffen).toBe(true);
    fuehreUiBefehlAus('ui.panelSetzen', { panel: 'kvOffen', offen: false });
    expect(useUiZustand.getState().kvOffen).toBe(false);
  });

  it('unbekannte Panel-Id wird abgelehnt', () => {
    expect(() => fuehreUiBefehlAus('ui.panelSetzen', { panel: 'nichtVorhanden', offen: true })).toThrow(UiBefehlError);
  });
});

describe('ui.modusSetzen / ui.modusAutomatik', () => {
  it('setzt den Arbeitsmodus manuell und merkt sich modusManuell', () => {
    fuehreUiBefehlAus('ui.modusSetzen', { modus: 'exportieren' });
    const s = useUiZustand.getState();
    expect(s.arbeitsmodus).toBe('exportieren');
    expect(s.modusManuell).toBe('exportieren');
  });

  it('modus: null setzt zurück in den Neutral-Zustand', () => {
    fuehreUiBefehlAus('ui.modusSetzen', { modus: 'zeichnen' });
    fuehreUiBefehlAus('ui.modusSetzen', { modus: null });
    expect(useUiZustand.getState().arbeitsmodus).toBeUndefined();
  });

  it('schaltet die Automatik um', () => {
    fuehreUiBefehlAus('ui.modusAutomatik', { automatik: false });
    expect(useUiZustand.getState().modusAutomatik).toBe(false);
  });

  it('unbekannter Modus-String wird abgelehnt', () => {
    expect(() => fuehreUiBefehlAus('ui.modusSetzen', { modus: 'traeumen' })).toThrow(UiBefehlError);
  });
});

describe('ui.geschossSetzen (H-33: Chat-Dach landete kommentarlos aufs EG)', () => {
  it('wechselt per storeyId und liefert das aktive Geschoss zurück', () => {
    const eg = useProject.getState().runCommand('design.geschossErstellen', {
      name: 'H33-EG', index: 0, elevation: 0, height: 3000,
    });
    const og = useProject.getState().runCommand('design.geschossErstellen', {
      name: 'H33-DG', index: 1, elevation: 3000, height: 2500,
    });
    const egId = (eg.patches[0] as { id: string }).id;
    const ogId = (og.patches[0] as { id: string }).id;
    useProject.getState().setActiveStorey(egId);

    const res = fuehreUiBefehlAus('ui.geschossSetzen', { storeyId: ogId }) as { storeyId: string; name: string; index: number };
    expect(res).toEqual({ storeyId: ogId, name: 'H33-DG', index: 1 });
    expect(useProject.getState().activeStoreyId).toBe(ogId);
  });

  it('wechselt per name — Kosmo kann «ins Dachgeschoss wechseln» ohne die ID zu kennen', () => {
    useProject.getState().runCommand('design.geschossErstellen', {
      name: 'H33-Dachgeschoss', index: 2, elevation: 5500, height: 2400,
    });
    const res = fuehreUiBefehlAus('ui.geschossSetzen', { name: 'H33-Dachgeschoss' }) as { storeyId: string; name: string };
    expect(res.name).toBe('H33-Dachgeschoss');
    expect(useProject.getState().activeStoreyId).toBe(res.storeyId);
  });

  it('wechselt per index (0=EG, 1=1.OG, -1=1.UG)', () => {
    const ug = useProject.getState().runCommand('design.geschossErstellen', {
      name: 'H33-UG', index: -7, elevation: -3000, height: 2600,
    });
    const ugId = (ug.patches[0] as { id: string }).id;
    const res = fuehreUiBefehlAus('ui.geschossSetzen', { index: -7 }) as { storeyId: string };
    expect(res.storeyId).toBe(ugId);
    expect(useProject.getState().activeStoreyId).toBe(ugId);
  });

  it('unbekanntes Geschoss (storeyId/name/index) → UiBefehlError, ehrliche Meldung, kein stiller Fehlschlag', () => {
    expect(() => fuehreUiBefehlAus('ui.geschossSetzen', { storeyId: 'geschoss-nicht-vorhanden' })).toThrow(UiBefehlError);
    expect(() => fuehreUiBefehlAus('ui.geschossSetzen', { name: 'Es-gibt-mich-nicht-H33' })).toThrow(UiBefehlError);
    expect(() => fuehreUiBefehlAus('ui.geschossSetzen', { index: 987654 })).toThrow(UiBefehlError);
  });

  it('ohne storeyId/name/index → UiBefehlError statt stillschweigend nichts zu tun', () => {
    expect(() => fuehreUiBefehlAus('ui.geschossSetzen', {})).toThrow(UiBefehlError);
  });
});

describe('ui.zustandLesen', () => {
  it('liefert einen vollständigen, konsistenten Snapshot', () => {
    fuehreUiBefehlAus('ui.werkzeugSetzen', { tool: 'mesh' });
    fuehreUiBefehlAus('ui.panelSetzen', { panel: 'sonneOffen', offen: true });
    fuehreUiBefehlAus('ui.modusSetzen', { modus: 'modellieren' });

    const snap = fuehreUiBefehlAus('ui.zustandLesen', {}) as {
      tool: string;
      panels: Record<string, boolean>;
      arbeitsmodus: string | undefined;
    };
    expect(snap.tool).toBe('mesh');
    expect(snap.panels['sonneOffen']).toBe(true);
    expect(snap.arbeitsmodus).toBe('modellieren');
  });

  it('lehnt unbekannten Befehl ab', () => {
    expect(() => fuehreUiBefehlAus('ui.nichtVorhanden', {})).toThrow(UiBefehlError);
  });
});
