import { describe, expect, it } from 'vitest';
import { MODELL_CDN_BASIS, modellUrlAusR2Key } from '../src/modell-url';

/**
 * Resolver-Vertrag (v0.7.1 E4): `modellUrlAusR2Key` bildet NUR `r2_key` auf
 * eine Remote-URL ab (s. Doc-Kommentar in src/modell-url.ts) — keine
 * url/local_path-Felder, kein Netzzugriff hier (der Fetch passiert erst im
 * App-seitigen Ladepfad, DataWorkspace.tsx).
 */
describe('modellUrlAusR2Key', () => {
  it('hängt den r2_key an die CDN-Basis', () => {
    expect(modellUrlAusR2Key('entries/villa-savoye/models/full.glb')).toBe(
      `${MODELL_CDN_BASIS}entries/villa-savoye/models/full.glb`,
    );
  });

  it('MODELL_CDN_BASIS ist der dokumentierte, geplante CDN-Host mit abschliessendem Schrägstrich', () => {
    expect(MODELL_CDN_BASIS).toBe('https://archiv.architekturkosmos.ch/');
  });

  it('entfernt führende Schrägstriche im r2_key (kein doppelter Slash)', () => {
    expect(modellUrlAusR2Key('/entries/x/models/y.glb')).toBe(`${MODELL_CDN_BASIS}entries/x/models/y.glb`);
  });

  it('bleibt eine reine Stringfunktion — kein fetch/DOM-Zugriff im Resultat', () => {
    const url = modellUrlAusR2Key('entries/pantheon/models/site.glb');
    expect(url).toMatch(/^https:\/\//);
    expect(url).not.toContain('..');
  });
});
