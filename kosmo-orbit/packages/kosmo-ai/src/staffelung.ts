/**
 * v0.8.1 / KI4 («Rollen→Modell-Staffelung», `docs/V081-SPEZ.md` §3+§7 Kandidat 1,
 * `docs/KI-MODELL-GUIDELINE.md` Teil C) — die dokumentierte Kosmo-Meister/
 * Kosmo-Leiter/Kosmo-Zeichner-Staffelung als ECHTE, testbare Abstraktion.
 *
 * Bisher (`betriebKonfig()`, `betrieb.ts:155-184`) wählt der Betrieb EIN
 * Provider+Modell für die ganze Sitzung; Cloud ist dabei fix mindestens Opus
 * (`mindestensOpus`, `betrieb.ts:149-152`). Dieses Modul legt eine ADDITIVE
 * Schicht DARÜBER: eine reine Funktion Aufgabenklasse → Rolle → konkretes
 * Modell (lokal: Ollama-Modellname; Cloud: Anthropic-Modell-ID). Nichts an
 * `betriebKonfig()`/`mindestensOpus()` ändert sich — sie werden hier nur
 * WIEDERVERWENDET (Cloud-Meister/-Leiter bleiben über `mindestensOpus`
 * mindestens-Opus-gesichert, exakt dieselbe Garantie wie heute).
 *
 * **Die drei Rollen** (Guideline Teil C, `KI-MODELL-GUIDELINE.md:76-95`):
 * - **Kosmo-Meister** — Stratege (Fable-Analogon): härteste ~10-15 %,
 *   Entwurfsurteil/Architektur-Konflikt. Grösstes lokales Modell; Cloud
 *   bleibt mindestens Opus (kein eigener «Fable»-Cloud-Tier im Repo
 *   konfiguriert — ehrlich als Opus-Boden benannt, s. unten).
 * - **Kosmo-Leiter** — Orchestrator (Opus-Analogon): führt die Command-
 *   Schleife, plant/verteilt mehrschrittige Züge, zuverlässiges Tool-Calling.
 *   Mittleres lokales Modell; Cloud-Boden bleibt Opus 4.8 (Guideline Teil B,
 *   `KI-MODELL-GUIDELINE.md:63-64`: «Cloud-Boden bleibt Opus 4.8 — das ist
 *   die Orchestrator-Stufe»).
 * - **Kosmo-Zeichner** — Ausführer (Sonnet-Analogon): das Arbeitspferd,
 *   Routine-Commands/Lesevorgänge/mechanische Aufgaben, schnell. Schlankstes
 *   lokales Modell; Cloud darf günstiger als Opus sein (Sonnet-Tier).
 *
 * **Deklarierte HomeStation-Grenze (Owner-Entscheid 6, keine Attrappe):**
 * echte Multi-Modell-Verifikation — mehrere reale lokale Modelle GLEICHZEITIG
 * geladen und im Ollama-Betrieb gegeneinander gemessen (Speicherbedarf,
 * Ladezeiten, tatsächliche Tool-Calling-Güte je Grösse) — braucht die
 * RTX-5090-HomeStation und ist NICHT container-baubar. Was hier (container-
 * testbar, reine Funktionen + `MockProvider`) real gebaut ist: die
 * Auswahl-Abstraktion selbst — welche Rolle bekommt welches Modell/welchen
 * Provider, inklusive Aufgabenklassen-Mapping und Ein-GPU-Fallback. Diese
 * Datei ruft nie `fetch`/Ollama/Anthropic auf; sie liefert nur Konfigurations-
 * Werte, die `OllamaConfig`/`AnthropicConfig` (`provider.ts`/`anthropic.ts`,
 * KI3-Vertrag, hier unverändert) am Ende konsumieren.
 *
 * **App-Anbindung (noch offen, bewusst NICHT hier gebaut):** `KosmoPanel`
 * (App-Schicht, `apps/kosmo-orbit`) wählt heute weiterhin EIN Provider+Modell
 * für die ganze Sitzung und kennt diese Datei nicht — die Verdrahtung
 * «welche Aufgabenklasse feuert wann» (z.B. `ChatSession.turn()` müsste pro
 * Zug die Rolle bestimmen und `this.provider` wechseln) ist ein SPÄTERES
 * Paket, hier nur benannt, nicht angefasst (Scope-Grenze dieses Auftrags).
 */

import { CLOUD_MODELL_MIN, mindestensOpus } from './betrieb';
import type { OllamaConfig } from './provider';
import type { AnthropicConfig } from './anthropic';

/** Die drei Betriebsrollen der lokalen/Cloud-Staffelung. */
export type KosmoRolle = 'meister' | 'leiter' | 'zeichner';

export const KOSMO_ROLLEN: readonly KosmoRolle[] = ['meister', 'leiter', 'zeichner'];

/** Ein Modellname je Rolle — einmal für lokal (Ollama), einmal für Cloud (Anthropic). */
export interface RollenModelle {
  meister: string;
  leiter: string;
  zeichner: string;
}

export interface RollenModellKarte {
  /** Ollama-Modellnamen (lokal, HomeStation/RTX-5090-Vorschlag der Guideline). */
  lokal: RollenModelle;
  /** Anthropic-Modell-IDs (Cloud). */
  cloud: RollenModelle;
}

/**
 * Vorschlags-Karte aus der Guideline (`KI-MODELL-GUIDELINE.md:76-80`, Tabelle
 * Kosmo-Stufe→Vorschlagsmodell). Lokal: drei unterschiedlich grosse Ollama-
 * Modelle wie in der Guideline vorgeschlagen. Cloud: Meister UND Leiter
 * bleiben auf dem Opus-Boden (Guideline Teil B — im Repo existiert keine
 * eigene «Fable»-Cloud-Modell-Konstante, `CLOUD_MODELL_MIN` ist der einzige
 * dokumentierte Cloud-Floor; ehrlicher als einen erfundenen dritten Cloud-
 * Tier vorzutäuschen). Zeichner darf günstiger sein (Sonnet-Tier), da die
 * Guideline für den Ausführer explizit KEINEN Opus-Zwang verlangt.
 */
export const STANDARD_ROLLEN_MODELL_KARTE: RollenModellKarte = {
  lokal: {
    meister: 'qwen3:72b',
    leiter: 'qwen3:30b',
    zeichner: 'qwen3-coder:30b',
  },
  cloud: {
    meister: CLOUD_MODELL_MIN,
    leiter: CLOUD_MODELL_MIN,
    zeichner: 'claude-sonnet-5',
  },
};

/**
 * Aufgabenklassen — aus dem BESTEHENDEN `kosmo-ai`-Code abgeleitet (nicht
 * erfunden), je mit Fundstelle + Begründung, orientiert an der Guideline
 * («welches Modell für welche Aufgabe»):
 *
 * - `werkzeug-schreibend` — ein Command-Vorschlag, der das Doc ändern würde
 *   (`ChatSession.turn()`, `chat.ts:175-191`, `schreibend`-Array → Diff-Karte
 *   vor Freigabe). Meister-würdig: eine falsche/unpassende Vorschlagskarte
 *   kostet den Architekten Vertrauen und Zeit beim Prüfen — genau die
 *   «härteste Sorgfalt», die die Guideline dem Stratege zuweist.
 * - `strategie-urteil` — eine echte Entwurfs-/Architekturfrage ohne
 *   Routine-Antwort (Persona `kosmo`, `personas.ts:16`: «Entwurfsentscheide
 *   bleiben beim Menschen» — Kosmo liefert hier die schwierigste Einschätzung
 *   dazu). Direkt die Guideline-Definition des Strategen/Meisters.
 * - `orchestrierung` — mehrere Commands im selben Zug zu einem Aktionspaket
 *   gebündelt (`chat.ts:183-191`, `paketId`/`paket`-Feld) oder ein
 *   mehrschrittiger Plan über `modell_lesen` hinweg. Genau die Definition
 *   des Orchestrators («führt die Command-Schleife, plant, verteilt,
 *   prüft», Guideline Teil C) → Leiter.
 * - `chat-standard` — ein gewöhnlicher Gesprächszug ohne Tool-Aufrufe
 *   (`ChatSession.turn()`, `chat.ts:111-136`, reiner Text-Antwortpfad).
 *   Standard-Führung ohne Spitzenmodell-Bedarf → Leiter.
 * - `werkzeug-lesend` — read-only Tools, die SOFORT ohne Freigabe laufen:
 *   `modell_lesen` (`tools.ts:130-199`), `quellen_suchen`/`referenzen_suchen`/
 *   `ui_zustandLesen` (`ReadTool`, `chat.ts:152-163`). Reine Routine-Abfrage,
 *   kein Urteil nötig → Zeichner («das Arbeitspferd», schnell).
 * - `zusammenfassung` — eine Command-Zusammenfassung für die Diff-Karte
 *   (`cmd.summarize(...)`, `tools.ts:264`) oder ein Text-Kurzbericht.
 *   Mechanisch, klar spezifiziert → Zeichner.
 * - `journal` — Lernjournal-Buchhaltung: Einträge hinzufügen/kuratieren
 *   (`memory.ts:70-96`), den Prompt-Block bauen (`memory.ts:98-113`) oder
 *   den JSONL-Export vorbereiten (`memory.ts:116-118`). Bewusst mechanisch
 *   und ohne Entwurfsurteil → Zeichner.
 */
export type Aufgabenklasse =
  | 'werkzeug-schreibend'
  | 'strategie-urteil'
  | 'orchestrierung'
  | 'chat-standard'
  | 'werkzeug-lesend'
  | 'zusammenfassung'
  | 'journal';

const AUFGABENKLASSE_ROLLE: Record<Aufgabenklasse, KosmoRolle> = {
  'werkzeug-schreibend': 'meister',
  'strategie-urteil': 'meister',
  orchestrierung: 'leiter',
  'chat-standard': 'leiter',
  'werkzeug-lesend': 'zeichner',
  zusammenfassung: 'zeichner',
  journal: 'zeichner',
};

/** Reine Abbildung Aufgabenklasse → Rolle (s. Begründungen oben je Klasse). */
export function rolleFuerAufgabe(klasse: Aufgabenklasse): KosmoRolle {
  return AUFGABENKLASSE_ROLLE[klasse];
}

/**
 * Konfiguration für die Modellwahl. Additiv gegenüber `BetriebKonfig`
 * (`betrieb.ts`) — dieselbe `provider`-Unterscheidung, plus die neue,
 * OPTIONALE Rollen-Schicht:
 *
 * - `karte` fehlt ganz → `STANDARD_ROLLEN_MODELL_KARTE` (Guideline-Vorschlag).
 * - `karte` teilweise gesetzt → nur die genannten Rollen/Zweige werden
 *   überschrieben, der Rest bleibt Standard (kein Alles-oder-nichts).
 * - `einzelModell` gesetzt → **ehrlicher Fallback für die bisherige
 *   Ein-Modell-Welt**: kennt der Aufrufer (heute: `KosmoPanel`/Setup-
 *   Assistent) nur EIN konfiguriertes Modell — genau der heutige Stand vor
 *   KI4 —, spielen ALLE DREI Rollen dieses eine Modell. Keine erfundene
 *   Differenzierung, wo keine echte Auswahl vorhanden ist. Cloud-Meister/
 *   -Leiter bleiben dabei trotzdem mindestens-Opus-gesichert (`mindestensOpus`
 *   greift auch hier — ein leerer/whitespace `einzelModell`-String fällt für
 *   diese beiden Rollen auf Opus zurück, eine explizite Wahl bleibt
 *   unangetastet, exakt das F1-Verhalten aus `betrieb.ts:137-152`).
 */
export interface StaffelungKonfig {
  provider: 'ollama' | 'anthropic';
  karte?: {
    lokal?: Partial<RollenModelle>;
    cloud?: Partial<RollenModelle>;
  };
  einzelModell?: string;
  /**
   * Ein-GPU-Fall (Guideline `KI-MODELL-GUIDELINE.md:85-87`, wörtlich: «Wo nur
   * ein Modell in den Speicher passt, dürfen Leiter und Zeichner dasselbe
   * Modell in verschiedenen Rollen sein; der Meister wird bei Bedarf
   * nachgeladen»). Anders als `einzelModell` bleibt der MEISTER hier
   * EIGENSTÄNDIG (Standard-Karte oder `karte.lokal.meister`) — nur Leiter
   * und Zeichner teilen sich `lokalEinGpuModell`. Nur für `provider:
   * 'ollama'` relevant (Cloud kennt kein Speicher-Limit); wird bei
   * `provider: 'anthropic'` ignoriert. `einzelModell` (falls beide gesetzt
   * sind) hat Vorrang — es ist der umfassendere Fallback.
   */
  lokalEinGpuModell?: string;
}

function istGesetzt(s: string | undefined): s is string {
  return typeof s === 'string' && s.trim() !== '';
}

/**
 * Rolle → konkretes Modell. Reine Funktion, kein Netz/Seiteneffekt — voll
 * containertestbar. Reihenfolge der Fallback-Prüfung (am spezifischsten
 * zuerst): `einzelModell` (alle Rollen) → `lokalEinGpuModell` (nur
 * Leiter/Zeichner, nur lokal) → `karte`-Überschreibung → Standard-Karte.
 * Cloud-Meister/-Leiter laufen am Ende immer durch `mindestensOpus` — die
 * bestehende Owner-Garantie (`betrieb.ts:149-152`) gilt hier unverändert.
 */
export function waehleModellFuerRolle(rolle: KosmoRolle, konfig: StaffelungKonfig): string {
  const cloud = konfig.provider === 'anthropic';
  const zweig = cloud ? 'cloud' : 'lokal';

  let roh: string;
  if (istGesetzt(konfig.einzelModell)) {
    roh = konfig.einzelModell;
  } else if (!cloud && (rolle === 'leiter' || rolle === 'zeichner') && istGesetzt(konfig.lokalEinGpuModell)) {
    roh = konfig.lokalEinGpuModell;
  } else {
    const basis = STANDARD_ROLLEN_MODELL_KARTE[zweig][rolle];
    const ueberschrieben = konfig.karte?.[zweig]?.[rolle];
    roh = istGesetzt(ueberschrieben) ? ueberschrieben : basis;
  }

  if (cloud && (rolle === 'meister' || rolle === 'leiter')) {
    return mindestensOpus(roh);
  }
  return roh;
}

/** Bequemlichkeits-Wrapper: Aufgabenklasse direkt zum konkreten Modell. */
export function waehleModellFuerAufgabe(klasse: Aufgabenklasse, konfig: StaffelungKonfig): string {
  return waehleModellFuerRolle(rolleFuerAufgabe(klasse), konfig);
}

/**
 * Alle drei Rollen auf einmal aufgelöst (z.B. für eine Übersichts-Anzeige im
 * Setup-Assistenten: «Meister X, Leiter Y, Zeichner Z», Ein-GPU-Fall ehrlich
 * sichtbar, wenn zwei Rollen auf demselben Modellnamen landen).
 */
export function loeseRollenModelle(konfig: StaffelungKonfig): RollenModelle {
  return {
    meister: waehleModellFuerRolle('meister', konfig),
    leiter: waehleModellFuerRolle('leiter', konfig),
    zeichner: waehleModellFuerRolle('zeichner', konfig),
  };
}

/**
 * `true`, wenn zwei oder mehr Rollen aktuell dasselbe Modell spielen (Ein-
 * Modell- oder Ein-GPU-Fall) — reine Ableitung aus `loeseRollenModelle()`,
 * für einen ehrlichen UI-Hinweis («Leiter und Zeichner laufen aktuell auf
 * demselben Modell») statt stillschweigender Gleichheit.
 */
export function staffelungIstZusammengefasst(konfig: StaffelungKonfig): boolean {
  const { meister, leiter, zeichner } = loeseRollenModelle(konfig);
  return meister === leiter || leiter === zeichner || meister === zeichner;
}

/**
 * Baut eine vollständige `OllamaConfig` für eine Rolle — reines Zusammensetzen
 * von Werten, ruft `fetch`/Ollama NIE auf (das bleibt exklusiv `provider.ts`,
 * KI3-Vertrag, hier unverändert). `basis` trägt die restlichen Felder
 * (`baseUrl`, optional Timeouts/Temperatur) unverändert durch.
 */
export function ollamaConfigFuerRolle(
  rolle: KosmoRolle,
  basis: Omit<OllamaConfig, 'model'>,
  konfig: Omit<StaffelungKonfig, 'provider'> = {},
): OllamaConfig {
  return { ...basis, model: waehleModellFuerRolle(rolle, { ...konfig, provider: 'ollama' }) };
}

/**
 * Baut eine vollständige `AnthropicConfig` für eine Rolle — analog
 * `ollamaConfigFuerRolle`, garantiert für Meister/Leiter zusätzlich den
 * Opus-Boden über `waehleModellFuerRolle`/`mindestensOpus`.
 */
export function anthropicConfigFuerRolle(
  rolle: KosmoRolle,
  basis: Omit<AnthropicConfig, 'model'>,
  konfig: Omit<StaffelungKonfig, 'provider'> = {},
): AnthropicConfig {
  return { ...basis, model: waehleModellFuerRolle(rolle, { ...konfig, provider: 'anthropic' }) };
}
