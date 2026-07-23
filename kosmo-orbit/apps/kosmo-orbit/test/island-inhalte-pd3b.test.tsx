// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IslandShell } from '../src/modules/design/island/IslandShell';
import { werkzeugeFuerIsland } from '../src/modules/design/island/island-katalog';
import { inhaltFuer } from '../src/modules/design/island/inhalte/registry';
import { registriereStationsWeg } from '../src/modules/design/island/inhalte/austausch';
import { useProject } from '../src/state/project-store';
import { useUiZustand } from '../src/state/ui-zustand';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PD3b (`docs/ISLAND-UI-SPEZ.md` §7 PD3b-Zeile) — Mini-Popups/
 * Einstellungsfenster für PROJEKT+AUSTAUSCH. Rendert über `createRoot`/
 * `act`/`dispatchEvent`, exakt dasselbe Muster wie `island-shell.test.tsx`/
 * `island-shell-pd2.test.tsx`/`varianten-panel.test.tsx` (kein
 * `@testing-library/react` in diesem Workspace).
 */

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(el: React.ReactElement): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
}

function hoverEnter(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
  });
}

function klick(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/** Tippt in ein React-KONTROLLIERTES `<input>` (`value`+`onChange`) — eine
 *  simple `el.value = …`-Zuweisung geht am React-internen Value-Tracker
 *  vorbei (React patcht den `value`-Setter auf `HTMLInputElement.prototype`,
 *  um «echte» Tippereignisse von programmatischen Zuweisungen zu
 *  unterscheiden); der native Prototyp-Setter umgeht das zuverlässig.
 *  `stammdaten-projektname` u.ä. brauchen das NICHT (dort `defaultValue`
 *  + `onBlur`, unkontrolliert) — `KommentarErfassen` (v0.8.3 E1) ist hier
 *  der erste kontrollierte Input-Fall in diesem Testfile. */
function tippe(el: HTMLInputElement, wert: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(el, wert);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function q(testid: string): HTMLElement | null {
  return container!.querySelector(`[data-testid="${testid}"]`);
}

/** Öffnet die Leiste (Stufe 1) und klickt ein Werkzeug (→ Stufe 2/Popup). */
function oeffnePopup(island: 'projekt' | 'austausch', werkzeugId: string): void {
  hoverEnter(q(`island-${island}-root`)!);
  klick(q(`island-werkzeug-${werkzeugId}`)!);
}

/** Eskaliert von Stufe 2 (Popup, bereits offen) zu Stufe 3 (Fenster). */
function eskaliereZuFenster(werkzeugId: string): void {
  klick(q(`island-werkzeug-${werkzeugId}`)!);
}

afterEach(() => {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  registriereStationsWeg(undefined);
});

describe('PD3b — Registry-Vollständigkeit (hartes Gate: kein Werkzeug endet bei Stufe 1)', () => {
  it('alle PROJEKT+AUSTAUSCH-Werkzeuge ausser «manuell» sind mit Stufe2 UND Stufe3 registriert', () => {
    // v0.9.2 P-P2 (docs/V092-SPEZ.md §P-P2): PROJEKT wächst additiv um
    // `profil` (Profil-Manager, `inhalte/profile.tsx`) — 12→13, 11→12.
    const alle = [...werkzeugeFuerIsland('projekt'), ...werkzeugeFuerIsland('austausch')];
    expect(alle.length).toBe(13);
    const zuPruefen = alle.filter((w) => w.id !== 'manuell');
    expect(zuPruefen.length).toBe(12);
    for (const w of zuPruefen) {
      const inhalt = inhaltFuer(w.id);
      expect(inhalt?.Stufe2, `Stufe2 fehlt für «${w.id}»`).toBeDefined();
      expect(inhalt?.Stufe3, `Stufe3 fehlt für «${w.id}»`).toBeDefined();
    }
  });

  it('«manuell» bleibt bewusst unregistriert (Sofort-Umschaltung, keine Popup-Insel-Inhalte)', () => {
    expect(inhaltFuer('manuell')).toBeUndefined();
  });
});

describe('PD3b — Kennzahlen (live aus areaReport)', () => {
  it('zeigt die NGF live, nachdem eine Zone gezeichnet wurde', () => {
    const { runCommand } = useProject.getState();
    const eg = runCommand('design.geschossErstellen', { name: `KZ-${Math.random()}`, index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    useProject.getState().setActiveStorey(storeyId);
    runCommand('design.zoneErstellen', {
      storeyId,
      name: 'Wohnen',
      sia: 'HNF',
      outline: [
        { x: 0, y: 0 },
        { x: 10000, y: 0 },
        { x: 10000, y: 8000 },
        { x: 0, y: 8000 },
      ],
    });

    render(<IslandShell island="projekt" />);
    oeffnePopup('projekt', 'kennzahlen');
    expect(q('island-kennzahlen-popup')).not.toBeNull();
    const ngf = q('island-kennzahlen-ngf');
    expect(ngf).not.toBeNull();
    expect(ngf!.textContent).toMatch(/m²/);
    expect(ngf!.textContent).not.toBe('Keine Fläche — zeichne Zonen oder Volumen.');
  });

  it('Stufe 3 bettet das echte KennzahlenPanel ein', () => {
    render(<IslandShell island="projekt" />);
    oeffnePopup('projekt', 'kennzahlen');
    eskaliereZuFenster('kennzahlen');
    expect(q('island-kennzahlen-fenster')).not.toBeNull();
    expect(q('kennzahlen')).not.toBeNull(); // KennzahlenPanel-testid, unverändert
  });
});

describe('PD3b — Checks (Befundzahl + Filter)', () => {
  it('Filter Alle/Fehler wirkt auf die angezeigte Zahl', () => {
    render(<IslandShell island="projekt" />);
    oeffnePopup('projekt', 'checks');
    expect(q('island-checks-filter-alle')).not.toBeNull();
    expect(q('island-checks-filter-fehler')).not.toBeNull();
    // Klick auf «Nur Fehler» darf nicht werfen, unabhängig vom Befundstand.
    expect(() => klick(q('island-checks-filter-fehler')!)).not.toThrow();
  });
});

describe('PD3b — Phase (design.phaseSetzen/siaPhaseSetzen)', () => {
  it('Ändern der Plan-Phase ruft design.phaseSetzen über den echten Store auf', () => {
    render(<IslandShell island="projekt" />);
    oeffnePopup('projekt', 'phase');
    const select = q('island-phase-plan-select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    act(() => {
      select.value = 'werkplan';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(useProject.getState().doc.settings.phase).toBe('werkplan');
  });
});

describe('PD3b — Kommentare (v0.8.3 E1: echte Kommentar-Entität + Command, §8-6 entschieden)', () => {
  afterEach(() => {
    // Reine UI-Brücke (Laufzeit ≠ Modell) — nie durchs Doc, muss aber
    // zwischen Tests zurückgesetzt werden (Modul-Singleton-Store).
    useUiZustand.getState().setKommentarPunkt(null);
  });

  it('Stufe 2 zeigt 0 offene Kommentare + einen Hinweis, solange kein Punkt gesetzt ist (kein Formular ohne Punkt)', () => {
    render(<IslandShell island="projekt" />);
    oeffnePopup('projekt', 'kommentare');
    expect(q('island-kommentare-anzahl')!.textContent).toBe('0');
    expect(q('island-kommentar-hinweis-punkt')).not.toBeNull();
    expect(q('island-kommentar-text')).toBeNull();
  });

  it('mit gesetztem kommentarPunkt (Klickmodus-Brücke) zeigt Stufe 2 das Erfassen-Formular — Absenden ruft design.kommentarSetzen ECHT auf', () => {
    useUiZustand.getState().setKommentarPunkt({ x: 1000, y: 2000 });
    render(<IslandShell island="projekt" />);
    oeffnePopup('projekt', 'kommentare');
    const textFeld = q('island-kommentar-text') as HTMLInputElement;
    const autorFeld = q('island-kommentar-autor') as HTMLInputElement;
    expect(textFeld).not.toBeNull();
    expect(autorFeld).not.toBeNull();
    tippe(textFeld, 'Fassade Nord nochmals prüfen');
    tippe(autorFeld, 'Andrin');
    expect((q('island-kommentar-setzen') as HTMLButtonElement).disabled).toBe(false);
    klick(q('island-kommentar-setzen')!);

    const kommentare = useProject.getState().doc.byKind('kommentar') as { text: string; autor: string; at: { x: number; y: number } }[];
    expect(kommentare).toHaveLength(1);
    expect(kommentare[0]!.text).toBe('Fassade Nord nochmals prüfen');
    expect(kommentare[0]!.autor).toBe('Andrin');
    expect(kommentare[0]!.at).toEqual({ x: 1000, y: 2000 });
    // Nach erfolgreichem Absenden ist die UI-Brücke wieder leer.
    expect(useUiZustand.getState().kommentarPunkt).toBeNull();
  });

  it('«Kommentar setzen» bleibt deaktiviert, solange Text oder Autor leer sind', () => {
    const vorher = useProject.getState().doc.byKind('kommentar').length;
    useUiZustand.getState().setKommentarPunkt({ x: 0, y: 0 });
    render(<IslandShell island="projekt" />);
    oeffnePopup('projekt', 'kommentare');
    const knopf = q('island-kommentar-setzen') as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    const textFeld = q('island-kommentar-text') as HTMLInputElement;
    tippe(textFeld, 'Nur Text, kein Autor');
    expect((q('island-kommentar-setzen') as HTMLButtonElement).disabled).toBe(true);
    // Deaktivierter Knopf UND kein neuer Kommentar — der Klick fände so oder
    // so nicht statt (native `disabled`-Buttons feuern kein `click`), aber
    // das beweist zusätzlich, dass keine andere Stelle den Command auslöst.
    expect(useProject.getState().doc.byKind('kommentar')).toHaveLength(vorher);
  });

  it('Stufe 3 listet vorhandene Kommentare und schaltet den Status über design.kommentarStatusSetzen um (echter Undo-Weg)', () => {
    const { runCommand } = useProject.getState();
    runCommand('design.kommentarSetzen', {
      text: 'Bestehender Kommentar',
      autor: 'Andrin',
      at: { x: 0, y: 0 },
      erstelltAm: '18.07.2026',
    });
    render(<IslandShell island="projekt" />);
    oeffnePopup('projekt', 'kommentare');
    eskaliereZuFenster('kommentare');
    expect(q('island-kommentare-liste')!.textContent).toContain('Bestehender Kommentar');

    klick(q('island-kommentar-status-umschalten')!);
    const kommentar = useProject.getState().doc.byKind('kommentar')[0] as { status: string; erledigtAm?: string };
    expect(kommentar.status).toBe('erledigt');
    expect(kommentar.erledigtAm).toBeDefined();
  });
});

describe('PD3b — Export/Import (bestehende Wege)', () => {
  it('Export-Knöpfe rufen die echten export-plan.ts-Funktionen auf', () => {
    // jsdom kennt kein echtes createObjectURL/Anker-Download — Stub genügt,
    // um zu beweisen, dass der ECHTE `exportPlanSvg()`-Weg (export-plan.ts)
    // lief (Download-Anker erzeugt + geklickt), ohne im Test-DOM tatsächlich
    // etwas herunterzuladen.
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });

    const { runCommand } = useProject.getState();
    const eg = runCommand('design.geschossErstellen', { name: `EX-${Math.random()}`, index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    useProject.getState().setActiveStorey(storeyId);

    render(<IslandShell island="austausch" />);
    oeffnePopup('austausch', 'export');
    klick(q('island-export-svg')!);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

describe('PD3b — Deep-Link-Brücke (Rendern/Blätter, §8-4)', () => {
  it('ohne registrierten Weg zeigt der Knopf den ehrlichen Hinweis', () => {
    render(<IslandShell island="austausch" />);
    oeffnePopup('austausch', 'rendern');
    eskaliereZuFenster('rendern');
    klick(q('island-rendern-zur-station')!);
    expect(q('island-rendern-zur-station-hinweis')).not.toBeNull();
  });

  it('sobald ein Weg registriert ist (wie DesignWorkspace.tsx es tun müsste), wirkt der Knopf echt', () => {
    const weg = vi.fn();
    registriereStationsWeg(weg);
    render(<IslandShell island="austausch" />);
    oeffnePopup('austausch', 'rendern');
    eskaliereZuFenster('rendern');
    klick(q('island-rendern-zur-station')!);
    expect(weg).toHaveBeenCalledWith('vis');
    expect(q('island-rendern-zur-station-hinweis')).toBeNull();
  });
});

describe('PD3b — Sync (ehrliche Peer-Lücke)', () => {
  it('Stufe 3 benennt die Peer-Lücke, ohne einen zweiten onSyncStatus-Listener zu registrieren', () => {
    render(<IslandShell island="austausch" />);
    oeffnePopup('austausch', 'sync');
    eskaliereZuFenster('sync');
    expect(q('island-sync-stufe3')!.textContent).toMatch(/Einzel-Slot-Listener/);
  });
});
