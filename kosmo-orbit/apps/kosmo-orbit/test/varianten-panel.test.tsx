// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VariantenPanel } from '../src/modules/design/VariantenPanel';
import { useProject } from '../src/state/project-store';
import type { Zone } from '@kosmo/kernel';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * v0.7.0 (Stream 5A, E5-i/iii) — `VariantenPanel.tsx`.
 *
 * WICHTIGER BEFUND (dieser Test-Datei): `renderToStaticMarkup` (Muster von
 * `popup-layout.test.tsx`) ist für Komponenten, die `useProject`/`useUiZustand`
 * (zustand) lesen, UNGEEIGNET — zustand@5s `useStore` reicht React als
 * `getServerSnapshot` bewusst `api.getInitialState()` durch (den EINFRIER-
 * Stand bei `create()`, siehe `node_modules/zustand/esm/react.mjs`), nicht
 * den LIVE-Stand. Ein SSR-Render sieht darum IMMER den Store-Anfangszustand,
 * unabhängig davon, wie viele `runCommand()`-Aufrufe vorher liefen. Dieser
 * Test rendert deshalb wie `node-canvas-pan.test.tsx` über einen echten
 * `createRoot` in jsdom (Client-Pfad, `getSnapshot`, liest den echten
 * Live-Zustand).
 *
 * Die Zeitscheiben-/Übernehmen-/Undo-Kette läuft hier mit ECHTEN Timern
 * (kein Fake-Timer-Vorlauf) — der Generator terminiert laut API-Vertrag NIE
 * von selbst, ein `vi.advanceTimersByTime`-Drain könnte sich also selbst
 * ohne Fortschritt der virtuellen Uhr endlos nachplanen. ZWEITER BEFUND: das
 * reale Warten selbst darf NICHT in `act(async () => await new Promise(...))`
 * eingepackt werden — Reacts `act()` wartet, bis keine Updates mehr
 * ausstehen, und da die Zeitscheibe sich (solange «laeuft») IMMER die
 * nächste selbst nachplant, gibt es diesen Ruhepunkt hier nie: `act()` hängt
 * dann für immer. Der Klick (`start`/`stopp`/`uebernehmen`) bleibt in
 * `act()`, das reine Warten dazwischen ist ein nackter `await` auf
 * `setTimeout` — die Zeitscheiben committen ihre Updates trotzdem (React
 * committet ausserhalb von `act()` genauso, nur ohne dessen Test-Sync-
 * Garantie), nur die üblichen Dev-Warnungen «not wrapped in act» erscheinen
 * dabei in der Konsole — erwartet und harmlos für diesen Dauerlauf-Fall.
 */

const FOOTPRINT = [
  { x: 0, y: 0 },
  { x: 30000, y: 0 },
  { x: 30000, y: 14000 },
  { x: 0, y: 14000 },
];
const KORRIDOR = [
  { x: 0, y: 6000 },
  { x: 30000, y: 6000 },
  { x: 30000, y: 8000 },
  { x: 0, y: 8000 },
];

function neuesGeschossMitKontext(): string {
  const { runCommand } = useProject.getState();
  const eg = runCommand('design.geschossErstellen', { name: `Test-${Math.random()}`, index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  runCommand('design.zoneErstellen', { storeyId, name: 'Regelgeschoss', sia: 'KF', outline: FOOTPRINT });
  runCommand('design.zoneErstellen', { storeyId, name: 'Korridor', sia: 'VF', raumTyp: 'korridor', outline: KORRIDOR });
  runCommand('design.raumprogrammSetzen', { posten: [{ typ: 'preisguenstig', hnfSoll: 300 }] });
  return storeyId;
}

async function warte(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('VariantenPanel — Kontext-Erkennung (v0.7.0 Stream 5A)', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

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

  it('ohne Footprint/Korridor/Raumprogramm: Start deaktiviert, ehrlicher Hinweis statt still leerer Suche', () => {
    const { runCommand } = useProject.getState();
    const eg = runCommand('design.geschossErstellen', { name: `Leer-${Math.random()}`, index: 0, elevation: 0, height: 3000 });
    const storeyId = (eg.patches[0] as { id: string }).id;
    useProject.getState().setActiveStorey(storeyId);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<VariantenPanel onClose={() => {}} />);
    });

    expect(container.querySelector('[data-testid="varianten-panel"]')).not.toBeNull();
    expect(container.textContent).toContain('Footprint- und Korridor-Zone');
    const start = container.querySelector('[data-testid="varianten-panel-start"]') as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    expect(container.querySelector('[data-testid="varianten-panel-zaehler"]')?.textContent).toContain('0 Varianten geprüft');
  });

  it('mit Footprint+Korridor+Raumprogramm: Start aktiv, vier Gewichte-Slider (Default ×1.0), Seed-Feld', () => {
    const storeyId = neuesGeschossMitKontext();
    useProject.getState().setActiveStorey(storeyId);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<VariantenPanel onClose={() => {}} />);
    });

    expect(container.textContent).not.toContain('Footprint- und Korridor-Zone');
    const start = container.querySelector('[data-testid="varianten-panel-start"]') as HTMLButtonElement;
    expect(start.disabled).toBe(false);
    for (const k of ['programmErfuellung', 'kompaktheit', 'mixTreue', 'flaechenNutzung']) {
      const slider = container.querySelector(`[data-testid="varianten-panel-gewicht-${k}"]`) as HTMLInputElement;
      expect(slider).not.toBeNull();
      expect(slider.value).toBe('1');
    }
    expect(container.querySelector('[data-testid="varianten-panel-seed"]')).not.toBeNull();
  });

  it('Start → Zähler wächst über echte Zeitscheiben; Stopp hält an; Übernehmen schreibt Zonen (1 Undo)', async () => {
    // Die Zeitscheiben committen ihre Updates ausserhalb von act() (s.o.) —
    // React protokolliert das ehrlich als Dev-Warnung. Hier bewusst
    // stummgeschaltet, damit sie das CI-Log nicht mit erwartetem Rauschen
    // fluten; KEINE anderen console.error-Aufrufe sind in diesem Test zu
    // erwarten (kein `mockRestore`-Verlust einer echten Fehlermeldung).
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storeyId = neuesGeschossMitKontext();
    useProject.getState().setActiveStorey(storeyId);
    const vorherZonen = useProject.getState().doc.byKind<Zone>('zone').length;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<VariantenPanel onClose={() => {}} />);
    });

    const start = container.querySelector('[data-testid="varianten-panel-start"]') as HTMLButtonElement;
    act(() => start.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    // Ein paar echte Zeitscheiben laufen lassen (setTimeout(0)-Fallback,
    // jsdom kennt requestIdleCallback nicht) — 400 ms real reichen bei Weitem
    // (Messung: mehrere Tausend Varianten/Sekunde auf dieser Fixture).
    await warte(400);

    const zaehlerText = container.querySelector('[data-testid="varianten-panel-zaehler"]')?.textContent ?? '';
    expect(Number(zaehlerText.split(' ')[0])).toBeGreaterThan(20);
    const karte0 = container.querySelector('[data-testid="varianten-panel-karte-0"]');
    expect(karte0).not.toBeNull();
    expect(container.querySelector('[data-testid="varianten-panel-score-0"]')?.textContent).toMatch(/\d+ %/);

    const stopp = container.querySelector('[data-testid="varianten-panel-stopp"]') as HTMLButtonElement;
    expect(stopp).not.toBeNull();
    act(() => stopp.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    // Nach Stopp ist wieder der Start-Knopf da (laeuft=false).
    expect(container.querySelector('[data-testid="varianten-panel-start"]')).not.toBeNull();

    const uebernehmen = container.querySelector('[data-testid="varianten-panel-uebernehmen-0"]') as HTMLButtonElement;
    act(() => uebernehmen.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    const nachher = useProject.getState().doc.byKind<Zone>('zone').length;
    expect(nachher).toBeGreaterThan(vorherZonen);

    useProject.getState().undo();
    expect(useProject.getState().doc.byKind<Zone>('zone').length).toBe(vorherZonen);

    consoleError.mockRestore();
  });
});
