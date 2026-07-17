import { describe, expect, it } from 'vitest';
import { WERKZEUG_KATALOG, werkzeugeFuerIsland } from '../src/modules/design/island/island-katalog';

/**
 * PD2 Verdrahtung (`docs/ISLAND-UI-SPEZ.md` §3/§7 PD2-Zeile) — der Katalog
 * bekommt echte `toolId`s (die neun Zeichenwerkzeuge) + ehrliche `hinweis`-
 * Texte für alle NICHT verdrahteten Werkzeuge. Eigene, NEUE Testdatei
 * (additiv zu `island-shell.test.tsx`, PD1) — keine bestehende Testdatei
 * angefasst.
 */

const ECHTE_TOOL_IDS = ['auswahl', 'wand', 'volumen', 'zone', 'dach', 'treppe', 'stuetze', 'skizze', 'mesh'];

function werkzeug(id: string) {
  const w = WERKZEUG_KATALOG.find((x) => x.id === id);
  if (!w) throw new Error(`Werkzeug ${id} fehlt im Katalog`);
  return w;
}

describe('island-katalog — PD2 toolId-Verdrahtung (§3-Fundstellen)', () => {
  it('bleibt 29/29 (PD2 ändert nur Felder, keine Werkzeuge)', () => {
    expect(WERKZEUG_KATALOG).toHaveLength(29);
  });

  it.each(ECHTE_TOOL_IDS)('%s trägt toolId===id (echte ui-zustand.ts-ToolId)', (id) => {
    expect(werkzeug(id).toolId).toBe(id);
  });

  it('Werkzeuge ohne echte ToolId (Sonne/Ebenen/Varianten/Phase/Liste/Export/Import/Manuell/Darstellung) haben KEIN toolId', () => {
    for (const id of ['darstellung', 'sonne', 'ebenen', 'varianten', 'phase', 'liste', 'export', 'import', 'manuell']) {
      expect(werkzeug(id).toolId).toBeUndefined();
    }
  });

  it('Achsen/Manuell (hatPopup=false) haben KEINEN hinweis (Popup existiert dort gar nicht)', () => {
    expect(werkzeug('achsen').hatPopup).toBe(false);
    expect(werkzeug('achsen').hinweis).toBeUndefined();
    expect(werkzeug('manuell').hatPopup).toBe(false);
    expect(werkzeug('manuell').hinweis).toBeUndefined();
  });

  it('NEU-Werkzeuge ohne heutige Entsprechung (Öffnung/Messen/Kommentare) tragen "Noch nicht gebaut"-Hinweis', () => {
    for (const id of ['oeffnung', 'messen', 'kommentare']) {
      expect(werkzeug(id).hinweis).toMatch(/Noch nicht gebaut/);
    }
  });

  it('Andere-Station-Werkzeuge (Rendern/Blätter/Sync) tragen einen "Andere Station"-Hinweis', () => {
    for (const id of ['rendern', 'blaetter', 'sync']) {
      expect(werkzeug(id).hinweis).toMatch(/Andere Station/);
    }
  });

  it('PlanView-lokale Werkzeuge (Trace/Graph) tragen einen Grundriss-Hinweis (ausserhalb PD2-Dateikreis)', () => {
    for (const id of ['trace', 'graph']) {
      expect(werkzeug(id).hinweis).toMatch(/Grundriss/);
    }
  });

  it('Immer-sichtbare Panels (Kennzahlen/Checks) tragen einen "immer aktiv"-Hinweis', () => {
    for (const id of ['kennzahlen', 'checks']) {
      expect(werkzeug(id).hinweis).toMatch(/immer aktiv/);
    }
  });

  it('verdrahtete Werkzeuge (echte Aktion vorhanden) tragen KEINEN Hinweis', () => {
    for (const id of [...ECHTE_TOOL_IDS, 'darstellung', 'sonne', 'ebenen', 'varianten', 'phase', 'liste', 'export', 'import']) {
      expect(werkzeug(id).hinweis).toBeUndefined();
    }
  });

  it('genau 18 Werkzeuge sind wirklich verdrahtet (toolId ODER bekannte Sonderfälle), 11 bleiben ohne Aktion', () => {
    const verdrahtetOhneToolId = new Set(['darstellung', 'sonne', 'ebenen', 'varianten', 'phase', 'liste', 'export', 'import', 'manuell']);
    const verdrahtet = WERKZEUG_KATALOG.filter((w) => w.toolId !== undefined || verdrahtetOhneToolId.has(w.id));
    const ohneAktion = WERKZEUG_KATALOG.filter((w) => w.toolId === undefined && !verdrahtetOhneToolId.has(w.id));
    expect(verdrahtet).toHaveLength(18);
    expect(ohneAktion).toHaveLength(11);
  });

  it('werkzeugeFuerIsland liefert weiterhin 11/6/6/6 (Zuordnung durch PD2 unangetastet)', () => {
    expect(werkzeugeFuerIsland('zeichnen')).toHaveLength(11);
    expect(werkzeugeFuerIsland('ansicht')).toHaveLength(6);
    expect(werkzeugeFuerIsland('projekt')).toHaveLength(6);
    expect(werkzeugeFuerIsland('austausch')).toHaveLength(6);
  });
});
