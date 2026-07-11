// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KosmoCharakterFenster } from '../src/shell/KosmoCharakterFenster';

/**
 * v0.7.2 §9 (Paket 07): reiner Struktur-Smoke-Test — `KosmoCharakterFenster`
 * lebt in einem Tauri-Zweitfenster, das in dieser Container-Umgebung nicht
 * lauffähig ist (siehe Abschlussbericht). `renderToStaticMarkup` prüft
 * wenigstens, dass die Komponente ohne Tauri-Laufzeit (kein
 * `__TAURI_INTERNALS__`) fehlerfrei rendert und die Aufstarten-Sequenz
 * (Spec §9, initialer Mount-Zustand) im Markup steht.
 */
describe('KosmoCharakterFenster — Struktur-Smoke-Test (ausserhalb von Tauri)', () => {
  it('rendert ohne zu werfen und zeigt initial die Aufstarten-Sequenz', () => {
    const html = renderToStaticMarkup(<KosmoCharakterFenster />);
    expect(html).toContain('data-testid="kosmo-charakter-fenster"');
    expect(html).toContain('data-testid="kosmo-charakter-aufstarten"');
    // Die normale Chrome (Ring/Orb) ist WÄHREND der Aufstarten-Sequenz noch
    // nicht im Markup — erst nach dem Timer-Ablauf (siehe Kopfkommentar der
    // Komponente).
    expect(html).not.toContain('data-testid="kosmo-charakter-chrome"');
  });
});
