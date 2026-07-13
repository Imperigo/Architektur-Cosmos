/**
 * Leistungs-Autotuning (v0.6.3 / Batch A9, Owner-Befund K19, wörtlich:
 * «beim Start Freigabe ‹Kosmo darf Systemleistung prüfen› → Bericht, Kosmo
 * drosselt selbst … Render-Qualität …»). Der Rest des K19-Blocks (Cycles-
 * Preview-Synchro, Host-PC-Client, lokale LLM-Wahl) ist HomeStation/🔒 und
 * NICHT Teil dieses Moduls — siehe `docs/HOMESTATION-AUFTRAG.md`.
 *
 * **Ehrlichkeit vor Politur**: es wird NUR gesammelt, was der Browser wirklich
 * hergibt. Kein erfundener GPU-Benchmark, keine synthetische FPS-Zahl. Wo eine
 * API fehlt (`deviceMemory` z.B. in Firefox/Safari, `WEBGL_debug_renderer_info`
 * hinter einem Flag), sagt das Ergebnis das offen («nicht verfügbar»), statt
 * einen Wert vorzutäuschen.
 *
 * **Freigabe zuerst**: `erhebeSystemMessung()`/der Canvas-Mikro-Benchmark laufen
 * NIE von selbst — nur `pruefeLeistungMitFreigabe()` löst sie aus, und die
 * bricht ohne gespeicherte Zustimmung sofort ab (kein Seiteneffekt, keine
 * Browser-API wird angefasst). Die Zustimmung setzt einzig `setZustimmung(true)`,
 * ausgelöst durch den Knopf im Einstellungen-Panel (Sektion «Leistung»).
 *
 * **Laufzeit ≠ Modell**: wie die Oberflächen-Anpassung (`oberflaeche-adaption-
 * kern.ts`, gleiches Muster) lebt das Ergebnis in `localStorage`
 * (`kosmo.leistung.v1`), geht NIE ins Doc/Yjs/Undo, berührt keine Goldens.
 *
 * **Reales Andocken**: `Viewport3D.tsx` bindet die effektive Stufe an zwei
 * echte three.js-Qualitäts-Schrauben — `renderer.setPixelRatio` (Deckel über
 * `pixelRatioFuerStufe`) und `renderer.shadowMap.enabled` (`schattenAnFuerStufe`)
 * — über denselben Revisions-Zähler-Mechanismus, den die Datei schon für
 * Texturen/Kontext/Splats verwendet (`texturRevision` u.a.), damit ein
 * Override sofort wirkt, ohne den Viewport neu zu mounten.
 */

// ---------------------------------------------------------------------------
// Messung (impure — echte Browser-APIs, nur nach Freigabe aufgerufen)
// ---------------------------------------------------------------------------

export type RendererQuelle = 'webgl-debug-info' | 'nicht-verfuegbar';

export interface LeistungsMessung {
  /** `navigator.hardwareConcurrency` — Anzahl logischer Kerne. `null` = nicht verfügbar. */
  kerne: number | null;
  /** `navigator.deviceMemory` in GB (Chromium-only, oft `undefined`). `null` = nicht verfügbar. */
  speicherGb: number | null;
  /** Roh-Renderer-String (WEBGL_debug_renderer_info), ehrlich benannt, wenn maskiert/fehlend. */
  rendererString: string;
  rendererQuelle: RendererQuelle;
  /** `window.devicePixelRatio` zum Messzeitpunkt. */
  devicePixelRatio: number;
  /** Canvas-Mikro-Benchmark: Iterationen pro Millisekunde (~100ms Budget). `null` = nicht messbar (kein Canvas-Kontext). */
  benchmarkPunkte: number | null;
}

/** Liest den WebGL-Renderer-String aus, sofern der Browser die Debug-Erweiterung
 *  freigibt. Viele Browser maskieren das absichtlich (Fingerprinting-Schutz) —
 *  das wird dann ehrlich als «nicht verfügbar» geführt, nicht als Fehler. */
function leseRendererString(): { rendererString: string; rendererQuelle: RendererQuelle } {
  if (typeof document === 'undefined') {
    return { rendererString: 'nicht verfügbar (keine DOM-Umgebung)', rendererQuelle: 'nicht-verfuegbar' };
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      return { rendererString: 'nicht verfügbar (kein WebGL-Kontext)', rendererQuelle: 'nicht-verfuegbar' };
    }
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return {
        rendererString: 'nicht verfügbar (WEBGL_debug_renderer_info vom Browser nicht freigegeben)',
        rendererQuelle: 'nicht-verfuegbar',
      };
    }
    const roh = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as unknown;
    const wert = typeof roh === 'string' ? roh.trim() : '';
    if (!wert) {
      return { rendererString: 'nicht verfügbar (leerer Renderer-String)', rendererQuelle: 'nicht-verfuegbar' };
    }
    return { rendererString: wert, rendererQuelle: 'webgl-debug-info' };
  } catch {
    return { rendererString: 'nicht verfügbar (Fehler beim Auslesen)', rendererQuelle: 'nicht-verfuegbar' };
  }
}

/** Budget des Canvas-Timing-Mikro-Benchmarks (ms) — kurz genug, um die Freigabe-
 *  Aktion nicht spürbar zu blockieren, lang genug für ein stabiles Signal. */
export const BENCHMARK_BUDGET_MS = 100;

/**
 * Kurzer, deterministisch AUSGEWERTETER (nicht deterministisch schneller/
 * langsamer — das hängt von der echten Hardware ab) Canvas-Mikro-Benchmark:
 * zählt, wie oft ein kleines Rechteck gefüllt UND zurückgelesen wird
 * (`getImageData` erzwingt echtes Rastern statt eines wegoptimierten No-Op)
 * innerhalb von `BENCHMARK_BUDGET_MS`. Ergebnis: Iterationen pro Millisekunde
 * — ein roher Messwert, dessen ÜBERSETZUNG in eine Stufe (`leistungsStufeAus`)
 * über feste, dokumentierte Schwellen läuft.
 */
export function fuehreCanvasMikroBenchmarkAus(budgetMs: number = BENCHMARK_BUDGET_MS): number | null {
  if (typeof document === 'undefined' || typeof performance === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const start = performance.now();
    let iterationen = 0;
    while (performance.now() - start < budgetMs) {
      ctx.fillStyle = iterationen % 2 === 0 ? '#a84b2b' : '#2a2620';
      ctx.fillRect(0, 0, 64, 64);
      ctx.getImageData(0, 0, 1, 1);
      iterationen++;
    }
    const dauerMs = performance.now() - start;
    if (dauerMs <= 0) return null;
    return iterationen / dauerMs;
  } catch {
    return null;
  }
}

/** Sammelt NUR ehrlich Verfügbares — keine erfundenen Werte, keine Annahmen
 *  wo eine API fehlt. Wird ausschliesslich von `pruefeLeistungMitFreigabe()`
 *  aufgerufen (Freigabe-Gate). */
export function erhebeSystemMessung(): LeistungsMessung {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const kerne = typeof nav?.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null;
  const speicherRoh = (nav as (Navigator & { deviceMemory?: unknown }) | undefined)?.deviceMemory;
  const speicherGb = typeof speicherRoh === 'number' ? speicherRoh : null;
  const { rendererString, rendererQuelle } = leseRendererString();
  const devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
  const benchmarkPunkte = fuehreCanvasMikroBenchmarkAus();
  return { kerne, speicherGb, rendererString, rendererQuelle, devicePixelRatio, benchmarkPunkte };
}

// ---------------------------------------------------------------------------
// Ableitung: Messung → Stufe (rein, testbar — dokumentierte Schwellen)
// ---------------------------------------------------------------------------

export type LeistungsStufe = 'hoch' | 'mittel' | 'niedrig';

/** Nur die drei numerischen Signale, aus denen `leistungsStufeAus` ableitet —
 *  von `LeistungsMessung` getrennt, damit die Ableitung ohne Browser-Mocks
 *  getestet werden kann. */
export interface LeistungsMerkmale {
  kerne: number | null;
  speicherGb: number | null;
  benchmarkPunkte: number | null;
}

export function merkmaleAusMessung(m: LeistungsMessung): LeistungsMerkmale {
  return { kerne: m.kerne, speicherGb: m.speicherGb, benchmarkPunkte: m.benchmarkPunkte };
}

/** Schwellen (Units in Kommentar) — bewusst grosszügig gewählt (Alltags-
 *  Laptops/Tablets sollen nicht pauschal auf «niedrig» fallen), aber konservativ
 *  AUSGEWERTET (siehe `leistungsStufeAus`: fehlt eine Zahl, zählt sie nicht mit;
 *  im Zweifelsfall wird ABGERUNDET statt aufgerundet). */
const KERNE_SCHWELLE_NIEDRIG = 2; // logische Kerne
const KERNE_SCHWELLE_HOCH = 8; // logische Kerne
const SPEICHER_SCHWELLE_NIEDRIG_GB = 4; // GB (navigator.deviceMemory)
const SPEICHER_SCHWELLE_HOCH_GB = 8; // GB
const BENCHMARK_SCHWELLE_NIEDRIG = 12; // Iterationen/ms
const BENCHMARK_SCHWELLE_HOCH = 40; // Iterationen/ms

function teilstufeVonZahl(wert: number | null, schwelleNiedrig: number, schwelleHoch: number): LeistungsStufe | null {
  if (wert === null) return null;
  if (wert <= schwelleNiedrig) return 'niedrig';
  if (wert >= schwelleHoch) return 'hoch';
  return 'mittel';
}

const STUFE_RANG: Record<LeistungsStufe, number> = { niedrig: 0, mittel: 1, hoch: 2 };
const RANG_STUFE: readonly LeistungsStufe[] = ['niedrig', 'mittel', 'hoch'];

/**
 * Reine Ableitung Messwerte → Stufe. Jede der drei Zahlen (Kerne/Speicher/
 * Benchmark) liefert — falls vorhanden — eine Teilstufe über feste Schwellen;
 * das Gesamtergebnis ist der GERUNDETE Mittelwert der vorhandenen Teilstufen,
 * bei Gleichstand nach UNTEN gerundet (konservativ: im Zweifel drosseln statt
 * zu optimistisch rendern). Ist NICHTS messbar (alle drei `null`), ist «mittel»
 * die ehrliche Neutralannahme — weder Bevorzugung noch Bestrafung ohne Signal.
 */
export function leistungsStufeAus(merkmale: LeistungsMerkmale): LeistungsStufe {
  const teilstufen = [
    teilstufeVonZahl(merkmale.kerne, KERNE_SCHWELLE_NIEDRIG, KERNE_SCHWELLE_HOCH),
    teilstufeVonZahl(merkmale.speicherGb, SPEICHER_SCHWELLE_NIEDRIG_GB, SPEICHER_SCHWELLE_HOCH_GB),
    teilstufeVonZahl(merkmale.benchmarkPunkte, BENCHMARK_SCHWELLE_NIEDRIG, BENCHMARK_SCHWELLE_HOCH),
  ].filter((s): s is LeistungsStufe => s !== null);
  if (teilstufen.length === 0) return 'mittel';
  const summe = teilstufen.reduce((acc, s) => acc + STUFE_RANG[s], 0);
  const mittelwert = summe / teilstufen.length;
  const indexGerundet = Math.floor(mittelwert + 1e-9);
  return RANG_STUFE[Math.min(indexGerundet, 2)]!;
}

// ---------------------------------------------------------------------------
// Drosselung: Stufe → echte Viewport-Qualitäts-Schrauben (rein, testbar)
// ---------------------------------------------------------------------------

/** Deckel für `renderer.setPixelRatio` je Stufe (Viewport3D bindet das direkt
 *  an — niedrig kappt hart auf 1, hoch lässt bis zu 2 zu wie der bisherige
 *  Fixwert). `geraetePixelRatio` ist `window.devicePixelRatio`. */
export function pixelRatioFuerStufe(stufe: LeistungsStufe, geraetePixelRatio: number): number {
  const deckel = stufe === 'niedrig' ? 1 : stufe === 'mittel' ? 1.5 : 2;
  return Math.min(geraetePixelRatio, deckel);
}

/** Schatten (`renderer.shadowMap.enabled`) — die zweite reale Schraube: nur
 *  bei «niedrig» ganz aus, sonst an (wie bisheriges Verhalten). */
export function schattenAnFuerStufe(stufe: LeistungsStufe): boolean {
  return stufe !== 'niedrig';
}

// ---------------------------------------------------------------------------
// Laufzeit-Speicher (localStorage, kosmo.leistung.v1) — Muster identisch zu
// oberflaeche-adaption-kern.ts: defensiver Lese-Weg, kaputtes JSON → Basis.
// ---------------------------------------------------------------------------

export type LeistungsOverride = 'auto' | LeistungsStufe;

export interface LeistungsErgebnis {
  messung: LeistungsMessung;
  stufe: LeistungsStufe;
  gemessenAm: number;
}

interface LeistungsSpeicher {
  version: 1;
  /** Explizite Zustimmung «Kosmo darf die Systemleistung prüfen» — Default AUS. */
  zustimmungErteilt: boolean;
  /** Manueller Override im Einstellungs-Panel; 'auto' folgt der letzten Messung. */
  override: LeistungsOverride;
  letztesErgebnis?: LeistungsErgebnis;
  /**
   * V-M1 Commit 2 (v0.6.6 W2): Renderloop on-demand statt Dauerschleife —
   * Viewport3D rendert nur noch bei Kamerabewegung/Doc-Änderung/laufender
   * Geste/explizitem `invalidate()`, sonst Leerlauf. Default AN für echte
   * Nutzer:innen (`basiszustand()` unten) — spürbarer Akku-/CPU-Gewinn ohne
   * Bildverlust. Optional (`?`), damit ein VOR dieser Änderung gespeicherter
   * Datensatz (kein Feld) weiterhin gültig bleibt; die Auslese-Funktion
   * `istRenderBeiBedarfAn()` behandelt ein fehlendes Feld als `true`
   * (identisch zum neuen Default), NIE als stille Rückstufung.
   */
  renderBeiBedarf?: boolean;
}

const STORAGE_KEY = 'kosmo.leistung.v1';

function basiszustand(): LeistungsSpeicher {
  return { version: 1, zustimmungErteilt: false, override: 'auto', renderBeiBedarf: true };
}

/**
 * Minimaler In-Memory-Ersatz, falls die Laufzeit kein `localStorage` kennt
 * (z.B. Vitest ohne jsdom) — 1:1 dasselbe Muster wie
 * `oberflaeche-adaption-kern.ts`. Echte Browser-/Electron-Umgebungen bringen
 * ihr eigenes `localStorage` mit; dieser Ersatz füllt nur die Lücke.
 */
function installiereStorageStubFallsFehlt(): void {
  const global_ = globalThis as { localStorage?: Storage };
  if (typeof global_.localStorage !== 'undefined') return;
  const speicher = new Map<string, string>();
  const stub: Storage = {
    get length() {
      return speicher.size;
    },
    clear() {
      speicher.clear();
    },
    getItem(key: string) {
      return speicher.has(key) ? speicher.get(key)! : null;
    },
    key(index: number) {
      return [...speicher.keys()][index] ?? null;
    },
    removeItem(key: string) {
      speicher.delete(key);
    },
    setItem(key: string, value: string) {
      speicher.set(key, String(value));
    },
  };
  global_.localStorage = stub;
}
installiereStorageStubFallsFehlt();

function holeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function istGueltigeMessung(wert: unknown): wert is LeistungsMessung {
  if (typeof wert !== 'object' || wert === null) return false;
  const w = wert as Record<string, unknown>;
  if (typeof w['kerne'] !== 'number' && w['kerne'] !== null) return false;
  if (typeof w['speicherGb'] !== 'number' && w['speicherGb'] !== null) return false;
  if (typeof w['rendererString'] !== 'string') return false;
  if (w['rendererQuelle'] !== 'webgl-debug-info' && w['rendererQuelle'] !== 'nicht-verfuegbar') return false;
  if (typeof w['devicePixelRatio'] !== 'number') return false;
  if (typeof w['benchmarkPunkte'] !== 'number' && w['benchmarkPunkte'] !== null) return false;
  return true;
}

function istGueltigesErgebnis(wert: unknown): wert is LeistungsErgebnis {
  if (typeof wert !== 'object' || wert === null) return false;
  const w = wert as Record<string, unknown>;
  if (!istGueltigeMessung(w['messung'])) return false;
  if (w['stufe'] !== 'hoch' && w['stufe'] !== 'mittel' && w['stufe'] !== 'niedrig') return false;
  if (typeof w['gemessenAm'] !== 'number') return false;
  return true;
}

function istGueltigerSpeicher(wert: unknown): wert is LeistungsSpeicher {
  if (typeof wert !== 'object' || wert === null) return false;
  const w = wert as Record<string, unknown>;
  if (w['version'] !== 1) return false;
  if (typeof w['zustimmungErteilt'] !== 'boolean') return false;
  const ov = w['override'];
  if (ov !== 'auto' && ov !== 'hoch' && ov !== 'mittel' && ov !== 'niedrig') return false;
  if ('letztesErgebnis' in w && w['letztesErgebnis'] !== undefined && !istGueltigesErgebnis(w['letztesErgebnis'])) {
    return false;
  }
  if ('renderBeiBedarf' in w && w['renderBeiBedarf'] !== undefined && typeof w['renderBeiBedarf'] !== 'boolean') {
    return false;
  }
  return true;
}

function ladeSpeicherRoh(): LeistungsSpeicher {
  const storage = holeStorage();
  if (!storage) return basiszustand();
  let roh: string | null;
  try {
    roh = storage.getItem(STORAGE_KEY);
  } catch {
    return basiszustand();
  }
  if (!roh) return basiszustand();
  try {
    const geparst: unknown = JSON.parse(roh);
    if (!istGueltigerSpeicher(geparst)) return basiszustand();
    return geparst;
  } catch {
    return basiszustand();
  }
}

function schreibeSpeicher(speicher: LeistungsSpeicher): void {
  const storage = holeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(speicher));
  } catch {
    // Privater Modus/volles Kontingent — Override/Zustimmung bleiben flüchtig.
  }
}

/** Revisions-Zähler für den Viewport-Poll (Muster identisch zu `texturRevision`
 *  in Viewport3D.tsx) — erhöht sich bei jeder Änderung, die eine neu berechnete
 *  effektive Stufe zur Folge haben kann (Override-Wechsel, neue Messung). */
let leistungRevision = 0;
export function leistungRevisionAktuell(): number {
  return leistungRevision;
}
function bumpLeistungRevision(): void {
  leistungRevision++;
}

/** Ist die explizite Zustimmung gesetzt? Default AUS — kaputter/fehlender
 *  Eintrag zählt als KEINE Zustimmung (Sicherheitsrichtung: im Zweifel nicht
 *  messen). */
export function istZustimmungErteilt(): boolean {
  return ladeSpeicherRoh().zustimmungErteilt;
}

/** Setzt NUR die Zustimmung. Entziehen (`false`) löscht bewusst NICHT das
 *  letzte Ergebnis (Bericht bleibt sichtbar) — nur künftige Prüfungen sind
 *  dann wieder gesperrt. */
export function setZustimmung(erteilt: boolean): void {
  const speicher = ladeSpeicherRoh();
  schreibeSpeicher({ ...speicher, zustimmungErteilt: erteilt });
  bumpLeistungRevision();
}

export function holeOverride(): LeistungsOverride {
  return ladeSpeicherRoh().override;
}

export function setOverride(override: LeistungsOverride): void {
  const speicher = ladeSpeicherRoh();
  schreibeSpeicher({ ...speicher, override });
  bumpLeistungRevision();
}

export function holeLetztesErgebnis(): LeistungsErgebnis | undefined {
  return ladeSpeicherRoh().letztesErgebnis;
}

/**
 * V-M1 Commit 2: on-demand-Renderloop AN/AUS. Default AN (fehlendes Feld =
 * `true`, s. Interface-Kommentar) — E2E sät bewusst `renderBeiBedarf: false`
 * über die playwright-`storageState` (s. `playwright.config.ts`), damit ALLE
 * bestehenden 3D-Specs weiterhin den alten Dauerloop sehen; nur
 * `render-knopf.spec.ts`/`e2e/tools/frame-messung.mts` schalten es gezielt
 * per `localStorage`/`setRenderBeiBedarf(true)` ein.
 */
export function istRenderBeiBedarfAn(): boolean {
  return ladeSpeicherRoh().renderBeiBedarf ?? true;
}

export function setRenderBeiBedarf(an: boolean): void {
  const speicher = ladeSpeicherRoh();
  schreibeSpeicher({ ...speicher, renderBeiBedarf: an });
  bumpLeistungRevision();
}

/**
 * DAS Freigabe-Gate: ohne gespeicherte Zustimmung passiert GAR NICHTS — kein
 * `erhebeSystemMessung()`-Aufruf, keine Browser-API wird berührt, `null` kommt
 * sofort zurück. Nur der explizite Knopf im Einstellungen-Panel (nach Setzen
 * der Zustimmung) ruft dies auf.
 */
export function pruefeLeistungMitFreigabe(): LeistungsErgebnis | null {
  if (!istZustimmungErteilt()) return null;
  const messung = erhebeSystemMessung();
  const stufe = leistungsStufeAus(merkmaleAusMessung(messung));
  const ergebnis: LeistungsErgebnis = { messung, stufe, gemessenAm: Date.now() };
  const speicher = ladeSpeicherRoh();
  schreibeSpeicher({ ...speicher, letztesErgebnis: ergebnis });
  bumpLeistungRevision();
  return ergebnis;
}

/** Effektive Stufe, BEVOR je gemessen wurde (kein Override, kein Ergebnis):
 *  «hoch» — exakt der bisherige Fixwert (pixelRatio bis 2, Schatten an). Kein
 *  automatisches Drosseln ohne Zustimmung/Messung wäre selbst eine
 *  unangekündigte Verhaltensänderung für jede/n Nutzer:in, die/der die
 *  Freigabe nie erteilt hat — das widerspräche «nie automatisch beim Start
 *  ohne Zustimmung» genauso wie eine automatisch gestartete Messung. */
const STUFE_VOR_ERSTER_MESSUNG: LeistungsStufe = 'hoch';

/**
 * Effektive Stufe für den Viewport: ein manueller Override gewinnt immer;
 * 'auto' folgt der letzten Messung; ohne jede Messung ändert sich NICHTS am
 * bisherigen Verhalten (`STUFE_VOR_ERSTER_MESSUNG`) — die Drosselung setzt
 * erst ein, nachdem die Nutzerin zugestimmt UND tatsächlich geprüft hat.
 */
export function effektiveLeistungsStufe(): LeistungsStufe {
  const speicher = ladeSpeicherRoh();
  if (speicher.override !== 'auto') return speicher.override;
  return speicher.letztesErgebnis?.stufe ?? STUFE_VOR_ERSTER_MESSUNG;
}

/** Menschenlesbares Kurz-Label je Stufe (v0.7.6 Welle 1 Stream A: 3D-
 *  Viewport-Chrome «Darstellung»-Sektion im Eigenschaften-Panel) — rein additiv,
 *  keine Verhaltensänderung an der Leistungs-Engine selbst. */
export function leistungsStufeLabel(stufe: LeistungsStufe): string {
  return stufe === 'hoch' ? 'Hoch' : stufe === 'mittel' ? 'Mittel' : 'Niedrig';
}

/** Menschenlesbarer Bericht (für `leistung-bericht` im Einstellungen-Panel) —
 *  benennt explizit, was NICHT gemessen werden konnte. */
export function formatiereLeistungsBericht(ergebnis: LeistungsErgebnis): {
  kerne: string;
  speicher: string;
  renderer: string;
  stufe: LeistungsStufe;
} {
  const { messung, stufe } = ergebnis;
  return {
    kerne: messung.kerne !== null ? `${messung.kerne} logische Kerne` : 'Kerne: nicht verfügbar',
    speicher: messung.speicherGb !== null ? `${messung.speicherGb} GB Arbeitsspeicher (Browser-Schätzung)` : 'Arbeitsspeicher: nicht verfügbar',
    renderer: messung.rendererString,
    stufe,
  };
}
