import type { Betriebsart } from '@kosmo/ai';

/**
 * Ehrlicher PDF-Pfad des Unternehmerplan-Imports (V1.6 Block C, Nacht v0.6.2,
 * `docs/SUBMISSION-KONZEPT.md` Abschnitt C5/PDF).
 *
 * Der DXF-Import (`unternehmerplan.ts`) liest Vektor-Geometrie und kann
 * darum echte, geometrisch verlässliche Abgleich-Befunde bauen. Ein PDF
 * trägt in aller Regel KEINE verlässliche Vektor-Geometrie (gerastert,
 * gedruckt-und-gescannt, oder ein CAD-Export ohne Layer-Struktur) — Kosmo
 * kann daraus nie einen Stufe-1-Command-Kandidaten ableiten, egal wie gut
 * das Modell dahinter ist. Owner-Regel «Ehrlichkeit vor Politur»: KEINE
 * fake Vision, KEINE Attrappe — aber ein ehrlicher, nützlicher Pfad.
 *
 * Zwei reine Bausteine, bewusst UNABHÄNGIG von `unternehmerplan.ts`
 * (kein Import von dort, kein Import aus `@kosmo/kernel`) — das hält diese
 * Datei ohne DOM und ohne Store testbar:
 * - `erkennePdf`/`istPdfDateiname`/`beginntMitPdfMagic`: Erkennung am Import
 *   (Endung zuerst, `%PDF`-Magic-Bytes als Fallback bei falscher/fehlender
 *   Endung — DesignWorkspace.tsx prüft beides, bevor eine Datei in den
 *   DXF-Parser geht).
 * - `pdfImportPfad`: das Betriebsarten-Gate — dieselbe Weiche wie
 *   `betriebKonfig`/`werkzeugeFuer` (`packages/kosmo-ai/src/betrieb.ts`,
 *   von KosmoPanel.tsx konsumiert): nur Cloud-Betriebsart MIT konfiguriertem
 *   Anthropic-Zugang darf überhaupt einen Vision-Anfrage-Pfad einschlagen;
 *   Standard/Remote (lokales LLM, keine Bild-/Dokument-Fähigkeit) und Cloud
 *   ohne Schlüssel/Abo-Token bekommen den ehrlichen Hinweis.
 *
 * **Dokumentierte Lücke**: `packages/kosmo-ai/src/provider.ts` kennt nur
 * `ChatMessage.content: string` — reinen Text. Der Anthropic-Provider
 * (`packages/kosmo-ai/src/anthropic.ts`, `zuAnthropicNachrichten`) baut
 * daraus ausschliesslich `text`/`tool_use`/`tool_result`-Blöcke; es gibt
 * dort keinen `image`/`document`-Content-Block und keinen Weg, Bild- oder
 * PDF-Bytes an die Messages-API zu hängen. Also: selbst in der Cloud-
 * Betriebsart mit konfiguriertem Schlüssel gibt es HEUTE keine echte
 * Vision-Anfrage — `anthropicUnterstuetztPdfVision()` sagt das ehrlich
 * (`false`), und `pdfImportPfad` gibt dafür den in
 * `docs/SUBMISSION-KONZEPT.md` verlangten Wortlaut zurück, statt einen
 * Befund zu erfinden oder die Anfrage nur zur Hälfte zu bauen.
 */

/** Wie das Betriebsarten-Gate die aktive Lage sieht — dieselben Felder wie
 * `KosmoSettings` in `KosmoPanel.tsx`, hier auf das Nötige verschlankt. */
export interface BetriebsLage {
  betriebsart: Betriebsart;
  provider: 'ollama' | 'lmstudio' | 'anthropic' | 'mock';
  /** Klassischer API-Schlüssel (leer = nicht gesetzt). */
  anthropicSchluessel: string;
  /** Cloud-Login-Token («Mit Claude anmelden», Desktop-OAuth; leer = nicht gesetzt). */
  anthropicOauthToken: string;
}

/** Roh-Form von `localStorage['kosmo.llm']` — alle Felder optional, weil ein
 * frischer Browser/Test-Lauf ggf. noch keine Einstellungen gespeichert hat. */
export interface RoheEinstellungen {
  betriebsart?: string;
  provider?: string;
  anthropicKey?: string;
  anthropicOauthToken?: string;
}

/** Baut eine `BetriebsLage` aus den (roh geparsten) `kosmo.llm`-Einstellungen
 * — derselbe Speicherort, den `KosmoPanel.tsx`/`Diagnose.tsx`/`WerkzeugSetup.tsx`
 * bereits lesen. Unbekannte/fehlende Werte fallen konservativ auf den
 * Nicht-Cloud-Zustand zurück (kein Vision-Pfad ohne explizite Konfiguration). */
export function betriebsLageAusRoh(roh: RoheEinstellungen | null | undefined): BetriebsLage {
  const betriebsart: Betriebsart =
    roh?.betriebsart === 'remote' || roh?.betriebsart === 'cloud' ? roh.betriebsart : 'standard';
  const provider: BetriebsLage['provider'] =
    roh?.provider === 'anthropic' || roh?.provider === 'lmstudio' || roh?.provider === 'mock'
      ? roh.provider
      : 'ollama';
  return {
    betriebsart,
    provider,
    anthropicSchluessel: roh?.anthropicKey ?? '',
    anthropicOauthToken: roh?.anthropicOauthToken ?? '',
  };
}

/** Cloud-Betriebsart UND ein konfigurierter Anthropic-Zugang (Schlüssel ODER
 * Abo-Token) — genau die Bedingung, unter der `betriebKonfig` selbst den
 * `anthropic`-Provider baut (`packages/kosmo-ai/src/betrieb.ts`). */
function cloudProviderKonfiguriert(lage: BetriebsLage): boolean {
  return (
    lage.betriebsart === 'cloud' &&
    lage.provider === 'anthropic' &&
    (lage.anthropicSchluessel.trim() !== '' || lage.anthropicOauthToken.trim() !== '')
  );
}

// ── Erkennung ─────────────────────────────────────────────────────────────

/** `%PDF` — die ersten vier Bytes jeder PDF-Datei (PDF-Spezifikation §7.5.2). */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // % P D F

export function istPdfDateiname(dateiname: string): boolean {
  return /\.pdf$/i.test(dateiname);
}

/** Prüft die ersten (mindestens 4) Bytes auf die `%PDF`-Kennung. */
export function beginntMitPdfMagic(ersteBytes: Uint8Array): boolean {
  if (ersteBytes.length < PDF_MAGIC.length) return false;
  return PDF_MAGIC.every((b, i) => ersteBytes[i] === b);
}

/**
 * PDF-Erkennung am Import: Endung zuerst (`.pdf`), `%PDF`-Magic-Bytes als
 * Fallback bei falscher/fehlender Endung (z.B. ein PDF, das versehentlich
 * als `.dxf` verschickt wurde — DXF-Parser-Kauderwelsch statt eines
 * ehrlichen Hinweises wäre schlimmer als der zusätzliche Bytes-Check).
 */
export function erkennePdf(dateiname: string, ersteBytes: Uint8Array): boolean {
  if (istPdfDateiname(dateiname)) return true;
  return beginntMitPdfMagic(ersteBytes);
}

// ── Betriebsarten-Gate ────────────────────────────────────────────────────

export type PdfPfadModus = 'vision-anfrage' | 'hinweis';

export interface PdfPfadEntscheid {
  modus: PdfPfadModus;
  text: string;
}

const DXF_WEG =
  'Konkreter Weg: DXF beim Unternehmer anfordern (R12/AC1009 wird von KosmoOrbit gelesen) — der Import-Bericht danach zeigt Match-Quote, unklassierte Layer und offene Punkte.';

const VISION_LUECKE =
  'PDF-Analyse braucht Vision-Unterstützung des Providers — noch nicht angeschlossen.';

/**
 * Der ehrliche Entscheidbaum:
 *
 * - **Cloud + konfigurierter Anthropic-Zugang**: architektonisch der einzige
 *   Fall, in dem eine Vision-Anfrage überhaupt zulässig wäre (`modus:
 *   'vision-anfrage'`) — aber der heutige Anthropic-Anschluss in
 *   `packages/kosmo-ai` kann keine Bild-/Dokument-Inputs senden
 *   (`anthropicUnterstuetztPdfVision() === false`, s. Dateikopf). Statt die
 *   Anfrage nur zur Hälfte zu bauen oder einen Befund zu erfinden, ist der
 *   Text auch hier die ehrliche Lücken-Meldung + derselbe DXF-Weg.
 * - **Alles andere** (Standard/Remote — lokales LLM ohne Bild-Fähigkeit;
 *   Cloud ohne Schlüssel/Abo-Token): `modus: 'hinweis'` — was das PDF ist,
 *   warum ohne Cloud-KI keine automatische Analyse möglich ist, und der
 *   DXF-Weg.
 */
export function pdfImportPfad(
  lage: BetriebsLage,
  visionUnterstuetzt: boolean = anthropicUnterstuetztPdfVision(),
): PdfPfadEntscheid {
  if (cloudProviderKonfiguriert(lage)) {
    if (visionUnterstuetzt) {
      // Noch nicht erreichbar (s. Dateikopf) — Platzhalter für den Tag, an
      // dem `AnthropicProvider` Dokument-Blöcke senden kann.
      return {
        modus: 'vision-anfrage',
        text:
          'Cloud-KI aktiv: Kosmo sendet die PDF-Seite(n) an Claude und übersetzt die Antwort in ' +
          'Hinweiskarten (Stufe 2 — nur Markierung, nie automatisch anwendbar, weil Vision keine ' +
          'verlässliche Geometrie liefert).',
      };
    }
    return {
      modus: 'vision-anfrage',
      text: `${VISION_LUECKE} Bis der Anschluss steht, gilt derselbe Weg wie ohne Cloud-KI: ${DXF_WEG}`,
    };
  }
  return {
    modus: 'hinweis',
    text:
      'Dies ist ein PDF-Plan des Unternehmers. PDF trägt in aller Regel keine verlässliche ' +
      'Vektor-Geometrie wie DXF — ohne Cloud-KI (aktive Betriebsart Standard/Remote, oder Cloud ' +
      `ohne konfigurierten Anthropic-Zugang) ist keine automatische Analyse möglich. ${DXF_WEG}`,
  };
}

/**
 * Vision-Fähigkeit des heutigen Anthropic-Anschlusses — siehe Dateikopf.
 * Bewusst eine Funktion statt einer eingebrannten Konstante: testbar, und
 * der Tag, an dem `ChatMessage`/`AnthropicProvider` Dokument-Blöcke lernen,
 * ändert genau diese eine Stelle.
 */
export function anthropicUnterstuetztPdfVision(): boolean {
  return false;
}

// ── Hypothesen-Karten (für den Tag, an dem die Vision-Anfrage steht) ──────

/** Eine einzelne Vision-Hypothese, wie sie ein Prompt der Form «Nenne
 * Abweichungen zum Plan… als Liste Bauteil/Befund/Konfidenz» liefern würde. */
export interface PdfVisionHypothese {
  bauteil: string;
  befund: string;
  /** 0..1 — Modell-Selbsteinschätzung, KEINE geometrische Konfidenz. */
  konfidenz: number;
}

/** Eine PDF-Hypothesen-Karte — bewusst ein eigener, schlankerer Typ als
 * `UnternehmerKarte` (`unternehmerplan.ts`): dessen `befund` ist ein
 * geometrischer `AbgleichBefund` aus dem Kernel-Abgleich, den es für eine
 * Vision-Antwort nie gibt. `stufe` ist literal `2` — es gibt für diesen Weg
 * keinen anderen Wert, s. `baueHypothesenKarten`. */
export interface PdfHypothesenKarte {
  id: string;
  stufe: 2;
  titel: string;
  detail: string;
}

/**
 * Übersetzt Vision-Hypothesen in Karten — GRUNDSATZ (wie `istStufe1` in
 * `unternehmerplan.ts`, hier aber ohne Ausnahme): IMMER Stufe 2. Eine
 * Vision-Antwort beschreibt Bild-Eindrücke, keine vermessene Geometrie —
 * damit ist sie nie ein Command-Kandidat, unabhängig von der gemeldeten
 * Konfidenz. Reine Funktion, keine Store-/Netz-Abhängigkeit; wird heute
 * nirgends mit echten Daten aufgerufen (s. Lücke oben), bereitet aber den
 * Anschluss vor, ohne selbst etwas vorzutäuschen.
 */
export function baueHypothesenKarten(hypothesen: PdfVisionHypothese[]): PdfHypothesenKarte[] {
  return hypothesen.map((h, index) => ({
    id: `pdf-${index + 1}`,
    stufe: 2,
    titel: `${h.bauteil}: ${h.befund}`,
    detail: `Vision-Hinweis (Konfidenz ${Math.round(h.konfidenz * 100)} %) — Bild-Eindruck, keine vermessene Geometrie; Architekt prüft und entscheidet, wie bei jeder Stufe-2-Karte.`,
  }));
}
