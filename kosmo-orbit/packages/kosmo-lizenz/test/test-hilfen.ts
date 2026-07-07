/**
 * NUR FÜR TESTS. Erzeugt ein Ed25519-Test-Keypair und signiert damit eine
 * Test-Lizenz. Lebt bewusst unter `test/`, nicht unter `src/` — kein
 * Signierwerkzeug soll je Teil des ausgelieferten Pakets werden. Der echte
 * Owner-private-Key bleibt auf Owner-Infrastruktur und taucht NIE in diesem
 * Repo auf; hier wird pro Testlauf ein frisches, wertloses Keypair erzeugt.
 */
import { bytesZuBase64, kanonischeLizenznachricht, kodiereLizenztext, type LizenzDaten, type LizenzPaket } from '../src/lizenz.ts';

export interface TestSchluesselpaar {
  publicKeyBase64: string;
  privateKey: CryptoKey;
}

export async function erzeugeTestSchluesselpaar(): Promise<TestSchluesselpaar> {
  const paar = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const roh = await crypto.subtle.exportKey('raw', paar.publicKey);
  return { publicKeyBase64: bytesZuBase64(new Uint8Array(roh)), privateKey: paar.privateKey };
}

/** Signiert `daten` mit dem Test-Private-Key und liefert das fertige Lizenz-Text-Format. */
export async function erzeugeTestLizenz(daten: LizenzDaten, privateKey: CryptoKey): Promise<string> {
  const nachricht = new TextEncoder().encode(kanonischeLizenznachricht(daten));
  const signaturBytes = await crypto.subtle.sign('Ed25519', privateKey, nachricht);
  const paket: LizenzPaket = { daten, signatur: bytesZuBase64(new Uint8Array(signaturBytes)) };
  return kodiereLizenztext(paket);
}
