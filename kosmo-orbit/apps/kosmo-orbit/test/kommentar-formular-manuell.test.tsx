// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { KommentarErfassenAmPunkt } from '../src/modules/design/island/inhalte/kommentar-formular';
import { useProject } from '../src/state/project-store';
import { useUiZustand } from '../src/state/ui-zustand';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * D11 (PB3, `docs/V085-SPEZ.md` §2 D11 + §7 C-20) — Unit-Beweis für den
 * Manuell-Modus-Zugang des Kommentar-Erfassens (`kommentar-formular.tsx`s
 * `KommentarErfassenAmPunkt`). Rendert über `createRoot`/`act`/
 * `dispatchEvent`, exakt dasselbe Muster wie `island-inhalte-pd3b.test.tsx`
 * (kein `@testing-library/react` in diesem Workspace).
 *
 * **Ehrliche Lücke (s. PB3-Abschlussbericht):** dieser Test beweist die
 * KOMPONENTE isoliert (Sichtbarkeits-Guards + Formular-Mechanik über
 * `toScreen`) — NICHT den vollen End-zu-End-Weg «K drücken → im Plan
 * klicken → Formular erscheint am richtigen Bildschirmpunkt». Das
 * tatsächliche MOUNTEN in `PlanView.tsx` (Analogie zum dortigen
 * `SketchOverlay`-`toScreen`-Prop-Muster, Zeile ~1998-2020) ist PB1-
 * Hotspot-Gebiet (`docs/V085-SPEZ.md` §4) und bleibt ein dokumentierter
 * Fable-Nachzug — dieser Test verifiziert den Baustein, den PB1/Fable dort
 * mit minimalem Aufwand einhängen kann.
 */

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(el: React.ReactElement): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
}

function klick(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

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

const IDENTITAET_TO_SCREEN = (p: { x: number; y: number }) => ({ x: p.x, y: p.y });

afterEach(() => {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  useUiZustand.getState().setKommentarPunkt(null);
  useUiZustand.getState().setDesignOberflaeche('island');
});

describe('D11 — KommentarErfassenAmPunkt (Manuell-Modus-Zugang)', () => {
  it('rendert NICHTS im Island-Modus, selbst mit gesetztem kommentarPunkt (kein zweiter, kollidierender Zugang)', () => {
    useUiZustand.getState().setDesignOberflaeche('island');
    useUiZustand.getState().setKommentarPunkt({ x: 100, y: 200 });
    render(<KommentarErfassenAmPunkt toScreen={IDENTITAET_TO_SCREEN} />);
    expect(q('manuell-kommentar-erfassen-anker')).toBeNull();
  });

  it('rendert NICHTS im Manuell-Modus ohne gesetzten kommentarPunkt (kein Formular ohne Punkt)', () => {
    useUiZustand.getState().setDesignOberflaeche('manuell');
    useUiZustand.getState().setKommentarPunkt(null);
    render(<KommentarErfassenAmPunkt toScreen={IDENTITAET_TO_SCREEN} />);
    expect(q('manuell-kommentar-erfassen-anker')).toBeNull();
  });

  it('Manuell-Modus + gesetzter Punkt: zeigt das Formular an der `toScreen`-Position, Absenden ruft design.kommentarSetzen ECHT auf', () => {
    useUiZustand.getState().setDesignOberflaeche('manuell');
    useUiZustand.getState().setKommentarPunkt({ x: 1500, y: 2500 });
    render(<KommentarErfassenAmPunkt toScreen={(p) => ({ x: p.x / 10, y: p.y / 10 })} />);

    const anker = q('manuell-kommentar-erfassen-anker');
    expect(anker).not.toBeNull();
    expect(anker!.style.left).toBe('150px');
    expect(anker!.style.top).toBe('250px');

    const textFeld = q('manuell-kommentar-text') as HTMLInputElement;
    const autorFeld = q('manuell-kommentar-autor') as HTMLInputElement;
    expect(textFeld).not.toBeNull();
    expect(autorFeld).not.toBeNull();
    tippe(textFeld, 'Fenster-Anschlag prüfen');
    tippe(autorFeld, 'Andrin');
    expect((q('manuell-kommentar-setzen') as HTMLButtonElement).disabled).toBe(false);
    klick(q('manuell-kommentar-setzen')!);

    const kommentare = useProject
      .getState()
      .doc.byKind('kommentar') as { text: string; autor: string; at: { x: number; y: number } }[];
    expect(kommentare).toHaveLength(1);
    expect(kommentare[0]!.text).toBe('Fenster-Anschlag prüfen');
    expect(kommentare[0]!.autor).toBe('Andrin');
    expect(kommentare[0]!.at).toEqual({ x: 1500, y: 2500 });
    // Nach erfolgreichem Absenden ist die UI-Brücke wieder leer — derselbe
    // Vertrag wie der Insel-Zugang (`island-inhalte-pd3b.test.tsx`).
    expect(useUiZustand.getState().kommentarPunkt).toBeNull();
  });

  it('«Kommentar setzen» bleibt deaktiviert, solange Text oder Autor leer sind (dieselbe Validierung wie der Insel-Zugang)', () => {
    const vorher = useProject.getState().doc.byKind('kommentar').length;
    useUiZustand.getState().setDesignOberflaeche('manuell');
    useUiZustand.getState().setKommentarPunkt({ x: 0, y: 0 });
    render(<KommentarErfassenAmPunkt toScreen={IDENTITAET_TO_SCREEN} />);
    const knopf = q('manuell-kommentar-setzen') as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    const textFeld = q('manuell-kommentar-text') as HTMLInputElement;
    tippe(textFeld, 'Nur Text, kein Autor');
    expect((q('manuell-kommentar-setzen') as HTMLButtonElement).disabled).toBe(true);
    expect(useProject.getState().doc.byKind('kommentar')).toHaveLength(vorher);
  });
});
