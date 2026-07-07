/**
 * @kosmo/lizenz — signierte Lizenz, reine Verify-Funktion (Serie I / Batch B6).
 *
 * **Ehrliches Urteil (docs/SERIE-I-BUILDPLAN.md §3):** eine rein clientseitige
 * Lizenzprüfung ist grundsätzlich umgehbar — der öffentliche Schlüssel steckt
 * im Build und ist patchbar, ein entschlossener Angreifer entfernt den Check.
 * Diese Prüfung ist deshalb bewusst **Reibung, keine Garantie**: sie blendet
 * einen ehrlichen Hinweis ein, sperrt aber NIE die lokale Arbeit hart aus.
 * Der einzige wirklich harte Hebel ist die **Server-Bindung** (Sync-`onAuthenticate`
 * / Bridge-`token_guard`) — die läuft server-seitig, wo ein Client-Patch nicht
 * hinreicht.
 *
 * **Kein privater Schlüssel in diesem Paket.** Nur `verifiziereLizenz` (prüft
 * eine fertige, signierte Lizenz gegen einen ÖFFENTLICHEN Schlüssel) lebt hier.
 * Das Signieren selbst passiert auf Owner-Infrastruktur; ein Test-Keypair für
 * die Unit-Tests liegt separat unter `test/test-hilfen.ts` — nie hier im
 * Haupt-Modul, damit kein Signierwerkzeug versehentlich mitgebaut wird.
 *
 * **Web Crypto statt npm-Dep**: `crypto.subtle` mit Ed25519 läuft nativ in
 * Node ≥ 20 und in allen modernen Browsern — kein zusätzliches Paket, keine
 * Lieferketten-Fläche.
 *
 * `jetzt` ist immer ein Parameter, nie `Date.now()`/`new Date()` intern —
 * damit `verifiziereLizenz` deterministisch testbar bleibt (gültig/abgelaufen
 * lässt sich mit einem festen Testdatum exakt nachstellen).
 */

/** Lizenz-Datenmodell — die Felder, die tatsächlich signiert werden. */
export interface LizenzDaten {
  /** Wer die Lizenz hält (Büro-/Personenname). */
  inhaber: string;
  /** Edition/Stufe, z.B. `standard`, `remote`, `cloud`. */
  edition: string;
  /** ISO-Datum (`YYYY-MM-DD`) oder voller ISO-Zeitstempel — gültig bis Ende dieses Tages/Zeitpunkts. */
  gueltigBis: string;
  /** ISO-Zeitstempel der Ausstellung (Dokumentation, fliesst nicht in die Gültigkeitsprüfung ein). */
  ausgestelltAm: string;
  /** Eindeutige Lizenz-ID — Grundlage der Widerrufsliste. */
  lizenzId: string;
}

/** Das signierte Paket: Daten + Ed25519-Signatur (base64) über die kanonische Form. */
export interface LizenzPaket {
  daten: LizenzDaten;
  /** base64-kodierte Ed25519-Signatur (64 Rohbytes) über `kanonischeLizenznachricht(daten)`. */
  signatur: string;
}

export type LizenzGrund =
  | 'lizenztext_ungueltig'
  | 'lizenzdaten_unvollstaendig'
  | 'oeffentlicher_schluessel_ungueltig'
  | 'signaturformat_ungueltig'
  | 'signatur_ungueltig'
  | 'abgelaufen'
  | 'widerrufen';

export interface LizenzErgebnis {
  gueltig: boolean;
  /** Nur gesetzt, wenn `gueltig === false`. */
  grund?: LizenzGrund;
  /** Gesetzt, sobald die Daten lesbar sind — auch bei `abgelaufen`/`widerrufen`, damit die App den Inhaber trotzdem anzeigen kann. */
  lizenz?: LizenzDaten;
}

const PFLICHTFELDER: (keyof LizenzDaten)[] = [
  'inhaber',
  'edition',
  'gueltigBis',
  'ausgestelltAm',
  'lizenzId',
];

/**
 * Kanonische, sprachübergreifend reproduzierbare Signier-Nachricht — eine
 * feste Feldreihenfolge statt JSON-Schlüsselreihenfolge (die zwischen
 * TypeScript und der Python-Implementierung in der Bridge sonst driften
 * könnte). Jede Änderung hier bricht ALLE bestehenden Lizenzen — nicht ohne
 * Migrationsplan anfassen.
 */
export function kanonischeLizenznachricht(daten: LizenzDaten): string {
  return [
    'kosmo-lizenz/v1',
    `inhaber=${daten.inhaber}`,
    `edition=${daten.edition}`,
    `gueltigBis=${daten.gueltigBis}`,
    `ausgestelltAm=${daten.ausgestelltAm}`,
    `lizenzId=${daten.lizenzId}`,
  ].join('\n');
}

/** UTF-8-sichere Bytes → base64 (kein `Buffer` — läuft im Browser wie in Node). */
export function bytesZuBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

/** base64 → Bytes (kein `Buffer`). Wirft bei kaputtem base64. */
export function base64ZuBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Lesbare `LizenzDaten`? Nur einfache String-Prüfung — kein zod nötig für 5 Felder. */
function datenVollstaendig(wert: unknown): wert is LizenzDaten {
  if (!wert || typeof wert !== 'object') return false;
  const d = wert as Record<string, unknown>;
  return PFLICHTFELDER.every((feld) => typeof d[feld] === 'string' && d[feld]!.trim().length > 0);
}

/** `gueltigBis` → Zeitpunkt, bis zu dem die Lizenz gilt (Ende des Tages bei reinem Datum). */
function gueltigBisMs(gueltigBis: string): number {
  const nurDatum = /^\d{4}-\d{2}-\d{2}$/.test(gueltigBis);
  return Date.parse(nurDatum ? `${gueltigBis}T23:59:59.999Z` : gueltigBis);
}

/**
 * Baut das Lizenz-Text-Format: base64(UTF-8(JSON(paket))) — ein einziger
 * opaker String, der sich in ein Textfeld einfügen lässt (kein `Buffer`,
 * kein JSON mit Zeilenumbrüchen im Klartext).
 */
export function kodiereLizenztext(paket: LizenzPaket): string {
  const json = JSON.stringify(paket);
  return bytesZuBase64(new TextEncoder().encode(json));
}

function dekodiereLizenztext(lizenzText: string): LizenzPaket | null {
  try {
    const json = new TextDecoder().decode(base64ZuBytes(lizenzText));
    const paket = JSON.parse(json) as unknown;
    if (
      paket &&
      typeof paket === 'object' &&
      'daten' in paket &&
      'signatur' in paket &&
      typeof (paket as { signatur: unknown }).signatur === 'string'
    ) {
      return paket as LizenzPaket;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Prüft eine signierte Lizenz gegen einen öffentlichen Ed25519-Schlüssel.
 *
 * @param lizenzText  base64(UTF-8(JSON({daten, signatur}))) — siehe `kodiereLizenztext`.
 * @param publicKeyBase64  32 Roh-Bytes (raw, base64) — der ÖFFENTLICHE Schlüssel aus dem Build/Env.
 * @param jetzt  der Prüfzeitpunkt — niemals intern `new Date()`, damit der Test deterministisch bleibt.
 */
export async function verifiziereLizenz(
  lizenzText: string,
  publicKeyBase64: string,
  jetzt: Date,
): Promise<LizenzErgebnis> {
  const paket = dekodiereLizenztext(lizenzText);
  if (!paket) return { gueltig: false, grund: 'lizenztext_ungueltig' };
  if (!datenVollstaendig(paket.daten)) {
    return { gueltig: false, grund: 'lizenzdaten_unvollstaendig' };
  }

  let pubBytes: Uint8Array;
  let sigBytes: Uint8Array;
  try {
    pubBytes = base64ZuBytes(publicKeyBase64);
    if (pubBytes.length !== 32) throw new Error('falsche Länge');
  } catch {
    return { gueltig: false, grund: 'oeffentlicher_schluessel_ungueltig' };
  }
  try {
    sigBytes = base64ZuBytes(paket.signatur);
    if (sigBytes.length !== 64) throw new Error('falsche Länge');
  } catch {
    return { gueltig: false, grund: 'signaturformat_ungueltig' };
  }

  try {
    const key = await crypto.subtle.importKey('raw', pubBytes as BufferSource, { name: 'Ed25519' }, false, [
      'verify',
    ]);
    const nachricht = new TextEncoder().encode(kanonischeLizenznachricht(paket.daten));
    const ok = await crypto.subtle.verify('Ed25519', key, sigBytes as BufferSource, nachricht as BufferSource);
    if (!ok) return { gueltig: false, grund: 'signatur_ungueltig', lizenz: paket.daten };
  } catch {
    return { gueltig: false, grund: 'signatur_ungueltig' };
  }

  if (jetzt.getTime() > gueltigBisMs(paket.daten.gueltigBis)) {
    return { gueltig: false, grund: 'abgelaufen', lizenz: paket.daten };
  }

  return { gueltig: true, lizenz: paket.daten };
}

/** Reine Widerrufsprüfung — getrennt von `verifiziereLizenz`, weil Server
 * (Sync/Bridge) die Liste selbst laden (Env/Datei), das Verify-Ergebnis aber
 * unverändert lassen sollen. */
export function istWiderrufen(lizenzId: string, widerrufsliste: readonly string[]): boolean {
  return widerrufsliste.includes(lizenzId);
}
