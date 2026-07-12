// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { StammdatenPanel } from '../src/modules/design/StammdatenPanel';
import { useProject } from '../src/state/project-store';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Projekt-Stammdaten-Panel (v0.7.5 Welle 2 A2) — analog
 * `beschlag-inspector.test.tsx`: echter `createRoot` in jsdom (zustand@5
 * liefert `useStore` nur über den Client-Pfad den echten Live-Zustand).
 */

describe('StammdatenPanel', () => {
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

  it('zeigt die Felder leer bei frischem Projekt und schreibt Blur als design.projektInfoSetzen/design.projektNameSetzen (mit Undo)', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<StammdatenPanel />);
    });

    const bauherrInput = container.querySelector('[data-testid="stammdaten-bauherr"]') as HTMLInputElement;
    const projektnameInput = container.querySelector('[data-testid="stammdaten-projektname"]') as HTMLInputElement;
    expect(bauherrInput).not.toBeNull();
    expect(bauherrInput.value).toBe('');
    expect(projektnameInput.value).toBe('Unbenannt');

    // Projektname umbenennen (Blur committet).
    act(() => {
      projektnameInput.focus();
      projektnameInput.value = 'Wohnhaus Ahornweg';
      projektnameInput.dispatchEvent(new Event('input', { bubbles: true }));
      projektnameInput.blur();
    });
    expect(useProject.getState().doc.settings.projectName).toBe('Wohnhaus Ahornweg');

    // Bauherr setzen (Blur committet) — Re-Render zeigt den neuen Wert im Feld.
    act(() => {
      root!.render(<StammdatenPanel />);
    });
    const bauherrInputNeu = container.querySelector('[data-testid="stammdaten-bauherr"]') as HTMLInputElement;
    act(() => {
      bauherrInputNeu.focus();
      bauherrInputNeu.value = 'Baugenossenschaft Ahorn';
      bauherrInputNeu.dispatchEvent(new Event('input', { bubbles: true }));
      bauherrInputNeu.blur();
    });
    expect(useProject.getState().doc.settings.projekt?.bauherr).toBe('Baugenossenschaft Ahorn');

    act(() => {
      root!.render(<StammdatenPanel />);
    });
    const bauherrInputNachher = container.querySelector('[data-testid="stammdaten-bauherr"]') as HTMLInputElement;
    expect(bauherrInputNachher.value).toBe('Baugenossenschaft Ahorn');

    // Verfasser zusätzlich setzen — additiv, Bauherr bleibt stehen.
    const verfasserInput = container.querySelector('[data-testid="stammdaten-verfasser"]') as HTMLInputElement;
    act(() => {
      verfasserInput.focus();
      verfasserInput.value = 'Baubüro Andrin';
      verfasserInput.dispatchEvent(new Event('input', { bubbles: true }));
      verfasserInput.blur();
    });
    expect(useProject.getState().doc.settings.projekt).toEqual({
      bauherr: 'Baugenossenschaft Ahorn',
      verfasser: 'Baubüro Andrin',
    });

    // Undo läuft über den Command-Weg wie jede andere Mutation.
    act(() => useProject.getState().undo());
    expect(useProject.getState().doc.settings.projekt?.verfasser).toBeUndefined();
    act(() => useProject.getState().undo());
    expect(useProject.getState().doc.settings.projekt?.bauherr).toBeUndefined();
    act(() => useProject.getState().undo());
    expect(useProject.getState().doc.settings.projectName).toBe('Unbenannt');
  });
});
