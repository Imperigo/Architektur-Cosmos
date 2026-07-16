// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { istVisOnboardingGesehen, setzeVisOnboardingGesehen, VisOnboarding } from '../src/modules/vis/VisOnboarding';
import { VIS_ONBOARDING_SCHRITTE } from '../src/modules/vis/vis-onboarding-schritte';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * v0.8.1 / P8 (0.7.5-Welle-2 «Vis-Onboarding-Stepper», Spec §6.2/§9.17,
 * B-102 «392px, 34px-Kreise») — eigenständiger KosmoVis-Stepper, NICHT
 * `shell/OnboardingWizard.tsx`.
 */
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.removeItem('kosmo.vis.onboarded');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('VisOnboarding (Spec §6.2/§9.17, B-102)', () => {
  it('zeigt genau einen 34px-Kreis je echtem Schritt, ersten Schritt aktiv', () => {
    act(() => root.render(<VisOnboarding onClose={() => {}} />));
    const kreise = container.querySelectorAll('[data-testid^="vis-onboarding-kreis-"]');
    expect(kreise).toHaveLength(VIS_ONBOARDING_SCHRITTE.length);
    for (const kreis of kreise) {
      expect((kreis as HTMLElement).style.width).toBe('34px');
    }
    expect(container.textContent).toContain(VIS_ONBOARDING_SCHRITTE[0]!.titel);
  });

  it('«Weiter» blättert durch alle Schritte, «Fertig» schliesst und setzt das Gesehen-Flag', () => {
    let geschlossen = false;
    act(() => root.render(<VisOnboarding onClose={() => (geschlossen = true)} />));
    expect(istVisOnboardingGesehen()).toBe(false);

    for (let i = 0; i < VIS_ONBOARDING_SCHRITTE.length - 1; i++) {
      const weiter = container.querySelector('[data-testid="vis-onboarding-weiter"]') as HTMLButtonElement;
      expect(weiter.textContent).toBe('Weiter');
      act(() => weiter.click());
      expect(container.textContent).toContain(VIS_ONBOARDING_SCHRITTE[i + 1]!.titel);
    }
    const letzterKnopf = container.querySelector('[data-testid="vis-onboarding-weiter"]') as HTMLButtonElement;
    expect(letzterKnopf.textContent).toBe('Fertig');
    act(() => letzterKnopf.click());

    expect(geschlossen).toBe(true);
    expect(istVisOnboardingGesehen()).toBe(true);
  });

  it('«Überspringen» schliesst sofort und setzt ebenfalls das Gesehen-Flag', () => {
    let geschlossen = false;
    act(() => root.render(<VisOnboarding onClose={() => (geschlossen = true)} />));
    const ueberspringen = container.querySelector('[data-testid="vis-onboarding-ueberspringen"]') as HTMLButtonElement;
    act(() => ueberspringen.click());
    expect(geschlossen).toBe(true);
    expect(istVisOnboardingGesehen()).toBe(true);
  });

  it('setzeVisOnboardingGesehen/istVisOnboardingGesehen sind das einzige Persistenz-Paar (Muster kosmo.onboarded)', () => {
    expect(istVisOnboardingGesehen()).toBe(false);
    setzeVisOnboardingGesehen();
    expect(istVisOnboardingGesehen()).toBe(true);
    expect(localStorage.getItem('kosmo.vis.onboarded')).toBe('1');
  });
});
