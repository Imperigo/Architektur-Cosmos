// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KosmoSymbol } from '../src/shell/KosmoSymbol';
import { KosmoOrb as IslandKosmoOrb } from '../src/modules/design/island/KosmoOrb';
import { KOSMO_ORB_KLICK_VERZOEGERUNG_MS } from '../src/shell/KosmoOrb';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PB4 (`docs/V084-SPEZ.md` §3 E2 «Orb-Gesetz») — Regressionsschutz für die
 * Tabelle über die BEIDEN Orb-Erscheinungen, die im PB4-Dateikreis liegen
 * (`shell/KosmoSymbol.tsx`, `modules/design/island/KosmoOrb.tsx`):
 * Einfachklick öffnet die Konversationskarte (verzögert um
 * `KOSMO_ORB_KLICK_VERZOEGERUNG_MS`, `shell/KosmoOrb.tsx`s geteilter
 * `useKlickVsDoppelklick`-Hook), Doppelklick überspringt sie direkt zum
 * Panel (`onOpen`/`onKosmoOeffnen`), Esc/Aussenklick schliessen die Karte
 * (`useOverlaySchliessen`-Rollout). E2E deckt dieselbe Tabelle zusätzlich
 * end-to-end ab (`e2e/pb4-orb-gesetz.spec.ts`) — dieser Unit-Test hält die
 * Zeit-Disambiguierung (Timer-Ebene) fest, die im Browser real, aber in
 * Playwright schwer deterministisch zu treffen ist.
 */

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(el: React.ReactElement): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
}

function q(testid: string): HTMLElement | null {
  return container!.querySelector(`[data-testid="${testid}"]`);
}

function klickEreignis(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function doppelklickEreignis(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  });
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
  vi.useRealTimers();
});

describe('KosmoSymbol — Orb-Gesetz (E2-Tabelle)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('Einfachklick öffnet NICHT sofort das Panel, sondern nach der Verzögerung die Konversationskarte', () => {
    const onOpen = vi.fn();
    render(<KosmoSymbol onOpen={onOpen} />);
    klickEreignis(q('kosmo-symbol')!);
    expect(q('kosmo-karte')).toBeNull();
    expect(onOpen).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(KOSMO_ORB_KLICK_VERZOEGERUNG_MS);
    });
    expect(q('kosmo-karte')).not.toBeNull();
    expect(onOpen).not.toHaveBeenCalled();
    // Echter Vorschlagstext, kein leerer Platzhalter.
    expect((q('kosmo-karte-text')!.textContent ?? '').trim().length).toBeGreaterThan(0);
  });

  it('Doppelklick storniert den wartenden Klick-Timer und öffnet das Panel direkt — die Karte bleibt zu', () => {
    const onOpen = vi.fn();
    render(<KosmoSymbol onOpen={onOpen} />);
    const symbol = q('kosmo-symbol')!;
    klickEreignis(symbol);
    doppelklickEreignis(symbol);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(q('kosmo-karte')).toBeNull();

    // Der ursprüngliche Klick-Timer wurde storniert — auch nach Ablauf der
    // vollen Verzögerung öffnet sich die Karte NICHT nachträglich.
    act(() => {
      vi.advanceTimersByTime(KOSMO_ORB_KLICK_VERZOEGERUNG_MS + 50);
    });
    expect(q('kosmo-karte')).toBeNull();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('«Antworten» in der Karte öffnet ebenfalls das Panel und schliesst die Karte', () => {
    const onOpen = vi.fn();
    render(<KosmoSymbol onOpen={onOpen} />);
    klickEreignis(q('kosmo-symbol')!);
    act(() => {
      vi.advanceTimersByTime(KOSMO_ORB_KLICK_VERZOEGERUNG_MS);
    });
    expect(q('kosmo-karte')).not.toBeNull();
    klickEreignis(q('kosmo-karte-antworten')!);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(q('kosmo-karte')).toBeNull();
  });

  it('«Später» schliesst die Karte OHNE das Panel zu öffnen', () => {
    const onOpen = vi.fn();
    render(<KosmoSymbol onOpen={onOpen} />);
    klickEreignis(q('kosmo-symbol')!);
    act(() => {
      vi.advanceTimersByTime(KOSMO_ORB_KLICK_VERZOEGERUNG_MS);
    });
    klickEreignis(q('kosmo-karte-spaeter')!);
    expect(onOpen).not.toHaveBeenCalled();
    expect(q('kosmo-karte')).toBeNull();
  });

  it('Escape schliesst die offene Karte', () => {
    render(<KosmoSymbol onOpen={vi.fn()} />);
    klickEreignis(q('kosmo-symbol')!);
    act(() => {
      vi.advanceTimersByTime(KOSMO_ORB_KLICK_VERZOEGERUNG_MS);
    });
    expect(q('kosmo-karte')).not.toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(q('kosmo-karte')).toBeNull();
  });

  it('ein Klick ausserhalb des Wrappers schliesst die offene Karte', () => {
    render(<KosmoSymbol onOpen={vi.fn()} />);
    klickEreignis(q('kosmo-symbol')!);
    act(() => {
      vi.advanceTimersByTime(KOSMO_ORB_KLICK_VERZOEGERUNG_MS);
    });
    expect(q('kosmo-karte')).not.toBeNull();
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(q('kosmo-karte')).toBeNull();
  });
});

describe('island/KosmoOrb — Orb-Gesetz (E2-Tabelle, PB4-Ergänzung)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('Einfachklick öffnet nach der Verzögerung die Konversationskarte (kosmo-orb-karte)', () => {
    const onKosmoOeffnen = vi.fn();
    render(<IslandKosmoOrb onKosmoOeffnen={onKosmoOeffnen} />);
    klickEreignis(q('kosmo-orb-knopf')!);
    expect(q('kosmo-orb-karte')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(KOSMO_ORB_KLICK_VERZOEGERUNG_MS);
    });
    expect(q('kosmo-orb-karte')).not.toBeNull();
    expect(onKosmoOeffnen).not.toHaveBeenCalled();
  });

  it('Doppelklick öffnet das Panel direkt (onKosmoOeffnen) — die Karte bleibt zu', () => {
    const onKosmoOeffnen = vi.fn();
    render(<IslandKosmoOrb onKosmoOeffnen={onKosmoOeffnen} />);
    const knopf = q('kosmo-orb-knopf')!;
    klickEreignis(knopf);
    doppelklickEreignis(knopf);
    expect(onKosmoOeffnen).toHaveBeenCalledTimes(1);
    expect(q('kosmo-orb-karte')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(KOSMO_ORB_KLICK_VERZOEGERUNG_MS + 50);
    });
    expect(q('kosmo-orb-karte')).toBeNull();
  });

  it('Escape schliesst die offene Karte', () => {
    render(<IslandKosmoOrb onKosmoOeffnen={vi.fn()} />);
    klickEreignis(q('kosmo-orb-knopf')!);
    act(() => {
      vi.advanceTimersByTime(KOSMO_ORB_KLICK_VERZOEGERUNG_MS);
    });
    expect(q('kosmo-orb-karte')).not.toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(q('kosmo-orb-karte')).toBeNull();
  });

  it('ein Klick ausserhalb der Wurzel schliesst die offene Karte', () => {
    render(<IslandKosmoOrb onKosmoOeffnen={vi.fn()} />);
    klickEreignis(q('kosmo-orb-knopf')!);
    act(() => {
      vi.advanceTimersByTime(KOSMO_ORB_KLICK_VERZOEGERUNG_MS);
    });
    expect(q('kosmo-orb-karte')).not.toBeNull();
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(q('kosmo-orb-karte')).toBeNull();
  });

  it('Hover zeigt das Mini-Popup mit Textverlauf (E2-Tabelle, bisher fehlte das hier)', () => {
    render(<IslandKosmoOrb onKosmoOeffnen={vi.fn()} />);
    expect(q('kosmo-orb-mini')).toBeNull();
    act(() => {
      q('kosmo-orb-knopf')!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
    });
    expect(q('kosmo-orb-mini')).not.toBeNull();
    expect((q('kosmo-orb-mini')!.textContent ?? '').trim().length).toBeGreaterThan(0);
  });

  it('das Mini-Popup weicht der Karte, sobald diese offen ist', () => {
    render(<IslandKosmoOrb onKosmoOeffnen={vi.fn()} />);
    const knopf = q('kosmo-orb-knopf')!;
    act(() => {
      knopf.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
    });
    expect(q('kosmo-orb-mini')).not.toBeNull();
    klickEreignis(knopf);
    act(() => {
      vi.advanceTimersByTime(KOSMO_ORB_KLICK_VERZOEGERUNG_MS);
    });
    expect(q('kosmo-orb-karte')).not.toBeNull();
    expect(q('kosmo-orb-mini')).toBeNull();
  });
});
