// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { inhaltFuer, registrierteWerkzeugIds } from '../src/modules/design/island/inhalte/registry';
// Registrierung als Import-Seiteneffekt — exakt wie `IslandShell.tsx` es tut,
// nur beschränkt auf PD3as zwei Dateien (kein `projekt`/`austausch`-Import,
// die bleiben PD3b, s. `registry.ts`-Kopfkommentar).
import '../src/modules/design/island/inhalte/zeichnen';
import '../src/modules/design/island/inhalte/ansicht';
import { useProject } from '../src/state/project-store';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PD3a (`docs/ISLAND-UI-SPEZ.md` §4.4/§7 PD3a-Zeile) — beweist das harte Gate
 * C-38 («kein Werkzeug endet bei Stufe 1») für die ursprünglich 17
 * ZEICHNEN+ANSICHT-Zeilen der Mapping-Tabelle, MINUS Achsen (`hatPopup:false`,
 * reiner Toggle — s. `island-katalog.ts`-Kopfkommentar): 16 Ids mussten
 * Stufe2 UND Stufe3 registriert haben. v0.9.1 P-B2 (`docs/V091-SPEZ.md`
 * §P-B2) hängt additiv zwei weitere ZEICHNEN-Ids an (`gelaender`/`rampe`,
 * beide mit Stufe2+Stufe3 registriert) — jetzt 18 Ids. Zusätzlich ein
 * Rendering-Smoke-Test je Datei und ein «echte Wirkung»-Beweis am
 * Referenzmuster Wand (Command→Patch, kein Mock).
 */

const ZEICHNEN_IDS = [
  'auswahl',
  'wand',
  'oeffnung',
  'volumen',
  'zone',
  'dach',
  'treppe',
  'stuetze',
  'skizze',
  'mesh',
  'messen',
  'gelaender',
  'rampe',
];
const ANSICHT_IDS_OHNE_ACHSEN = ['darstellung', 'sonne', 'ebenen', 'trace', 'graph'];
const ALLE_18 = [...ZEICHNEN_IDS, ...ANSICHT_IDS_OHNE_ACHSEN];

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

describe('Registry — 18/19 ZEICHNEN+ANSICHT-Ids (Achsen ausgenommen; v0.9.1 P-B2: 16→18), je Stufe2+Stufe3', () => {
  it('registrierteWerkzeugIds() enthält genau die 18 erwarteten Ids', () => {
    const ids = registrierteWerkzeugIds();
    expect(ids.sort()).toEqual([...ALLE_18].sort());
    expect(ids).toHaveLength(18);
  });

  it('registrierteWerkzeugIds() enthält NICHT «achsen» (hatPopup:false, reiner Toggle)', () => {
    expect(registrierteWerkzeugIds()).not.toContain('achsen');
  });

  it.each(ALLE_18)('%s hat Stufe2 UND Stufe3 registriert (hartes Gate C-38)', (id) => {
    const inhalt = inhaltFuer(id);
    expect(inhalt).toBeDefined();
    expect(inhalt!.Stufe2).toBeTypeOf('function');
    expect(inhalt!.Stufe3).toBeTypeOf('function');
  });
});

function pruefeStufe2Und3RendernOhneCrash(id: string): void {
  const inhalt = inhaltFuer(id)!;
  const Stufe2 = inhalt.Stufe2!;
  const Stufe3 = inhalt.Stufe3!;
  expect(() => render(<Stufe2 />)).not.toThrow();
  act(() => root!.unmount());
  container!.remove();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  expect(() => act(() => root!.render(<Stufe3 />))).not.toThrow();
}

describe('ZEICHNEN — Rendering-Smoke-Test (Baseline: keine Auswahl)', () => {
  it.each(ZEICHNEN_IDS)('%s: Stufe2 UND Stufe3 rendern ohne zu crashen', (id) => {
    pruefeStufe2Und3RendernOhneCrash(id);
  });
});

describe('ANSICHT — Rendering-Smoke-Test', () => {
  it.each(ANSICHT_IDS_OHNE_ACHSEN)('%s: Stufe2 UND Stufe3 rendern ohne zu crashen', (id) => {
    pruefeStufe2Und3RendernOhneCrash(id);
  });
});

describe('Wand — Referenzmuster, echte Wirkung (Command→Patch, kein Mock)', () => {
  beforeEach(() => {
    // Frisches Doc je Test — `useProject` ist ein Modul-Singleton (Store
    // überlebt zwischen Tests), darum wird hier explizit zurückgesetzt statt
    // sich auf einen Zustand von vorherigen Tests zu verlassen.
    useProject.setState({ selection: [], meshEditId: null });
  });

  it('Popup zeigt den ehrlichen Hinweis, solange keine Wand ausgewählt ist', () => {
    const { Stufe2 } = inhaltFuer('wand')!;
    render(<Stufe2 />);
    expect(q('island-wand-hinweis-keine-auswahl')).not.toBeNull();
    expect(q('island-wand-aufbau')).toBeNull();
  });

  it('Ändern des Aufbaus im Popup schreibt ECHT auf die ausgewählte Wand (design.eigenschaftSetzen)', () => {
    const { runCommand, doc, select } = useProject.getState();
    let storeys = doc.byKind('storey');
    if (storeys.length === 0) {
      runCommand('design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 });
      storeys = doc.byKind('storey');
    }
    const storeyId = storeys[0]!.id;

    const aw1 = runCommand('design.aufbauErstellen', {
      name: 'AW 1',
      target: 'wall',
      layers: [{ material: 'kalksandstein', thickness: 200, function: 'tragend' }],
    });
    const aw2 = runCommand('design.aufbauErstellen', {
      name: 'AW 2 (dick)',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 300, function: 'tragend' }],
    });
    const aufbau1Id = (aw1.patches[0] as { id: string }).id;
    const aufbau2Id = (aw2.patches[0] as { id: string }).id;

    const wandErgebnis = runCommand('design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
      assemblyId: aufbau1Id,
    });
    const wandId = (wandErgebnis.patches[0] as { id: string }).id;
    select([wandId]);

    const { Stufe2 } = inhaltFuer('wand')!;
    render(<Stufe2 />);

    // `KSelect` (`@kosmo/ui`) ist kein natives <select> — Trigger-Button mit
    // `data-value` + eigenes Listbox-Popup (`select.tsx`). Öffnen per Klick,
    // Auswahl per Klick auf den Options-Button (`data-value="…"`).
    const trigger = q('island-wand-aufbau');
    expect(trigger).not.toBeNull();
    expect(trigger!.getAttribute('data-value')).toBe(aufbau1Id);

    act(() => {
      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const option = container!.querySelector<HTMLButtonElement>(
      `[data-testid="island-wand-aufbau-popup"] button[data-value="${aufbau2Id}"]`,
    );
    expect(option).not.toBeNull();
    act(() => {
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Echte Wirkung: der Command ist gelaufen, das Doc trägt den neuen Aufbau.
    const wandNachher = useProject.getState().doc.get(wandId) as { assemblyId: string };
    expect(wandNachher.assemblyId).toBe(aufbau2Id);
  });
});
