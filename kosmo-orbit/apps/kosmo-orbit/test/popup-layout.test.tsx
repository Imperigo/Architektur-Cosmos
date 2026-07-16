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

const designPanelsCss = readFileSync(
  path.resolve(__dirname, '../src/modules/design/design-panels.css'),
  'utf8',
);
const dockFlaecheCss = readFileSync(
  path.resolve(__dirname, '../src/shell/dock/dock-flaeche.css'),
  'utf8',
);

// v0.8.1 Welle 4 / Paket P5c (Zwei-Stufen-Rollout, `docs/V081-SPEZ.md`
// §2.4 P5c: «T4b auf dp-dialog/dock-panel-inhalt ausweiten») — die neun auf
// `KPanelZweiStufen` migrierten Design-Panels dieses Pakets (byte-gleiche
// Anzahl: Mängel/Splat/Unternehmerplan-Bericht/SubmissionsCheck/Kv/
// Varianten/Berechnungsliste/Bauablauf/Inspector).
const P5C_MIGRIERTE_PANELS = [
  'MaengelPanel.tsx',
  'SplatPanel.tsx',
  'UnternehmerplanPanel.tsx',
  'SubmissionsCheckPanel.tsx',
  'KvPanel.tsx',
  'VariantenPanel.tsx',
  'BerechnungslistePanel.tsx',
  'BauablaufPanel.tsx',
  'Inspector.tsx',
] as const;

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

  // v0.8.1 Welle 4 / Paket P5c (Zwei-Stufen-Rollout, `docs/V081-SPEZ.md`
  // §2.3/§2.4) — additive Erweiterung: T4b galt bisher nur `KBestaetigung`
  // (globaler Confirm-Dialog). Die acht ehemaligen `dp-dialog--scroll`-
  // Dock-Panels + Inspector sind jetzt auf `KPanelZweiStufen` migriert; diese
  // Tests beweisen den Scroll-Abbau strukturell (Quelltext-Grep), nicht nur
  // per Beobachtung.
  it('P5c: `.dp-dialog--scroll` ist aus design-panels.css entfernt (nur noch als erklärender Kommentar erwähnt)', () => {
    expect(designPanelsCss).not.toMatch(/\.dp-dialog--scroll\s*{/);
  });

  it.each(P5C_MIGRIERTE_PANELS)('P5c: %s referenziert `dp-dialog--scroll` nicht mehr als className', (datei) => {
    const quelle = readFileSync(
      path.resolve(__dirname, `../src/modules/design/${datei}`),
      'utf8',
    );
    expect(quelle).not.toContain('dp-dialog--scroll');
  });

  it('P5c: die neuen `-koerper`-Tab-Wrapper der migrierten Panels setzen kein overflow:auto/scroll (Nie-Scroll-Gebot §2.3)', () => {
    expect(designPanelsCss).not.toMatch(
      /\.(mg|sp|sub|kv|bp|vp|bl|insp|up)-koerper[^{]*{[^}]*overflow:\s*(auto|scroll)/,
    );
  });

  it('P5c: `.k-dock-panel-inhalt` behält sein `overflow:auto` bewusst — dokumentierter Rest-Scroll, solange nicht ALLE Design-Panels migriert sind (raster/cwSetzen/studie bleiben Alt-Default, ModulEditor/Unternehmerplan-Diff bleiben §2.3-Fixed/Anker-Ausnahmen)', () => {
    expect(dockFlaecheCss).toMatch(/\.k-dock-panel-inhalt\s*{[^}]*overflow:\s*auto/);
  });
});
