import { describe, expect, it } from 'vitest';
import { istWiderrufen, kodiereLizenztext, verifiziereLizenz, type LizenzDaten, type LizenzPaket } from '../src';
import { erzeugeTestLizenz, erzeugeTestSchluesselpaar } from './test-hilfen';

const beispielDaten: LizenzDaten = {
  inhaber: 'Baubüro Andrin',
  edition: 'standard',
  gueltigBis: '2026-12-31',
  ausgestelltAm: '2026-01-01T00:00:00.000Z',
  lizenzId: 'lz-0001',
};

describe('verifiziereLizenz — Serie I / Batch B6', () => {
  it('gültig: richtige Signatur, richtiger Public Key, vor Ablauf', async () => {
    const { publicKeyBase64, privateKey } = await erzeugeTestSchluesselpaar();
    const lizenzText = await erzeugeTestLizenz(beispielDaten, privateKey);
    const ergebnis = await verifiziereLizenz(lizenzText, publicKeyBase64, new Date('2026-06-01T00:00:00.000Z'));
    expect(ergebnis.gueltig).toBe(true);
    expect(ergebnis.lizenz?.inhaber).toBe('Baubüro Andrin');
  });

  it('abgelaufen: gueltigBis liegt vor jetzt', async () => {
    const { publicKeyBase64, privateKey } = await erzeugeTestSchluesselpaar();
    const lizenzText = await erzeugeTestLizenz(beispielDaten, privateKey);
    const ergebnis = await verifiziereLizenz(lizenzText, publicKeyBase64, new Date('2027-01-15T00:00:00.000Z'));
    expect(ergebnis.gueltig).toBe(false);
    expect(ergebnis.grund).toBe('abgelaufen');
    // Trotz Ablauf bleiben die Daten lesbar — die App darf den Inhaber weiter anzeigen.
    expect(ergebnis.lizenz?.inhaber).toBe('Baubüro Andrin');
  });

  it('manipulierte Signatur: verändertes Datenfeld nach dem Signieren wird abgewiesen', async () => {
    const { publicKeyBase64, privateKey } = await erzeugeTestSchluesselpaar();
    const lizenzText = await erzeugeTestLizenz(beispielDaten, privateKey);
    // Lizenztext dekodieren, ein Feld verfälschen (z.B. Edition anheben), wieder kodieren —
    // die Signatur passt danach nicht mehr zur Nachricht.
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(lizenzText), (c) => c.charCodeAt(0)))) as LizenzPaket;
    json.daten = { ...json.daten, edition: 'cloud' };
    const manipuliert = kodiereLizenztext(json);
    const ergebnis = await verifiziereLizenz(manipuliert, publicKeyBase64, new Date('2026-06-01T00:00:00.000Z'));
    expect(ergebnis.gueltig).toBe(false);
    expect(ergebnis.grund).toBe('signatur_ungueltig');
  });

  it('falscher Public Key: Signatur passt nicht zu einem fremden Schlüssel', async () => {
    const { privateKey } = await erzeugeTestSchluesselpaar();
    const fremderSchluessel = await erzeugeTestSchluesselpaar();
    const lizenzText = await erzeugeTestLizenz(beispielDaten, privateKey);
    const ergebnis = await verifiziereLizenz(lizenzText, fremderSchluessel.publicKeyBase64, new Date('2026-06-01T00:00:00.000Z'));
    expect(ergebnis.gueltig).toBe(false);
    expect(ergebnis.grund).toBe('signatur_ungueltig');
  });

  it('kaputter Text: kein base64/JSON wird ehrlich abgewiesen statt zu crashen', async () => {
    const { publicKeyBase64 } = await erzeugeTestSchluesselpaar();
    const ergebnis = await verifiziereLizenz('***kein-base64***', publicKeyBase64, new Date());
    expect(ergebnis.gueltig).toBe(false);
    expect(ergebnis.grund).toBe('lizenztext_ungueltig');

    // Gültiges base64, aber kein JSON drin
    const nichtJson = btoa('das ist kein json');
    const ergebnis2 = await verifiziereLizenz(nichtJson, publicKeyBase64, new Date());
    expect(ergebnis2.gueltig).toBe(false);
    expect(ergebnis2.grund).toBe('lizenztext_ungueltig');
  });

  it('unvollständige Lizenzdaten (fehlendes Feld) werden abgewiesen', async () => {
    const { publicKeyBase64, privateKey } = await erzeugeTestSchluesselpaar();
    const unvollstaendig = { ...beispielDaten, lizenzId: '' };
    const lizenzText = await erzeugeTestLizenz(unvollstaendig, privateKey);
    const ergebnis = await verifiziereLizenz(lizenzText, publicKeyBase64, new Date('2026-06-01T00:00:00.000Z'));
    expect(ergebnis.gueltig).toBe(false);
    expect(ergebnis.grund).toBe('lizenzdaten_unvollstaendig');
  });

  it('kaputter/zu kurzer Public Key wird ehrlich abgewiesen', async () => {
    const { privateKey } = await erzeugeTestSchluesselpaar();
    const lizenzText = await erzeugeTestLizenz(beispielDaten, privateKey);
    const ergebnis = await verifiziereLizenz(lizenzText, btoa('zu-kurz'), new Date('2026-06-01T00:00:00.000Z'));
    expect(ergebnis.gueltig).toBe(false);
    expect(ergebnis.grund).toBe('oeffentlicher_schluessel_ungueltig');
  });
});

describe('istWiderrufen', () => {
  it('erkennt eine Lizenz-ID in der Widerrufsliste', () => {
    expect(istWiderrufen('lz-0001', ['lz-0001', 'lz-0002'])).toBe(true);
    expect(istWiderrufen('lz-0003', ['lz-0001', 'lz-0002'])).toBe(false);
    expect(istWiderrufen('lz-0001', [])).toBe(false);
  });
});
