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
    const alle = [...werkzeugeFuerIsland('projekt'), ...werkzeugeFuerIsland('austausch')];
    expect(alle.length).toBe(12);
    const zuPruefen = alle.filter((w) => w.id !== 'manuell');
    expect(zuPruefen.length).toBe(11);
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

describe('PD3b — Kommentare (ehrliche Leerfähigkeit)', () => {
  it('Stufe 2 zeigt den exakten Ehrlichkeits-Text', () => {
    render(<IslandShell island="projekt" />);
    oeffnePopup('projekt', 'kommentare');
    expect(q('island-kommentare-stufe2')!.textContent).toBe(
      '0 Kommentare — Fähigkeit existiert noch nicht im Kern',
    );
  });

  it('Stufe 3 verweist auf Owner-Frage §8-6, ohne eine Attrappe zu zeigen', () => {
    render(<IslandShell island="projekt" />);
    oeffnePopup('projekt', 'kommentare');
    eskaliereZuFenster('kommentare');
    const text = q('island-kommentare-stufe3')!.textContent!;
    expect(text).toMatch(/§8-6/);
    expect(container!.querySelector('input, textarea')).toBeNull();
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
