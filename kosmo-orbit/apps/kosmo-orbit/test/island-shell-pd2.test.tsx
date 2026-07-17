// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IslandShell, IslandBuehne } from '../src/modules/design/island/IslandShell';
import type { IslandWerkzeug } from '../src/modules/design/island/island-katalog';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PD2 (`docs/ISLAND-UI-SPEZ.md` §7 PD2-Zeile, Bullet 1) — `onWerkzeugAktion`
 * (neues, optionales Prop von `IslandShell`/`IslandBuehne`) + der `hinweis`-
 * Rahmen im Popup. Eigene, NEUE Testdatei (additiv zu `island-shell.test.
 * tsx`, PD1 — DIESE bleibt unverändert und muss weiterhin ohne das neue Prop
 * grün sein, s. dort).
 *
 * Rendert über `createRoot`/`act`/`dispatchEvent` — dasselbe Muster wie
 * `island-shell.test.tsx` (kein `@testing-library/react` in diesem Workspace).
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

describe('IslandShell — onWerkzeugAktion (PD2, Erst-Aktivierung)', () => {
  it('ruft onWerkzeugAktion GENAU EINMAL beim ersten Klick auf ein Popup-Werkzeug (Wand)', () => {
    const aktion = vi.fn();
    render(<IslandShell island="zeichnen" onWerkzeugAktion={aktion} />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    expect(aktion).toHaveBeenCalledTimes(1);
    expect((aktion.mock.calls[0]![0] as IslandWerkzeug).id).toBe('wand');
  });

  it('ruft onWerkzeugAktion NICHT erneut bei der Eskalation Popup→Fenster (dasselbe Werkzeug)', () => {
    const aktion = vi.fn();
    render(<IslandShell island="zeichnen" onWerkzeugAktion={aktion} />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!); // Erst-Aktivierung
    klick(q('island-werkzeug-wand')!); // Eskalation zum Fenster
    expect(aktion).toHaveBeenCalledTimes(1);
  });

  it('ruft onWerkzeugAktion ERNEUT, wenn auf ein ANDERES Werkzeug gewechselt wird', () => {
    const aktion = vi.fn();
    render(<IslandShell island="zeichnen" onWerkzeugAktion={aktion} />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    klick(q('island-werkzeug-volumen')!);
    expect(aktion).toHaveBeenCalledTimes(2);
    expect((aktion.mock.calls[1]![0] as IslandWerkzeug).id).toBe('volumen');
  });

  it('ruft onWerkzeugAktion auch für Werkzeuge OHNE Popup (Manuell, hatPopup=false)', () => {
    const aktion = vi.fn();
    render(<IslandShell island="austausch" onWerkzeugAktion={aktion} />);
    hoverEnter(q('island-austausch-root')!);
    klick(q('island-werkzeug-manuell')!);
    expect(aktion).toHaveBeenCalledTimes(1);
    expect((aktion.mock.calls[0]![0] as IslandWerkzeug).id).toBe('manuell');
  });

  it('ohne Prop (PD1-Aufrufer) bleibt alles wie zuvor — kein Crash', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    expect(() => klick(q('island-werkzeug-wand')!)).not.toThrow();
    expect(q('island-wand-popup')).not.toBeNull();
  });

  it('IslandBuehne reicht onWerkzeugAktion an alle vier Islands durch', () => {
    const aktion = vi.fn();
    render(<IslandBuehne onWerkzeugAktion={aktion} />);
    hoverEnter(q('island-projekt-root')!);
    klick(q('island-werkzeug-kennzahlen')!);
    expect(aktion).toHaveBeenCalledTimes(1);
    expect((aktion.mock.calls[0]![0] as IslandWerkzeug).id).toBe('kennzahlen');
  });
});

describe('IslandShell — Popup-Hinweis für unverdrahtete Werkzeuge (PD2, ehrlich)', () => {
  it('Messen zeigt seit PD3a echten Stufe-2-Inhalt statt des Katalog-Hinweises', () => {
    // PD2 nutzte «Messen» als Beispiel eines unverdrahteten Werkzeugs; seit
    // PD3a ist es über die Inhalts-Registry voll registriert — der ehrliche
    // Fallback-Hinweis darf dann NICHT mehr erscheinen (IslandShell rendert
    // Registry-Inhalt zuerst; Fable-Gate-Nachzug am PD3-Gate).
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-messen')!);
    expect(q('island-messen-popup')).not.toBeNull();
    expect(q('island-messen-popup-hinweis')).toBeNull();
  });

  it('zeigt KEINEN Hinweistext im Popup eines verdrahteten Werkzeugs (Wand)', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-wand')!);
    expect(q('island-wand-popup-hinweis')).toBeNull();
  });

  it('der Hinweis wandert mit in die Eskalationsstufe Fenster', () => {
    render(<IslandShell island="zeichnen" />);
    hoverEnter(q('island-zeichnen-root')!);
    klick(q('island-werkzeug-messen')!);
    klick(q('island-werkzeug-messen')!); // Eskalation zum Fenster
    expect(q('island-messen-fenster-hinweis')).not.toBeNull();
  });
});
