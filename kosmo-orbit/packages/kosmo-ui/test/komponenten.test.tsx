// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { KChip } from '../src/field';
import { K_ICON_NAMES, KIcon } from '../src/icons';
import { KDialog, KMenu } from '../src/overlay';
import { KSelect } from '../src/select';
import { KTabs } from '../src/tabs';

// Gleiches Muster wie apps/kosmo-orbit/test/node-canvas-pan.test.tsx: ohne
// dieses Flag warnt React bei jedem `act()` in dieser jsdom-Umgebung.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Komponenten-Vertrag (W0, UI-KONZEPT-065 §3) — Regressionsschutz für die
 * neuen Bausteine. Muster (Interaktion/Esc/Klick) übernommen von
 * `apps/kosmo-orbit/test/node-canvas-pan.test.tsx`: `createRoot` + `act`,
 * echte DOM-Events statt einer Testing-Library (im Workspace nicht
 * vorhanden) — reiner Struktur-Check (`renderToStaticMarkup`) reicht dort,
 * wo keine Interaktion geprüft wird.
 */

describe('KSelect: bleibt ein echtes natives <select>', () => {
  it('rendert <select> mit durchgereichtem data-testid', () => {
    const html = renderToStaticMarkup(
      <KSelect data-testid="mein-select" value="a" onChange={() => {}}>
        <option value="a">A</option>
        <option value="b">B</option>
      </KSelect>,
    );
    expect(html).toContain('<select');
    expect(html).toContain('data-testid="mein-select"');
    expect(html).toContain('class="k-select k-select--md"');
  });
});

describe('KTabs: role=tab + aria-selected', () => {
  it('setzt role=tablist/tab und aria-selected am aktiven Tab', () => {
    const html = renderToStaticMarkup(
      <KTabs
        items={[
          { id: 'eins', label: 'Eins' },
          { id: 'zwei', label: 'Zwei' },
        ]}
        aktiv="zwei"
        onChange={() => {}}
      />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/role="tab"[^>]*aria-selected="false"[^>]*>[\s\S]*?Eins/);
    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>[\s\S]*?Zwei/);
  });
});

describe('KIcon: jeder Registry-Name rendert ein <svg>', () => {
  it('alle ~28 Namen liefern gültiges SVG-Markup', () => {
    expect(K_ICON_NAMES.length).toBeGreaterThanOrEqual(20);
    for (const name of K_ICON_NAMES) {
      const html = renderToStaticMarkup(<KIcon name={name} />);
      expect(html, name).toContain('<svg');
      expect(html, name).toContain('viewBox="0 0 16 16"');
    }
  });

  it('mit title-Prop: role=img + sichtbarer <title>; ohne: aria-hidden', () => {
    const mitTitel = renderToStaticMarkup(<KIcon name="plus" title="Hinzufügen" />);
    expect(mitTitel).toContain('role="img"');
    expect(mitTitel).toContain('<title>Hinzufügen</title>');

    const ohneTitel = renderToStaticMarkup(<KIcon name="plus" />);
    expect(ohneTitel).toContain('aria-hidden="true"');
    expect(ohneTitel).not.toContain('<title>');
  });
});

describe('KChip: rendert Kinder, nie eine Füllfläche ausser tone=fuellung', () => {
  it('zeigt die children und trägt keinen Hintergrund bei tone=linie (Standard)', () => {
    const html = renderToStaticMarkup(<KChip data-testid="chip-1">Rohbau</KChip>);
    expect(html).toContain('Rohbau');
    expect(html).toContain('data-testid="chip-1"');
    expect(html).toContain('k-chip--linie');
  });

  it('tone=fuellung trägt die k-chip--fuellung-Klasse (CSS setzt --k-accent-wash)', () => {
    const html = renderToStaticMarkup(
      <KChip tone="fuellung" hue="var(--k-mod-design)">
        Entwurf
      </KChip>,
    );
    expect(html).toContain('k-chip--fuellung');
  });
});

// ── Interaktions-Tests: brauchen echtes DOM (jsdom) + createRoot/act ──

describe('KDialog: Esc ruft onClose', () => {
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

  it('feuert onClose bei Escape-Taste', () => {
    let geschlossen = 0;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root!.render(
        <KDialog titel="Testdialog" onClose={() => geschlossen++} data-testid="mein-dialog">
          Inhalt
        </KDialog>,
      );
    });

    expect(container.querySelector('[data-testid="mein-dialog"]')).not.toBeNull();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(geschlossen).toBe(1);
  });

  it('Klick auf den Scrim ruft ebenfalls onClose, Klick auf die Box nicht', () => {
    let geschlossen = 0;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root!.render(
        <KDialog titel="Testdialog" onClose={() => geschlossen++} data-testid="mein-dialog">
          Inhalt
        </KDialog>,
      );
    });

    const box = container.querySelector('.k-dialog-box') as HTMLElement;
    act(() => {
      box.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(geschlossen).toBe(0);

    const scrim = container.querySelector('[data-testid="mein-dialog"]') as HTMLElement;
    act(() => {
      scrim.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(geschlossen).toBe(1);
  });
});

describe('KMenu: öffnet/schliesst, onSelect liefert die id', () => {
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

  it('Klick auf den Trigger öffnet (.offen), ein Item-Klick liefert die id und schliesst wieder', () => {
    const ausgewaehlt: string[] = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root!.render(
        <KMenu
          trigger={
            <button type="button" data-testid="menu-trigger">
              Mehr
            </button>
          }
          items={[
            { id: 'export', label: 'Export', testid: 'menu-item-export' },
            'trenner',
            { id: 'loeschen', label: 'Löschen', gefahr: true, testid: 'menu-item-loeschen' },
          ]}
          onSelect={(id) => ausgewaehlt.push(id)}
        />,
      );
    });

    const trigger = container.querySelector('[data-testid="menu-trigger"]') as HTMLButtonElement;
    const menu = container.querySelector('.k-menu') as HTMLElement;

    expect(menu.className).not.toContain('offen');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(menu.className).toContain('offen');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const item = container.querySelector('[data-testid="menu-item-export"]') as HTMLButtonElement;
    act(() => {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(ausgewaehlt).toEqual(['export']);
    expect(menu.className).not.toContain('offen');
  });

  it('Esc schliesst das offene Menü', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root!.render(
        <KMenu
          trigger={
            <button type="button" data-testid="menu-trigger-2">
              Mehr
            </button>
          }
          items={[{ id: 'a', label: 'A' }]}
          onSelect={() => {}}
        />,
      );
    });

    const trigger = container.querySelector('[data-testid="menu-trigger-2"]') as HTMLButtonElement;
    const menu = container.querySelector('.k-menu') as HTMLElement;

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(menu.className).toContain('offen');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(menu.className).not.toContain('offen');
  });
});
