// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { SchwarmOrbs } from '../src/shell/SchwarmOrbs';
import type { CompanionKarte } from '../src/shell/companion-daten';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * v0.8.1 / P8 (0.7.2-Rest «Schwarm-Orbs», Spec §6.2, B-85 §11b) — «max. 3
 * gleichzeitige Neben-Orbs, Klick = Fokus». Rendert über einen echten
 * `createRoot` (Muster `varianten-panel.test.tsx`) — reine Props-Komponente,
 * kein Store nötig, aber Klick-Interaktion braucht den Client-Reconciler.
 */
function karte(id: string, status: CompanionKarte['status'] = 'rendert'): CompanionKarte {
  return { id, titel: `Karte ${id}`, status, rolle: '--k-rolle-generator', brauchtFreigabe: false };
}

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(el: ReactElement): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(el));
}

describe('SchwarmOrbs (Spec §6.2, B-85)', () => {
  it('zeigt nichts bei leerer Kartenliste (kein leerer Rahmen)', () => {
    render(<SchwarmOrbs karten={[]} fokusId={null} onFokus={() => {}} />);
    expect(container.querySelector('[data-testid="schwarm-orbs"]')).toBeNull();
  });

  it('zeigt höchstens 3 Orbs — die vierte+ Karte zählt nur im «+N»-Chip', () => {
    const karten = [karte('a'), karte('b'), karte('c'), karte('d'), karte('e')];
    render(<SchwarmOrbs karten={karten} fokusId={null} onFokus={() => {}} />);
    expect(container.querySelectorAll('button[data-testid^="schwarm-orb-"]')).toHaveLength(3);
    expect(container.querySelector('[data-testid="schwarm-orb-mehr"]')?.textContent).toBe('+2');
  });

  it('Klick auf einen Orb ruft onFokus mit dessen Karten-Id auf', () => {
    const karten = [karte('a'), karte('b')];
    const gesehen: string[] = [];
    render(<SchwarmOrbs karten={karten} fokusId={null} onFokus={(id) => gesehen.push(id)} />);
    const zweiterOrb = container.querySelector('[data-testid="schwarm-orb-b"]') as HTMLButtonElement;
    act(() => zweiterOrb.click());
    expect(gesehen).toEqual(['b']);
  });

  it('der fokussierte Orb trägt aria-pressed=true, die anderen false', () => {
    const karten = [karte('a'), karte('b')];
    render(<SchwarmOrbs karten={karten} fokusId="b" onFokus={() => {}} />);
    expect(container.querySelector('[data-testid="schwarm-orb-a"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('[data-testid="schwarm-orb-b"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('jeder Orb rendert den bestehenden KosmoOrb (Bestands-Orb-Muster, kein zweiter Automat)', () => {
    render(<SchwarmOrbs karten={[karte('a', 'fertig')]} fokusId={null} onFokus={() => {}} />);
    const orb = container.querySelector('[data-testid="schwarm-orb-a"] [data-testid="kosmo-orb"]');
    expect(orb).not.toBeNull();
    expect(orb?.getAttribute('data-zustand')).toBe('done');
  });
});
