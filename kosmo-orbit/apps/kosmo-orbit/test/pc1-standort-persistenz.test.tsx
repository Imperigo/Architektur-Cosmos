// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { History, KosmoDoc } from '@kosmo/kernel';
import { useProject } from '../src/state/project-store';
import { StandortSuche } from '../src/modules/design/DesignWorkspace';
import { KosmoDataProjektStandort } from '../src/modules/data/DataWorkspace';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * v0.8.6 PC1 (`docs/V086-SPEZ.md` E6/D7/C-17) — Standort-Persistenz:
 * `design.standortAdresseSetzen` (Kernel-Suite: `packages/kosmo-kernel/test/
 * standort-setzen.test.ts`) läuft über die StandortSuche (DesignWorkspace)
 * UND wird in KosmoData angezeigt. Diese Suite prüft die App-seitige
 * Verdrahtung: StandortSuche schreibt das Setting nach einem gewählten
 * Treffer, KosmoData zeigt LV95+Adresse bzw. den ehrlichen Leer-Zustand,
 * Undo entfernt ihn wieder — analog `stammdaten-panel.test.tsx` (echter
 * `createRoot` in jsdom, zustand@5 braucht den Client-Pfad für den echten
 * Live-Zustand).
 */

/** React patcht den nativen `value`-Setter von `<input>`, um Fremdänderungen
 * zu erkennen — ein simples `input.value = x` VOR dem Dispatch geht durch
 * denselben gepatchten Setter und aktualisiert Reacts internen Value-Tracker
 * gleich mit, wodurch der anschliessende `input`-Event NICHT als Änderung
 * erkannt wird (kontrollierte Inputs, `value={text}`). Fix: über den
 * UNGEPATCHTEN nativen Setter schreiben (Standard-RTL-Workaround). */
function setzeControlledInputValue(input: HTMLInputElement, wert: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, wert);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function frischesDoc(): void {
  useProject.setState({
    doc: new KosmoDoc(),
    history: new History(),
    journal: [],
    revision: 0,
    activeStoreyId: null,
    selection: [],
    meshEditId: null,
  });
}

describe('KosmoDataProjektStandort — Leer-Zustand vs. gesetzter Standort (C-17)', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    frischesDoc();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  it('zeigt «Kein Standort gesetzt», solange kein standortAdresse gesetzt ist', () => {
    act(() => {
      root!.render(<KosmoDataProjektStandort />);
    });
    const leer = container!.querySelector('[data-testid="data-projekt-standort-leer"]');
    expect(leer).not.toBeNull();
    expect(leer!.textContent).toContain('Kein Standort gesetzt');
    expect(container!.querySelector('[data-testid="data-projekt-standort"]')).toBeNull();
  });

  it('zeigt Adresse + LV95 + Abrufdatum, sobald design.standortAdresseSetzen gelaufen ist; Undo bringt den Leer-Zustand zurück', () => {
    act(() => {
      useProject.getState().runCommand('design.standortAdresseSetzen', {
        adresse: 'Musterstrasse 1, 6300 Zug',
        lv95: { e: 2681512, n: 1224508 },
        quelle: 'geoadmin',
        abgerufenAm: '2026-07-19T10:00:00.000Z',
      });
    });
    act(() => {
      root!.render(<KosmoDataProjektStandort />);
    });
    const karte = container!.querySelector('[data-testid="data-projekt-standort"]');
    expect(karte).not.toBeNull();
    expect(karte!.textContent).toContain('Musterstrasse 1, 6300 Zug');
    expect(karte!.textContent).toContain('2681512');
    expect(karte!.textContent).toContain('1224508');
    expect(container!.querySelector('[data-testid="data-projekt-standort-leer"]')).toBeNull();

    act(() => useProject.getState().undo());
    act(() => {
      root!.render(<KosmoDataProjektStandort />);
    });
    expect(container!.querySelector('[data-testid="data-projekt-standort-leer"]')).not.toBeNull();
    expect(container!.querySelector('[data-testid="data-projekt-standort"]')).toBeNull();
  });
});

describe('StandortSuche — ein gewählter Treffer schreibt design.standortAdresseSetzen zusätzlich zu design.standortSetzen (E6)', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    frischesDoc();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
    globalThis.fetch = origFetch;
  });

  it('Suchen → Treffer wählen → BEIDE Standort-Commands liefen, doc.settings.standortAdresse trägt LV95+Adresse+Quelle+Zeitstempel', async () => {
    globalThis.fetch = vi.fn(async (url: unknown) => {
      expect(String(url)).toContain('SearchServer');
      return {
        ok: true,
        json: async () => ({
          results: [
            { attrs: { label: '<b>Musterstrasse 1 Zug</b>', lat: 47.17, lon: 8.52, y: 2681500, x: 1224500 } },
          ],
        }),
      };
    }) as unknown as typeof fetch;

    act(() => {
      root!.render(<StandortSuche />);
    });

    const suchInput = container!.querySelector('[data-testid="standort-suche"]') as HTMLInputElement;
    act(() => {
      suchInput.focus();
      setzeControlledInputValue(suchInput, 'Musterstrasse 1');
    });

    const suchenBtn = container!.querySelector('[data-testid="standort-suchen"]') as HTMLButtonElement;
    await act(async () => {
      suchenBtn.click();
    });
    // fetch() UND res.json() sind beide async — mehrere Mikrotask-/Makrotask-
    // Runden abwarten, bis setTreffer() den Treffer-Button rendert.
    await vi.waitFor(() => {
      expect(container!.querySelector('[data-testid="standort-treffer"] button')).not.toBeNull();
    });

    const trefferBtn = container!.querySelector('[data-testid="standort-treffer"] button') as HTMLButtonElement;
    expect(trefferBtn).not.toBeNull();
    expect(trefferBtn.textContent).toBe('Musterstrasse 1 Zug');

    act(() => {
      trefferBtn.click();
    });

    // design.standortSetzen (bestehend, WGS84/LV95 fürs Sonnenstudien-
    // Fundament) UND design.standortAdresseSetzen (neu, E6) sind BEIDE
    // gelaufen — zwei unabhängige Doc-Settings derselben Auswahl.
    const { doc } = useProject.getState();
    expect(doc.settings.standort).toEqual(
      expect.objectContaining({ label: 'Musterstrasse 1 Zug', e: 2681500, n: 1224500 }),
    );
    expect(doc.settings.standortAdresse).toEqual(
      expect.objectContaining({
        adresse: 'Musterstrasse 1 Zug',
        lv95: { e: 2681500, n: 1224500 },
        quelle: 'geoadmin',
      }),
    );
    expect(typeof doc.settings.standortAdresse?.abgerufenAm).toBe('string');
    expect(() => new Date(doc.settings.standortAdresse!.abgerufenAm).toISOString()).not.toThrow();

    // Reload-Beweis im Block selbst: der Selektor liest den persistierten
    // Wert (kein Rerun der Suche nötig) — ein Re-Render zeigt ihn sofort.
    act(() => {
      root!.render(<StandortSuche />);
    });
    const aktuell = container!.querySelector('[data-testid="standort-adresse-aktuell"]');
    expect(aktuell).not.toBeNull();
    expect(aktuell!.textContent).toContain('Musterstrasse 1 Zug');
    expect(aktuell!.textContent).toContain('2681500');
    expect(aktuell!.textContent).toContain('1224500');

    // Ctrl+Z-Vertrag (C-17): Undo entfernt das SettingsPatch — zwei
    // Commands liefen (standortSetzen + standortAdresseSetzen), also zwei
    // Undo-Schritte bis zur Abwesenheit.
    act(() => useProject.getState().undo());
    act(() => useProject.getState().undo());
    expect(useProject.getState().doc.settings.standortAdresse).toBeFalsy();
  });
});
