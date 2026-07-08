import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppDeinstallieren } from '../src/shell/AppDeinstallieren';

/**
 * Owner-Auftrag «App deinstallieren…» im Hauptmenü: Regressionsschutz für den
 * Dialog-Inhalt — die drei OS-Abschnitte müssen wirklich rendern (kein
 * Selbst-Deinstallations-Versprechen, ehrliche OS-Anleitung + Website-Link),
 * Muster wie `test/popup-layout.test.tsx` (statisches Rendern, keine
 * Interaktion nötig, um den Inhalt zu prüfen).
 */

describe('AppDeinstallieren-Dialog', () => {
  it('rendert als Dialog mit den erwarteten Testids und ohne Selbst-Deinstallations-Versprechen', () => {
    const html = renderToStaticMarkup(<AppDeinstallieren onClose={() => {}} />);

    expect(html).toContain('data-testid="deinstallation-dialog"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('nicht selbst deinstallieren');
  });

  it('zeigt alle drei Betriebssystem-Abschnitte (Windows/macOS/Linux)', () => {
    const html = renderToStaticMarkup(<AppDeinstallieren onClose={() => {}} />);

    expect(html).toContain('data-testid="deinstallation-windows"');
    expect(html).toMatch(/deinstallation-windows[^>]*>[\s\S]*?Windows/);
    expect(html).toContain('data-testid="deinstallation-macos"');
    expect(html).toMatch(/deinstallation-macos[^>]*>[\s\S]*?macOS/);
    expect(html).toContain('data-testid="deinstallation-linux"');
    expect(html).toMatch(/deinstallation-linux[^>]*>[\s\S]*?Linux/);
  });

  it('verlinkt die ausführliche Anleitung auf der Website', () => {
    const html = renderToStaticMarkup(<AppDeinstallieren onClose={() => {}} />);

    expect(html).toContain('data-testid="deinstallation-website-link"');
    expect(html).toContain('https://architekturkosmos.ch/orbit/');
  });
});
