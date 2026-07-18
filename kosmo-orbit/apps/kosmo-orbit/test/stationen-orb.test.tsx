// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModuleId } from '@kosmo/ui';
import { StationenOrb } from '../src/modules/design/island/StationenOrb';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PD2 (`docs/ISLAND-UI-SPEZ.md` §1-Tabelle) — Stationen-Orb: 38px-Pill,
 * Popover, Auto-Schliessen 700ms. Rendert über `createRoot`/`act`/
 * `dispatchEvent` (Muster `island-shell.test.tsx`, kein
 * `@testing-library/react` in diesem Workspace).
 *
 * **PB3-Vertragsänderung (`docs/V084-SPEZ.md` §8 C-24, Owner wörtlich
 * «AK-Zentralsymbol zeigt NIE das offene Haupttool, sondern ist Shortcut
 * für die ANDEREN mit deren UNTERTOOLS»):** das Popover zeigt seit PB3
 * nicht mehr die fünf Pipeline-Stationen flach (design/data/vis/prepare/
 * publish, `STATION_FARBE`-Rollenpunkte) — es zeigt die
 * `ORBIT_HAUPTWERKZEUGE`-Gruppen MIT AUSNAHME des Hauptwerkzeugs, das die
 * neue Pflicht-Prop `aktivesModul` enthält (`shell/orbit-werkzeuge.ts` ist
 * die Quelle, s. `orbit-werkzeuge.test.ts` für deren eigene Garantien). Die
 * alten `stationen-orb-eintrag-design/-data/-vis/-prepare/-publish`-
 * Assertions sind entfernt/ersetzt — begründet im PB3-Bericht.
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

function hoverLeave(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
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
  vi.useRealTimers();
});

describe('StationenOrb — Pill + Popover', () => {
  it('startet geschlossen, Pill sichtbar', () => {
    render(<StationenOrb aktivesModul="design" onStationOeffnen={vi.fn()} />);
    expect(q('stationen-orb-pill')).not.toBeNull();
    expect(q('stationen-orb-popover')).toBeNull();
  });

  it('aktivesModul="design": das GANZE KosmoDesign-Hauptwerkzeug (Draw/Prepare/Vis/Publish/Modellbaum) fehlt, KosmoData/Kosmo/KosmoOffice bleiben', () => {
    render(<StationenOrb aktivesModul="design" onStationOeffnen={vi.fn()} />);
    klick(q('stationen-orb-pill')!);
    expect(q('stationen-orb-popover')).not.toBeNull();
    expect(q('stationen-orb-gruppe-design')).toBeNull();
    expect(q('stationen-orb-eintrag-draw')).toBeNull();
    expect(q('stationen-orb-eintrag-vis')).toBeNull();
    expect(q('stationen-orb-eintrag-publish')).toBeNull();
    expect(q('stationen-orb-eintrag-prepare')).toBeNull();
    expect(q('stationen-orb-eintrag-modellbaum')).toBeNull();

    expect(q('stationen-orb-gruppe-data')).not.toBeNull();
    expect(q('stationen-orb-eintrag-reference')).not.toBeNull();
    expect(q('stationen-orb-eintrag-asset')).not.toBeNull();

    expect(q('stationen-orb-gruppe-kosmo')).not.toBeNull();
    expect(q('stationen-orb-eintrag-speak')).not.toBeNull();
    expect(q('stationen-orb-eintrag-train')).not.toBeNull();
    expect(q('stationen-orb-eintrag-doc')).not.toBeNull();
  });

  it('aktivesModul="vis": ebenfalls das GANZE KosmoDesign-Hauptwerkzeug ausgeblendet (Vis ist laut orbit-werkzeuge.ts ein Untertool VON KosmoDesign, kein eigenes Haupttool)', () => {
    render(<StationenOrb aktivesModul="vis" onStationOeffnen={vi.fn()} />);
    klick(q('stationen-orb-pill')!);
    expect(q('stationen-orb-gruppe-design')).toBeNull();
    expect(q('stationen-orb-eintrag-draw')).toBeNull();
    expect(q('stationen-orb-eintrag-vis')).toBeNull();
    expect(q('stationen-orb-gruppe-data')).not.toBeNull();
  });

  it('aktivesModul="data": KosmoDesign bleibt (Draw/Vis/Publish/Prepare da), KosmoData fehlt', () => {
    render(<StationenOrb aktivesModul="data" onStationOeffnen={vi.fn()} />);
    klick(q('stationen-orb-pill')!);
    expect(q('stationen-orb-gruppe-design')).not.toBeNull();
    expect(q('stationen-orb-eintrag-draw')).not.toBeNull();
    expect(q('stationen-orb-eintrag-vis')).not.toBeNull();
    expect(q('stationen-orb-gruppe-data')).toBeNull();
    expect(q('stationen-orb-eintrag-reference')).toBeNull();
  });

  it('KosmoOffice bleibt sichtbar, seine Untertools sind kommend/disabled (App-weite Ehrlichkeits-Konvention)', () => {
    render(<StationenOrb aktivesModul="design" onStationOeffnen={vi.fn()} />);
    klick(q('stationen-orb-pill')!);
    const lead = q('stationen-orb-eintrag-lead') as HTMLButtonElement;
    expect(lead).not.toBeNull();
    expect(lead.disabled).toBe(true);
    expect(lead.textContent).toContain('kommend');
  });

  it('Klick auf einen echten Untertool-Eintrag ruft onStationOeffnen mit dessen echter ModuleId auf und schliesst das Popover', () => {
    const onStationOeffnen = vi.fn<(s: ModuleId) => void>();
    render(<StationenOrb aktivesModul="design" onStationOeffnen={onStationOeffnen} />);
    klick(q('stationen-orb-pill')!);
    klick(q('stationen-orb-eintrag-reference')!);
    expect(onStationOeffnen).toHaveBeenCalledWith('data');
    expect(q('stationen-orb-popover')).toBeNull();
  });

  it('Klick auf einen kommend-Eintrag ruft onStationOeffnen NICHT auf', () => {
    const onStationOeffnen = vi.fn();
    render(<StationenOrb aktivesModul="design" onStationOeffnen={onStationOeffnen} />);
    klick(q('stationen-orb-pill')!);
    klick(q('stationen-orb-eintrag-lead')!);
    expect(onStationOeffnen).not.toHaveBeenCalled();
  });
});

describe('StationenOrb — PD5 «Zentrale»-Eintrag (additiv, optional, PB3-unverändert)', () => {
  it('ohne `onZentrale` erscheint KEIN Zentrale-Eintrag (optional, bestehende Tests ohne die Prop bleiben unverändert)', () => {
    render(<StationenOrb aktivesModul="design" onStationOeffnen={vi.fn()} />);
    klick(q('stationen-orb-pill')!);
    expect(q('stationen-orb-eintrag-zentrale')).toBeNull();
  });

  it('mit `onZentrale` ist «Zentrale» der ERSTE Eintrag, Klick ruft `onZentrale` auf und schliesst das Popover', () => {
    const onZentrale = vi.fn();
    render(<StationenOrb aktivesModul="design" onStationOeffnen={vi.fn()} onZentrale={onZentrale} />);
    klick(q('stationen-orb-pill')!);
    const popover = q('stationen-orb-popover')!;
    expect(popover.firstElementChild).toBe(q('stationen-orb-eintrag-zentrale'));
    klick(q('stationen-orb-eintrag-zentrale')!);
    expect(onZentrale).toHaveBeenCalledTimes(1);
    expect(q('stationen-orb-popover')).toBeNull();
  });
});

describe('StationenOrb — Auto-Schliessen 700ms', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('schliesst das Popover 700ms nach Pointer-Verlassen', () => {
    render(<StationenOrb aktivesModul="design" onStationOeffnen={vi.fn()} />);
    hoverEnter(q('stationen-orb-root')!);
    expect(q('stationen-orb-popover')).not.toBeNull();
    hoverLeave(q('stationen-orb-root')!);
    act(() => {
      vi.advanceTimersByTime(699);
    });
    expect(q('stationen-orb-popover')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(q('stationen-orb-popover')).toBeNull();
  });
});
