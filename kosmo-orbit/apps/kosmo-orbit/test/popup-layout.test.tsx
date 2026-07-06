import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { bestaetigen, KBestaetigung } from '@kosmo/ui';

/**
 * T4b (Popup-Überlauf): Regressionsschutz für die zentrale Dialog-Regel in
 * aura.css — Popups scrollen nicht und laufen nicht über, Text bricht um.
 * Feingranulares Layout ist ein CSS-Sachverhalt und darum schwer im
 * Unit-Test abzubilden; hier wird zumindest sichergestellt, dass (a) die
 * zentralen Klassen tatsächlich verwendet werden und keine Ad-hoc-
 * Scroll-Styles zurückkehren, und (b) die Klassen in aura.css die
 * verlangten Eigenschaften (Umbruch, Höhen-Deckel, kein Scroll) tragen.
 */

const auraCss = readFileSync(
  path.resolve(__dirname, '../../../packages/kosmo-ui/src/aura.css'),
  'utf8',
);

describe('Popup-Layout (T4b): zentrale k-dialog-Regeln statt Ad-hoc-Scroll', () => {
  it('aura.css: .k-dialog-scrim zentriert im Viewport, .k-dialog bricht Text um und deckelt die Höhe', () => {
    expect(auraCss).toMatch(/\.k-dialog-scrim\s*{[^}]*position:\s*fixed/);
    expect(auraCss).toMatch(/\.k-dialog-scrim\s*{[^}]*inset:\s*0/);
    expect(auraCss).toMatch(/\.k-dialog\s*{[^}]*overflow-wrap:\s*anywhere/);
    expect(auraCss).toMatch(/\.k-dialog\s*{[^}]*word-break:\s*break-word/);
    expect(auraCss).toMatch(/\.k-dialog\s*{[^}]*max-height/);
  });

  it('KBestaetigung nutzt die zentralen Klassen und trägt keinen eigenen Scroll-/Fixed-Inline-Style mehr', () => {
    void bestaetigen({ titel: 'Lange Diagnose', text: 'Ein-sehr-langes-unteilbares-Wort-'.repeat(10) });
    const html = renderToStaticMarkup(<KBestaetigung />);

    // Testids/role bleiben erhalten (E2E hängt daran)
    expect(html).toContain('data-testid="bestaetigung"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('data-testid="bestaetigung-ja"');
    expect(html).toContain('data-testid="bestaetigung-nein"');

    // Zentrale Klassen statt lokaler position:fixed/overflow-Duplikate
    expect(html).toContain('k-dialog-scrim');
    expect(html).toMatch(/class="[^"]*\bk-dialog\b[^"]*"/);

    // Keine ad-hoc Scrollleiste am Popup selbst
    expect(html).not.toMatch(/overflow(-y)?:\s*auto/i);
    expect(html).not.toMatch(/overflow(-y)?:\s*scroll/i);
  });
});
