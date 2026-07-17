import { describe, expect, it } from 'vitest';
import {
  KXP_PLATZHALTER_ROLLEN,
  KXP_SCHEMA,
  KxpManifestSchema,
  kxpErlaubteUebergaenge,
  kxpUebergangAnwenden,
  type KxpTrust,
} from '../src/state/kxp-format';

/**
 * `.kxp`-Trust-Layer-Zustandsmaschine (v0.8.1 / P11, `docs/V081-SPEZ.md`
 * §7(a)/§9 C-29) — reine Funktionen, ohne DOM/IndexedDB testbar. Belegt zwei
 * Dinge wörtlich gegen den Owner-Auftrag: (1) die Zustandsmaschine läuft
 * ECHT (erlaubte/verbotene Übergänge, Verlaufsprotokoll wächst), (2) die
 * Signatur bleibt STRUKTURELL angelegt, aber in diesem Container IMMER
 * unsigniert — kein Code-Pfad setzt sie auf `true`.
 */

function leererTrust(): KxpTrust {
  return { status: 'entwurf', verlauf: [], signatur: { signiert: false, hinweis: 'unsigniert — Trust-Layer braucht Konten/HomeStation' } };
}

describe('KxpManifestSchema — Struktur/Defaults', () => {
  it('füllt Defaults (schema/trust/contents), Signatur bleibt strukturell unsigniert', () => {
    const geparst = KxpManifestSchema.parse({
      id: 'p1',
      name: 'Testprojekt',
      quelle_projekt: { id: 'p1', name: 'Testprojekt' },
      exportiert_um: '2026-07-16T00:00:00.000Z',
    });
    expect(geparst.schema).toBe(KXP_SCHEMA);
    expect(geparst.trust.status).toBe('entwurf');
    expect(geparst.trust.verlauf).toEqual([]);
    expect(geparst.trust.signatur.signiert).toBe(false);
    expect(geparst.trust.signatur.hinweis).toMatch(/Konten\/HomeStation/);
    expect(geparst.contents.plaene).toEqual([]);
  });

  it('lehnt ein Manifest ohne Pflichtfelder (quelle_projekt) ab — keine stille Lücke', () => {
    const ergebnis = KxpManifestSchema.safeParse({ id: 'p1', name: 'X', exportiert_um: '2026-01-01' });
    expect(ergebnis.success).toBe(false);
  });

  it('zod lehnt `signiert:true` strukturell ab (literal false) — kein Weg, eine Signatur vorzutäuschen', () => {
    const ergebnis = KxpManifestSchema.safeParse({
      id: 'p1',
      name: 'X',
      quelle_projekt: { id: 'p1', name: 'X' },
      exportiert_um: '2026-01-01',
      trust: { status: 'entwurf', verlauf: [], signatur: { signiert: true, hinweis: 'x' } },
    });
    expect(ergebnis.success).toBe(false);
  });
});

describe('kxpErlaubteUebergaenge / kxpUebergangAnwenden — Freigabe-Zustandsmaschine', () => {
  it('Entwurf erlaubt genau «Zur Freigabe», Freigegeben ist terminal (kein Übergang)', () => {
    expect(kxpErlaubteUebergaenge('entwurf')).toEqual(['zur_freigabe']);
    expect(kxpErlaubteUebergaenge('freigegeben')).toEqual([]);
  });

  it('ein erlaubter Übergang hängt einen Verlaufseintrag an und setzt den neuen Status', () => {
    const trust = leererTrust();
    const ergebnis = kxpUebergangAnwenden(trust, 'zur_freigabe', KXP_PLATZHALTER_ROLLEN[0], undefined, '2026-07-16T10:00:00.000Z');
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    expect(ergebnis.trust.status).toBe('zur_freigabe');
    expect(ergebnis.trust.verlauf).toHaveLength(1);
    expect(ergebnis.trust.verlauf[0]).toEqual({
      ts: '2026-07-16T10:00:00.000Z',
      von: 'entwurf',
      nach: 'zur_freigabe',
      akteur: KXP_PLATZHALTER_ROLLEN[0],
    });
    // Ursprüngliches Objekt bleibt unverändert (reine Funktion, kein Mutieren).
    expect(trust.status).toBe('entwurf');
    expect(trust.verlauf).toHaveLength(0);
  });

  it('ein NICHT erlaubter Übergang (z.B. Entwurf → Freigegeben) liefert {ok:false}, wirft nie', () => {
    const trust = leererTrust();
    expect(() => kxpUebergangAnwenden(trust, 'freigegeben', 'Ersteller (lokal)')).not.toThrow();
    const ergebnis = kxpUebergangAnwenden(trust, 'freigegeben', 'Ersteller (lokal)');
    expect(ergebnis.ok).toBe(false);
    if (ergebnis.ok) return;
    expect(ergebnis.fehler).toMatch(/nicht erlaubt/);
  });

  it('ein Übergang ohne Rolle wird ehrlich abgelehnt (keine anonyme Freigabe)', () => {
    const trust = leererTrust();
    const ergebnis = kxpUebergangAnwenden(trust, 'zur_freigabe', '   ');
    expect(ergebnis.ok).toBe(false);
  });

  it('Ablehnungs-Rückweg: zur_freigabe → abgelehnt → entwurf, Verlauf wächst über beide Schritte', () => {
    let trust = leererTrust();
    let r = kxpUebergangAnwenden(trust, 'zur_freigabe', 'Ersteller (lokal)');
    expect(r.ok).toBe(true);
    if (r.ok) trust = r.trust;
    r = kxpUebergangAnwenden(trust, 'abgelehnt', 'Prüfer (Platzhalter)', 'fehlender Massstab');
    expect(r.ok).toBe(true);
    if (r.ok) trust = r.trust;
    expect(trust.status).toBe('abgelehnt');
    r = kxpUebergangAnwenden(trust, 'entwurf', 'Ersteller (lokal)');
    expect(r.ok).toBe(true);
    if (r.ok) trust = r.trust;
    expect(trust.verlauf).toHaveLength(3);
    expect(trust.verlauf.map((e) => e.nach)).toEqual(['zur_freigabe', 'abgelehnt', 'entwurf']);
    expect(trust.verlauf[1]?.notiz).toBe('fehlender Massstab');
  });

  it('freigegeben lässt sich NICHT direkt aus «entwurf» erreichen (muss über zur_freigabe laufen)', () => {
    const trust = leererTrust();
    const ergebnis = kxpUebergangAnwenden(trust, 'freigegeben', 'Freigeber (Platzhalter)');
    expect(ergebnis.ok).toBe(false);
  });
});
