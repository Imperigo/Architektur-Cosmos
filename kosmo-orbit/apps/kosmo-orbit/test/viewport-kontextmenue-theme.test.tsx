import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ViewportKontextmenue } from '../src/modules/design/ViewportKontextmenue';

/**
 * W3-Phantom-Token-Fix (UI-KONZEPT-065 §1.4, Pflicht #1): `ViewportKontextmenue`
 * stand auf `--k-panel`/`--k-hairline`/`--k-hover` — Variablen, die in
 * `aura.css` nie existiert haben — mit hartkodierten Hex-Fallbacks. Folge:
 * das Menü folgte weder Theme- noch Akzentwechsel, es lief auf dem
 * Fallback-Hex. Dieser Test ist der Regressionsschutz: der gerenderte Style
 * darf keine hartkodierte Hex-/rgb()-Farbe mehr tragen — nur `var(--k-*)`.
 */

describe('ViewportKontextmenue (W3): folgt dem Theme statt Phantom-Tokens', () => {
  it('gerenderter Style enthält keine hartkodierten Hex-Farben (nur echte --k-*-Tokens)', () => {
    const html = renderToStaticMarkup(
      <ViewportKontextmenue
        x={10}
        y={20}
        aktionen={[
          { label: 'Auswählen', testid: 'kontext-auswaehlen', onClick: () => {} },
          { label: 'Einpassen', testid: 'kontext-einpassen', onClick: () => {} },
        ]}
        onClose={() => {}}
      />,
    );

    // testids/Beschriftung bleiben (E2E hängt daran)
    expect(html).toContain('data-testid="viewport-kontextmenue"');
    expect(html).toContain('data-testid="kontext-auswaehlen"');
    expect(html).toContain('Einpassen');

    // Keine hartkodierte Farbe (Hex oder rgb()) — weder als Fallback-Wert
    // noch sonstwo im Markup/Style-Block.
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(html).not.toMatch(/rgb\(/);

    // Die früheren Phantom-Tokens dürfen nicht mehr auftauchen …
    expect(html).not.toContain('--k-panel');
    expect(html).not.toContain('--k-hairline');
    expect(html).not.toContain('--k-hover');

    // … und die echten Tokens/Klassen stehen an ihrer Stelle.
    expect(html).toContain('var(--k-raised)');
    expect(html).toContain('var(--k-line)');
    expect(html).toContain('var(--k-shadow-overlay)');
    expect(html).toContain('var(--k-radius-md)');
    expect(html).toContain('var(--k-accent-wash)');
    expect(html).toContain('k-uebergang-schnell');

    // Kein JS-Hover mehr (onPointerEnter/-Leave, die style.background setzen)
    // — der Umbau bewegt den Hover in CSS/aura-Klassen.
    expect(html).not.toContain('onpointerenter');
    expect(html).not.toContain('onpointerleave');
  });
});
