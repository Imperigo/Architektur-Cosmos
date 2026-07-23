import { describe, expect, it } from 'vitest';
import { WERKZEUG_KATALOG, werkzeugeFuerIsland } from '../src/modules/design/island/island-katalog';
import { registrierteWerkzeugIds } from '../src/modules/design/island/inhalte/registry';
import '../src/modules/design/island/inhalte/zeichnen';
import '../src/modules/design/island/inhalte/ansicht';
import '../src/modules/design/island/inhalte/projekt';
import '../src/modules/design/island/inhalte/austausch';
// v0.9.2 P-P2 (docs/V092-SPEZ.md §P-P2): additiver Import — ohne ihn fehlte
// «profil» in `registrierteWerkzeugIds()` und der C-27-Test unten würde ihn
// fälschlich als unregistriert melden.
import '../src/modules/design/island/inhalte/profile';

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
  it('bleibt 33/33 (PD2 ändert nur Felder, keine Werkzeuge; v0.9.1 P-B2: 29→31 gelaender/rampe, v0.9.2 P-P2: 31→32 profil, P-D-Nachzug: 32→33 detail)', () => {
    expect(WERKZEUG_KATALOG).toHaveLength(33);
  });

  it.each(ECHTE_TOOL_IDS)('%s trägt toolId===id (echte ui-zustand.ts-ToolId)', (id) => {
    expect(werkzeug(id).toolId).toBe(id);
  });

  // v0.9.1 P-B2 (docs/V091-SPEZ.md §P-B2): gelaender/rampe tragen ebenfalls
  // toolId===id, ABER bewusst KEINE echte ui-zustand.ts-ToolId (s. dortigen
  // Kommentar — DesignWorkspace.tsx bleibt TABU, der String-Durchlass
  // `setTool(w.toolId as ToolId)` aktiviert den Modus trotzdem). Eigene
  // Zeile statt ECHTE_TOOL_IDS-Erweiterung, um diesen Unterschied nicht zu
  // verwischen.
  it.each(['gelaender', 'rampe'])('%s trägt toolId===id (String-Durchlass, keine erweiterte ToolId-Union — s. ui-zustand.ts-Kommentar)', (id) => {
    expect(werkzeug(id).toolId).toBe(id);
  });

  it('Werkzeuge ohne echte ToolId (Sonne/Ebenen/Varianten/Phase/Liste/Export/Import/Manuell/Darstellung/Profile) haben KEIN toolId', () => {
    for (const id of ['darstellung', 'sonne', 'ebenen', 'varianten', 'phase', 'liste', 'export', 'import', 'manuell', 'profil']) {
      expect(werkzeug(id).toolId).toBeUndefined();
    }
  });

  it('Achsen/Manuell (hatPopup=false) haben KEINEN hinweis (Popup existiert dort gar nicht)', () => {
    expect(werkzeug('achsen').hatPopup).toBe(false);
    expect(werkzeug('achsen').hinweis).toBeUndefined();
    expect(werkzeug('manuell').hatPopup).toBe(false);
    expect(werkzeug('manuell').hinweis).toBeUndefined();
  });

  // v0.8.3 E1/E2/E3 (§8-5/§8-6/§8-7 jetzt Owner-entschieden): die drei
  // einstigen «kein heutige Entsprechung»-Fälle tragen jetzt echte `toolId`s
  // (kein `hinweis` mehr) — löst den vorigen «Noch nicht gebaut»-Test ab.
  it('Öffnung/Messen/Kommentare tragen jetzt echte toolId (kein Hinweis mehr, §8-5/§8-6/§8-7 entschieden)', () => {
    expect(werkzeug('oeffnung').toolId).toBe('oeffnung');
    expect(werkzeug('oeffnung').hinweis).toBeUndefined();
    expect(werkzeug('messen').toolId).toBe('messen');
    expect(werkzeug('messen').hinweis).toBeUndefined();
    // Insel-Katalog-Id bleibt Plural («kommentare»), der ToolId dahinter ist
    // Singular («kommentar», `ui-zustand.ts`-Union) — beide Namen sind
    // bewusst unabhängig, s. `island-katalog.ts`-Kommentar.
    expect(werkzeug('kommentare').toolId).toBe('kommentar');
    expect(werkzeug('kommentare').hinweis).toBeUndefined();
    for (const id of ['oeffnung', 'messen', 'kommentare']) {
      expect(werkzeug(id).status).toBe('vorhanden');
    }
  });

  // PE2 (v0.8.4, C-27): der frühere «Andere Station — Weg offen (§8-4)»-
  // Hinweis ist raus — §8-4 ist seit PD3c entschieden und real verdrahtet
  // (`docs/ISLAND-UI-SPEZ.md` §8 Punkt 4 Nachtrag), der Hinweis behauptete
  // das Gegenteil der gebauten Realität (`ZurStationKnopf` navigiert echt).
  it('Andere-Station-Werkzeuge (Rendern/Blätter/Sync) tragen KEINEN Hinweis mehr (§8-4 entschieden, PE2 räumt die «Weg offen»-Leiche auf)', () => {
    for (const id of ['rendern', 'blaetter', 'sync']) {
      expect(werkzeug(id).hinweis).toBeUndefined();
    }
  });

  it('PlanView-lokale Werkzeuge (Trace/Graph) tragen KEINEN Hinweis mehr (P10 v0.8.3: seit PD3a echte Registry-Inhalte, der PD2-Fallback war toter Text)', () => {
    for (const id of ['trace', 'graph']) {
      expect(werkzeug(id).hinweis).toBeUndefined();
    }
  });

  // PE2 (v0.8.4, C-27): der frühere «Panel ist immer aktiv»-Hinweis ist raus
  // — toter Text seit `inhalte/projekt.tsx` das echte, eingebettete Panel in
  // Stufe 3 zeigt (derselbe «Leiche»-Fund wie bei Trace/Graph, P10 v0.8.3).
  it('Immer-sichtbare Panels (Kennzahlen/Checks) tragen KEINEN Hinweis mehr (Stufe 3 zeigt das echte, eingebettete Panel)', () => {
    for (const id of ['kennzahlen', 'checks']) {
      expect(werkzeug(id).hinweis).toBeUndefined();
    }
  });

  it('verdrahtete Werkzeuge (echte Aktion vorhanden) tragen KEINEN Hinweis', () => {
    for (const id of [...ECHTE_TOOL_IDS, 'darstellung', 'sonne', 'ebenen', 'varianten', 'phase', 'liste', 'export', 'import', 'profil']) {
      expect(werkzeug(id).hinweis).toBeUndefined();
    }
  });

  // PE2 (v0.8.4, C-27 — «8 Rahmen-Werkzeuge echt oder Owner-sauber
  // geschlossen»): die alte toolId-Metrik («21 verdrahtet, 8 ohne Aktion»)
  // war zu eng — sie kannte nur `toolId`/eine feste Sonderfall-Liste, nicht
  // die Registry-Inhalte (Stufe2/Stufe3), über die Trace/Graph/Kennzahlen/
  // Checks/Rendern/Blätter/Sync seit P3/PD3a/PD3b (v0.8.3) längst ECHT
  // verdrahtet sind. Die 8 aus der alten Metrik sind exakt die Owner-
  // Mängelliste-«8 Rahmen-Werkzeuge» (`docs/V084-SPEZ.md` §1.1) — geprüft
  // gegen `registrierteWerkzeugIds()` (die echte, geladene Registry) zeigt
  // sich: 7 der 8 sind bereits echt, nur Achsen bleibt bewusst ohne Popup
  // (§4.4-Ausnahme, kein Rahmen — Owner-sauber geschlossen statt Attrappe).
  it('C-27: alle Popup-Werkzeuge sind in der Registry ECHT verdrahtet — nur Achsen (kein Popup, §4.4-Ausnahme) bleibt bewusst aussen vor (v0.9.1 P-B2: 27→29 gelaender/rampe, v0.9.2 P-P2: 29→30 profil, P-D-Nachzug: 30→31 detail, alle additiv mit hatPopup=true)', () => {
    const registriert = new Set(registrierteWerkzeugIds());
    const mitPopup = WERKZEUG_KATALOG.filter((w) => w.hatPopup);
    const ohnePopup = WERKZEUG_KATALOG.filter((w) => !w.hatPopup);
    expect(mitPopup).toHaveLength(31);
    expect(ohnePopup.map((w) => w.id).sort()).toEqual(['achsen', 'manuell']);
    for (const w of mitPopup) {
      expect(registriert.has(w.id), `${w.id} fehlt in der Registry`).toBe(true);
    }
    // Die ehemals «8 ohne Aktion» (alte toolId-Metrik) — 7 davon sind jetzt
    // nachweislich in der Registry, nur Achsen hat gar kein Popup.
    const ehemals8 = ['achsen', 'trace', 'graph', 'kennzahlen', 'checks', 'rendern', 'blaetter', 'sync'];
    const jetztEcht = ehemals8.filter((id) => registriert.has(id));
    expect(jetztEcht.sort()).toEqual(['blaetter', 'checks', 'graph', 'kennzahlen', 'rendern', 'sync', 'trace']);
    expect(registriert.has('achsen')).toBe(false);
  });

  it('werkzeugeFuerIsland liefert jetzt 14/6/7/6 (v0.9.1 P-B2: ZEICHNEN 11→13; v0.9.2 P-P2: PROJEKT 6→7 profil; P-D-Nachzug: ZEICHNEN 13→14 detail)', () => {
    expect(werkzeugeFuerIsland('zeichnen')).toHaveLength(14);
    expect(werkzeugeFuerIsland('ansicht')).toHaveLength(6);
    expect(werkzeugeFuerIsland('projekt')).toHaveLength(7);
    expect(werkzeugeFuerIsland('austausch')).toHaveLength(6);
  });
});
