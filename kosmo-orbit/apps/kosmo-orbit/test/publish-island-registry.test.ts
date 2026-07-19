import { describe, expect, it } from 'vitest';
import { PUBLISH_WERKZEUG_KATALOG } from '../src/modules/publish/island/publish-island-katalog';
// Import-Seiteneffekt: registriert alle Stufe-2/3-Inhalte (Muster
// `design/island/IslandShell.tsx`s Kopfimporte der vier `inhalte/*.tsx`).
import { publishInhaltsRegistry } from '../src/modules/publish/island';

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — jedes `hatPopup:true`-Werkzeug MUSS
 * einen echten Registry-Inhalt haben (sonst zeigt IslandShell nur den PD1-
 * Leerrahmen) — dasselbe Gate wie design's `registrierteWerkzeugIds()`-Test
 * («kein Werkzeug endet bei Stufe 1»), hier für den eigenen `'publish'`-
 * Namensraum. Muster `test/vis-island-registry.test.ts` (PC1).
 */

describe('publish-island — Registry (eigener Namensraum "publish")', () => {
  it('jedes hatPopup:true-Werkzeug hat einen registrierten Stufe2-Inhalt', () => {
    for (const w of PUBLISH_WERKZEUG_KATALOG.filter((x) => x.hatPopup)) {
      const inhalt = publishInhaltsRegistry.inhaltFuer(w.id);
      expect(inhalt?.Stufe2, `Werkzeug "${w.id}" hat keinen Stufe2-Inhalt`).toBeDefined();
    }
  });

  it('registrierteIds() deckt exakt die hatPopup:true-Werkzeuge (keine Karteileiche, kein Fehlender; PB3 v0.8.5: 12 seit «sichtbarkeit»)', () => {
    const erwartete = PUBLISH_WERKZEUG_KATALOG.filter((x) => x.hatPopup)
      .map((w) => w.id)
      .sort();
    expect(publishInhaltsRegistry.registrierteIds().slice().sort()).toEqual(erwartete);
  });

  it('«manuell» ist NICHT registriert (Rückweg läuft über onWerkzeugAktion, kein Popup)', () => {
    expect(publishInhaltsRegistry.inhaltFuer('manuell')).toBeUndefined();
  });

  it('doppelte Registrierung wirft (Programmierfehler-Schutz, Muster design InhaltsRegistry)', () => {
    expect(() => publishInhaltsRegistry.registriere('blatt', {})).toThrow();
  });
});
