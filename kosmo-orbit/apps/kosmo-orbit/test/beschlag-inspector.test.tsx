// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { Inspector } from '../src/modules/design/Inspector';
import { useProject } from '../src/state/project-store';
import type { Opening } from '@kosmo/kernel';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Beschlag-Katalog S2 (v0.7.5 Welle 1 A1) — Inspector-Mehrfachauswahl.
 * Rendert wie `varianten-panel.test.tsx` über einen echten `createRoot` in
 * jsdom (zustand@5 liefert `useStore` nur über den Client-Pfad den echten
 * Live-Zustand, `renderToStaticMarkup`/SSR sähe immer nur den Store-
 * Anfangszustand — s. dortiger Befund).
 */

function tuerErstellen(): string {
  const { runCommand } = useProject.getState();
  const eg = runCommand('design.geschossErstellen', { name: `Test-${Math.random()}`, index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = runCommand('design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [
      { material: 'beton', thickness: 250, function: 'tragend' },
      { material: 'daemmung', thickness: 160, function: 'daemmung' },
    ],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = runCommand('design.wandZeichnen', { storeyId, a: { x: 0, y: 0 }, b: { x: 8000, y: 0 }, assemblyId });
  const wallId = (wand.patches[0] as { id: string }).id;
  const oeffnung = runCommand('design.oeffnungSetzen', {
    wallId,
    openingType: 'tuer',
    center: 4000,
    width: 1000,
    height: 2100,
    sill: 0,
  });
  return (oeffnung.patches[0] as { id: string }).id;
}

describe('Inspector — Beschlag-Katalog S2 (Mehrfachauswahl, gruppiert nach Kategorie)', () => {
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

  it('zeigt die drei Kategorien und schreibt einen Klick als design.beschlaegeSetzen (mit Undo)', () => {
    const openingId = tuerErstellen();
    useProject.getState().select([openingId]);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<Inspector />);
    });

    // Gruppierung nach Kategorie sichtbar (Tür/Fenster/Sicherheit).
    expect(container.textContent).toContain('Tür');
    expect(container.textContent).toContain('Fenster');
    expect(container.textContent).toContain('Sicherheit');

    const checkbox = container.querySelector(
      '[data-testid="beschlag-s2-tuerdruecker-garnitur"]',
    ) as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);

    act(() => checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));

    expect(useProject.getState().doc.get<Opening>(openingId)!.beschlaege).toEqual(['tuerdruecker-garnitur']);

    // Re-Render nach dem Command holt den neuen `entity`-Stand (Inspector
    // liest per useMemo über `revision`) — die Checkbox muss jetzt an sein.
    const checkboxNachher = container.querySelector(
      '[data-testid="beschlag-s2-tuerdruecker-garnitur"]',
    ) as HTMLInputElement;
    expect(checkboxNachher.checked).toBe(true);

    // Zweiter Katalog-Typ dazu (additiv über die volle Liste, wie der Command
    // sie ersetzt — der Inspector rechnet die neue Gesamtliste selbst aus).
    const zweiterCheckbox = container.querySelector(
      '[data-testid="beschlag-s2-einsteckschloss"]',
    ) as HTMLInputElement;
    act(() => zweiterCheckbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
    expect(useProject.getState().doc.get<Opening>(openingId)!.beschlaege).toEqual([
      'tuerdruecker-garnitur',
      'einsteckschloss',
    ]);

    // Abwählen entfernt wieder nur den einen Typ.
    const ersterCheckboxErneut = container.querySelector(
      '[data-testid="beschlag-s2-tuerdruecker-garnitur"]',
    ) as HTMLInputElement;
    act(() => ersterCheckboxErneut.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
    expect(useProject.getState().doc.get<Opening>(openingId)!.beschlaege).toEqual(['einsteckschloss']);

    act(() => useProject.getState().undo());
    act(() => useProject.getState().undo());
    act(() => useProject.getState().undo());
    expect(useProject.getState().doc.get<Opening>(openingId)!.beschlaege).toBeUndefined();
  });
});
