import { describe, expect, it } from 'vitest';
import {
  anthropicUnterstuetztPdfVision,
  baueHypothesenKarten,
  beginntMitPdfMagic,
  betriebsLageAusRoh,
  erkennePdf,
  istPdfDateiname,
  pdfImportPfad,
  type BetriebsLage,
} from '../src/modules/design/unternehmerplan-pdf';

/**
 * Nacht v0.6.2 (C5/PDF, `docs/SUBMISSION-KONZEPT.md`) — der ehrliche PDF-
 * Pfad des Unternehmerplan-Imports. Alles hier ist rein (kein DOM, kein
 * Store): Erkennung (Endung/Magic-Bytes), das Betriebsarten-Gate
 * (`pdfImportPfad`) und die Stufe-2-Hypothesen-Karten-Übersetzung. Der
 * Anthropic-Provider (`packages/kosmo-ai/src/anthropic.ts`) kennt heute
 * keine Bild-/Dokument-Inputs — darum bleibt `pdfImportPfad` auch in der
 * Cloud-Betriebsart bei der ehrlichen Lücken-Meldung statt einen Befund zu
 * erfinden (s. Dateikopf `unternehmerplan-pdf.ts`).
 */

const PDF_BYTES = new TextEncoder().encode('%PDF-1.4\n%…fake…');

function lage(teil: Partial<BetriebsLage>): BetriebsLage {
  return {
    betriebsart: 'standard',
    provider: 'ollama',
    anthropicSchluessel: '',
    anthropicOauthToken: '',
    ...teil,
  };
}

describe('Erkennung (istPdfDateiname/beginntMitPdfMagic/erkennePdf)', () => {
  it('erkennt die .pdf-Endung unabhängig von Gross-/Kleinschreibung', () => {
    expect(istPdfDateiname('unternehmer.pdf')).toBe(true);
    expect(istPdfDateiname('unternehmer.PDF')).toBe(true);
    expect(istPdfDateiname('unternehmer.dxf')).toBe(false);
  });

  it('erkennt die %PDF-Magic-Bytes am Dateianfang', () => {
    expect(beginntMitPdfMagic(PDF_BYTES)).toBe(true);
  });

  it('lehnt zu kurze oder falsche Byte-Folgen als Magic ab', () => {
    expect(beginntMitPdfMagic(new Uint8Array([0x25, 0x50]))).toBe(false); // zu kurz
    expect(beginntMitPdfMagic(new TextEncoder().encode('DXF-Text-Anfang'))).toBe(false);
  });

  it('erkennePdf: Endung .pdf reicht ohne Bytes-Check', () => {
    expect(erkennePdf('plan.pdf', new Uint8Array())).toBe(true);
  });

  it('erkennePdf: falsche Endung, aber %PDF-Magic → Fallback greift (Kernfall der Aufgabe)', () => {
    expect(erkennePdf('unternehmer.dxf', PDF_BYTES)).toBe(true);
  });

  it('erkennePdf: weder Endung noch Magic → kein PDF, geht in den DXF-Parser', () => {
    const dxfBytes = new TextEncoder().encode('0\nSECTION\n2\nHEADER\n');
    expect(erkennePdf('unternehmer.dxf', dxfBytes)).toBe(false);
  });
});

describe('Betriebsarten-Gate (pdfImportPfad)', () => {
  it('Cloud + Anthropic-Schlüssel konfiguriert → vision-anfrage', () => {
    const e = pdfImportPfad(
      lage({ betriebsart: 'cloud', provider: 'anthropic', anthropicSchluessel: 'sk-test' }),
    );
    expect(e.modus).toBe('vision-anfrage');
  });

  it('Cloud + Abo-Token (ohne Schlüssel) konfiguriert → vision-anfrage', () => {
    const e = pdfImportPfad(
      lage({ betriebsart: 'cloud', provider: 'anthropic', anthropicOauthToken: 'oauth-test' }),
    );
    expect(e.modus).toBe('vision-anfrage');
  });

  it('Cloud OHNE Schlüssel/Token → hinweis (nicht vision-anfrage)', () => {
    const e = pdfImportPfad(lage({ betriebsart: 'cloud', provider: 'anthropic' }));
    expect(e.modus).toBe('hinweis');
  });

  it('Cloud-Betriebsart, aber Provider nicht anthropic (inkonsistenter Zustand) → hinweis', () => {
    const e = pdfImportPfad(lage({ betriebsart: 'cloud', provider: 'mock', anthropicSchluessel: 'sk-test' }));
    expect(e.modus).toBe('hinweis');
  });

  it('Standard-Betriebsart → hinweis, auch mit (irrelevantem) Schlüssel', () => {
    const e = pdfImportPfad(lage({ betriebsart: 'standard', anthropicSchluessel: 'sk-test' }));
    expect(e.modus).toBe('hinweis');
  });

  it('Remote-Betriebsart → hinweis', () => {
    const e = pdfImportPfad(lage({ betriebsart: 'remote' }));
    expect(e.modus).toBe('hinweis');
  });

  it('vision-anfrage-Text nennt die dokumentierte Lücke, solange der Provider keine Vision kann', () => {
    const e = pdfImportPfad(
      lage({ betriebsart: 'cloud', provider: 'anthropic', anthropicSchluessel: 'sk-test' }),
      false,
    );
    expect(e.text).toContain('Vision-Unterstützung des Providers');
    expect(e.text).toContain('noch nicht angeschlossen');
  });

  it('hinweis-Text erklärt ehrlich, warum keine automatische Analyse möglich ist, und nennt den DXF-Weg', () => {
    const e = pdfImportPfad(lage({ betriebsart: 'standard' }));
    expect(e.text).toMatch(/PDF/);
    expect(e.text).toMatch(/keine automatische Analyse/);
    expect(e.text).toMatch(/DXF/);
  });

  it('anthropicUnterstuetztPdfVision meldet ehrlich den heutigen Stand (kein Bild-/Dokument-Input)', () => {
    expect(anthropicUnterstuetztPdfVision()).toBe(false);
  });

  it('wäre der Provider vision-fähig, bliebe der Modus vision-anfrage mit anderem Text (kein Lücken-Hinweis mehr)', () => {
    const e = pdfImportPfad(
      lage({ betriebsart: 'cloud', provider: 'anthropic', anthropicSchluessel: 'sk-test' }),
      true,
    );
    expect(e.modus).toBe('vision-anfrage');
    expect(e.text).not.toContain('noch nicht angeschlossen');
  });
});

describe('betriebsLageAusRoh', () => {
  it('fehlende/kaputte Einstellungen fallen konservativ auf Standard/Ollama zurück', () => {
    expect(betriebsLageAusRoh(null)).toEqual(
      lage({ betriebsart: 'standard', provider: 'ollama' }),
    );
    expect(betriebsLageAusRoh({})).toEqual(lage({ betriebsart: 'standard', provider: 'ollama' }));
  });

  it('übernimmt betriebsart/provider/Schlüssel/Token 1:1 aus den kosmo.llm-Einstellungen', () => {
    const l = betriebsLageAusRoh({
      betriebsart: 'cloud',
      provider: 'anthropic',
      anthropicKey: 'sk-abc',
      anthropicOauthToken: 'oauth-abc',
    });
    expect(l).toEqual(
      lage({
        betriebsart: 'cloud',
        provider: 'anthropic',
        anthropicSchluessel: 'sk-abc',
        anthropicOauthToken: 'oauth-abc',
      }),
    );
  });

  it('unbekannte betriebsart/provider-Strings fallen ehrlich auf den sicheren Nicht-Cloud-Zustand zurück', () => {
    const l = betriebsLageAusRoh({ betriebsart: 'irgendwas', provider: 'irgendwas' } as never);
    expect(l.betriebsart).toBe('standard');
    expect(l.provider).toBe('ollama');
  });
});

describe('baueHypothesenKarten — IMMER Stufe 2', () => {
  it('jede Hypothese wird zu einer Stufe-2-Karte, unabhängig von der gemeldeten Konfidenz', () => {
    const karten = baueHypothesenKarten([
      { bauteil: 'Tragende Wand Achse 3', befund: 'wirkt 200 mm verschoben', konfidenz: 0.95 },
      { bauteil: 'Fenster OG', befund: 'in der Bildvorlage nicht erkennbar', konfidenz: 0.2 },
      { bauteil: 'Treppe EG', befund: 'Lauflinie weicht ab', konfidenz: 0.5 },
    ]);
    expect(karten).toHaveLength(3);
    for (const k of karten) {
      expect(k.stufe).toBe(2);
    }
  });

  it('Titel/Detail sind konkret (Bauteil + Befund) und nennen den Vision-Vorbehalt', () => {
    const [karte] = baueHypothesenKarten([
      { bauteil: 'Stütze S4', befund: 'fehlt im Foto', konfidenz: 0.6 },
    ]);
    expect(karte!.titel).toContain('Stütze S4');
    expect(karte!.titel).toContain('fehlt im Foto');
    expect(karte!.detail).toMatch(/Konfidenz 60 %/);
    expect(karte!.detail).toMatch(/keine vermessene Geometrie/);
  });

  it('leere Hypothesenliste ergibt eine leere Kartenliste (kein Fake-Eintrag)', () => {
    expect(baueHypothesenKarten([])).toEqual([]);
  });
});
