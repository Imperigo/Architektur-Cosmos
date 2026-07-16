import type { SiaPhase } from '@kosmo/kernel';
import { nutzungMelden, nutzungsProfil, type NutzungsProfil } from './oberflaeche-adaption-kern';
import type { StationModulId } from '../shell/stations-werkzeuge';

/**
 * V0.7.2 W2-C (Pakete 03/05, `docs/V072-VISUELLES-UPDATE-SPEZ.md` §4
 * «Phasen & Ordnung») — reine, testbare Rang-Arithmetik für den
 * OrbitStart-Hub (Untertool-Kreise nach Rang) und das EntwurfsDock. Kein
 * React, kein DOM, kein Doc/Yjs — die BASE-Matrix + Nutzungsgewicht liefern
 * eine reine Zahl je Werkzeug, die Aufrufer (OrbitStart.tsx) in Grösse/
 * Reihenfolge/FLIP übersetzen.
 *
 * **Nutzung über den bestehenden Adaption-Kern**: `nutzungMelden('orbit:'+
 * toolId)` (EntwurfsDock-Klicks, s. dortiger Kommentar) füttert denselben
 * `localStorage`-Layer (`kosmo.adaption.v1`), der auch KosmoDesign/-Data
 * bedient — 1 Klick zählt als 1 gewichteter Nutzungspunkt (die 7-Tage-
 * Halbwertszeit-Verfall passiert automatisch beim nächsten Lesen,
 * `nutzungsProfil()`); die Spec nennt das «1 Klick ≈ 6-min-Gewicht» als
 * intendierte Grössenordnung dieses Punktes — arithmetisch irrelevant hier,
 * weil `norm()` (Max-Normierung) skaleninvariant ist: `norm(x·6) === norm(x)`.
 *
 * **Kein zweiter `darfUmordnen`-Sinn**: `oberflaeche-adaption-kern.ts` exportiert
 * bereits ein `darfUmordnen(aktionLaeuft: boolean)` (Anti-Nerv-Wache für die
 * Design-/Data-Werkzeugleisten, "nie mitten in einer laufenden Aktion neu
 * berechnen"). Diese Datei braucht eine ANDERE Wache (Hysterese + Kontingent
 * je Phasenwechsel/Sitzungsminute, Spec §4) — bewusst NICHT importiert/
 * überladen (andere Signatur, anderer Zweck), sondern hier als eigene,
 * gleichnamige Funktion exportiert (Modul-Scope, keine Kollision: Aufrufer
 * importieren beide unter ihrem jeweiligen Modul-Namen).
 */

/** Die 8 Canvas-Werkzeuge der BASE-Matrix (Spec §4) — NICHT dasselbe wie
 *  `ModuleId`/`StationModulId` (siehe `STATION_ZU_TOOLID` unten für die
 *  Abbildung). */
export type ToolId = 'prepare' | 'data' | 'chat' | 'publish' | 'pipeline' | 'draw' | 'connect' | 'viz';

export const ALLE_TOOL_IDS: readonly ToolId[] = [
  'prepare',
  'data',
  'chat',
  'publish',
  'pipeline',
  'draw',
  'connect',
  'viz',
];

/**
 * Rückrichtung der Spec-§4-Tabelle («Station→Glyphe→Rolle» sinngemäss
 * gespiegelt auf Station→ToolId): «draw→design · viz→vis · data→data ·
 * pipeline→dev · chat→speak · publish→publish · prepare→prepare ·
 * connect→(Sync, zählt für Rang nicht als Station)». EINZIGE Quelle dieser
 * Abbildung — `OrbitStart.tsx` (Hub-Rang-Reihenfolge) UND `EntwurfsDock.tsx`
 * (`nutzungMelden`-Zuordnung je Dock-Knopf) importieren beide von hier,
 * keine zweite, eigene Tabelle je Aufrufer. Stationen ohne eigene BASE-
 * Matrix-Zeile (asset/draw[KosmoDraw]/sketch/train/doc) bleiben bewusst
 * aussen vor — sie sind KEINE der 8 Canvas-Tools.
 */
export const STATION_ZU_TOOLID: Partial<Record<StationModulId, ToolId>> = {
  design: 'draw',
  vis: 'viz',
  data: 'data',
  dev: 'pipeline',
  speak: 'chat',
  publish: 'publish',
  prepare: 'prepare',
};

/**
 * BASE-Matrix (Minuten), Index = SIA-112-Gruppe 1..5 (`sia112Gruppe()`
 * unten) — WÖRTLICH aus Spec §4 übernommen, keine Rundung/Neuordnung.
 */
export const BASE: Record<ToolId, number>[] = [
  { prepare: 46, data: 38, chat: 30, publish: 12, pipeline: 10, draw: 8, connect: 6, viz: 4 },
  { draw: 34, prepare: 30, data: 26, chat: 22, viz: 18, pipeline: 12, publish: 8, connect: 5 },
  { draw: 52, viz: 30, pipeline: 26, data: 20, chat: 18, publish: 14, prepare: 8, connect: 6 },
  { publish: 44, data: 30, pipeline: 22, chat: 16, draw: 12, viz: 10, connect: 8, prepare: 6 },
  { data: 36, publish: 30, connect: 26, chat: 22, pipeline: 18, viz: 12, draw: 10, prepare: 4 },
];

/** SIA-112-Phase 1..5, s. Spec §4: strategie→1 · wettbewerb→2 ·
 *  vorprojekt/bauprojekt/bewilligung→3 · ausschreibung→4 ·
 *  ausfuehrung/abnahme→5. Additiv zu `SiaPhase` (die 8. reale Teilphase,
 *  `'strategie'`) — die BASE-Matrix selbst bleibt bei 5 Zeilen (5 SIA-112-
 *  Gruppen, nicht 8 SiaPhase-Werte: mehrere Teilphasen teilen eine Gruppe). */
export type Sia112Gruppe = 1 | 2 | 3 | 4 | 5;

export function sia112Gruppe(siaPhase: SiaPhase): Sia112Gruppe {
  switch (siaPhase) {
    case 'strategie':
      return 1;
    case 'wettbewerb':
      return 2;
    case 'vorprojekt':
    case 'bauprojekt':
    case 'bewilligung':
      return 3;
    case 'ausschreibung':
      return 4;
    case 'ausfuehrung':
    case 'abnahme':
      return 5;
  }
}

/** Basiszeile (Minuten je Werkzeug) für eine SIA-Teilphase. */
export function baseZeile(siaPhase: SiaPhase): Record<ToolId, number> {
  return BASE[sia112Gruppe(siaPhase) - 1]!;
}

/** Meldet einen Klick auf `toolId` — dünner, benannter Durchreicher auf den
 *  bestehenden Adaption-Kern (Spec: `nutzungMelden('orbit:'+toolId)`), damit
 *  Aufrufer (EntwurfsDock) nicht selbst das `'orbit:'`-Präfix erfinden/tippen
 *  müssen (Einzige-Quelle für die Element-Id-Konvention dieses Streams). */
export function toolNutzungMelden(toolId: ToolId): void {
  nutzungMelden(`orbit:${toolId}`);
}

/** Gewichtete 7-Tage-Nutzung EINES Werkzeugs aus dem persistierten,
 *  bereits verfallenen Profil (s. `nutzungsProfil()`). 0, wenn nie genutzt. */
export function toolNutzung(toolId: ToolId, profil: NutzungsProfil): number {
  return profil.zaehler[`orbit:${toolId}`] ?? 0;
}

/** Max-Normierung auf [0, 1] — skaleninvariant (Konstante-Faktoren auf ALLEN
 *  Werten ändern das Ergebnis nicht), das ist die Grundlage dafür, dass die
 *  «6-min-Gewicht»-Bemerkung der Spec keine Umrechnung im Code braucht.
 *  Leere/All-Null-Eingaben liefern überall 0 (kein NaN durch Division/0). */
export function norm(werte: Record<ToolId, number>, toolIds: readonly ToolId[] = ALLE_TOOL_IDS): Record<ToolId, number> {
  const max = Math.max(0, ...toolIds.map((t) => werte[t] ?? 0));
  const out = {} as Record<ToolId, number>;
  for (const t of toolIds) {
    out[t] = max > 0 ? (werte[t] ?? 0) / max : 0;
  }
  return out;
}

/** Gewichte der Rang-Formel (Spec §4): `rang(t) = 0.6·norm(BASE) + 0.4·norm(nutzung7T)`. */
export const RANG_GEWICHT_BASE = 0.6;
export const RANG_GEWICHT_NUTZUNG = 0.4;

/** Rang EINES Werkzeugs (höher = wichtiger) in einer SIA-Teilphase, gegeben
 *  ein Nutzungsprofil. Reine Funktion — für einen ganzen Satz Werkzeuge auf
 *  einmal s. `raenge()` (normiert nur EINMAL über alle, nicht je Aufruf). */
export function rang(toolId: ToolId, siaPhase: SiaPhase, nutzung: NutzungsProfil, toolIds: readonly ToolId[] = ALLE_TOOL_IDS): number {
  return raenge(siaPhase, nutzung, toolIds)[toolId] ?? 0;
}

/** Rang ALLER (oder einer Teilmenge, s. `toolIds`) Werkzeuge in einer
 *  SIA-Teilphase — normiert die Basis-/Nutzungswerte je EINMAL über den
 *  ganzen Satz statt je Werkzeug einzeln (spart wiederholte Max-Suche,
 *  ändert das Ergebnis nicht: `norm()` ist über die IDENTISCHE Menge
 *  aufgerufen). */
export function raenge(siaPhase: SiaPhase, nutzung: NutzungsProfil, toolIds: readonly ToolId[] = ALLE_TOOL_IDS): Record<ToolId, number> {
  const basisNorm = norm(baseZeile(siaPhase), toolIds);
  const nutzungRoh = {} as Record<ToolId, number>;
  for (const t of toolIds) nutzungRoh[t] = toolNutzung(t, nutzung);
  const nutzungNorm = norm(nutzungRoh, toolIds);
  const out = {} as Record<ToolId, number>;
  for (const t of toolIds) {
    out[t] = RANG_GEWICHT_BASE * (basisNorm[t] ?? 0) + RANG_GEWICHT_NUTZUNG * (nutzungNorm[t] ?? 0);
  }
  return out;
}

/** Bequemlichkeits-Wrapper: Rang ALLER 8 Werkzeuge der AKTUELLEN, bereits
 *  verfallenen Nutzung (liest `nutzungsProfil()` selbst — für Aufrufer, die
 *  kein eigenes Profil-Snapshot verwalten, z. B. ein einmaliger Read). */
export function aktuelleRaenge(siaPhase: SiaPhase, toolIds: readonly ToolId[] = ALLE_TOOL_IDS): Record<ToolId, number> {
  return raenge(siaPhase, nutzungsProfil(), toolIds);
}

/** Absteigend nach Rang sortierte `toolIds` (stabil: gleicher Rang behält die
 *  Eingabereihenfolge — `Array.prototype.sort` ist stabil). */
export function sortiereNachRang(toolIds: readonly ToolId[], raengeWert: Record<ToolId, number>): ToolId[] {
  return [...toolIds].sort((a, b) => (raengeWert[b] ?? 0) - (raengeWert[a] ?? 0));
}

/** Grössen-/Betonungs-Tier je Rang-POSITION (0-indexiert, nach `sortiereNachRang`)
 *  — Positionen 0-2 = innen, 3-5 = mitte, ab 6 = aussen. Die meisten
 *  OrbitStart-Fächer zeigen NUR 1–4 der 8 Canvas-Tools (s. `OrbitStart.tsx`,
 *  Rang gilt je Hauptwerkzeug-Fächer, nicht global über alle 8 auf einmal) —
 *  bei WENIGER als 3 rang-fähigen Werkzeugen fallen dann schlicht ALLE in
 *  den «innen»-Tier (keine erzwungene 3er-Staffelung, die Schwellen sind
 *  Positions-Grenzen, keine feste Anzahl-Regel).
 *
 * v0.8.1/P1 (Owner-Entscheid 16.07.2026, `docs/V081-SPEZ.md` §4.1 Entscheid
 * 2/C-2, zurückgeholter Bestand aus dem v0.8.0B/P3-Abweichungsvermerk unten)
 * — `TIER_GROESSE` kehrt auf die ursprüngliche Blaupausen-Masse **44/36px**
 * zurück (statt der zwischenzeitlichen 64/54/46, s. Historie). Die Blaupause
 * kennt nur ZWEI Grössen (Top-Werkzeug 44px, alle übrigen 36px) — «aussen»
 * fällt darum bewusst auf denselben 36px-Wert wie «mitte», keine dritte
 * Stufe. `tierFuerPosition` selbst (die 0-2/3-5/6+-Positionsgrenzen) bleibt
 * UNVERÄNDERT — nur die daraus abgeleiteten Pixelgrössen ändern sich; jeder
 * Konsument dieser Konstante (`BodenDock.tsx`, `OrbitStart.tsx`,
 * `BODEN_DOCK_RESERVE_PX`) zieht automatisch mit, weil er den Wert importiert
 * statt ihn zu duplizieren. Historie: v0.8.0B/P3 (ROADMAP 385) hatte die
 * Blaupausen-Masse bewusst NICHT übernommen, weil das damals den getesteten
 * `BODEN_DOCK_RESERVE_PX=180`-Vertrag verschoben hätte («B-65» — Owner konnte
 * das als eigenen state/-Entscheid zurückholen, s. ROADMAP 393) — genau das
 * ist jetzt dieser Entscheid; `BODEN_DOCK_RESERVE_PX` wird in derselben Runde
 * neu gerechnet (`shell/BodenDock.tsx`s Kopfkommentar zur Konstante). */
export type RangTier = 'innen' | 'mitte' | 'aussen';

export const TIER_GROESSE: Record<RangTier, number> = { innen: 44, mitte: 36, aussen: 36 };

export function tierFuerPosition(position: number): RangTier {
  if (position < 3) return 'innen';
  if (position < 6) return 'mitte';
  return 'aussen';
}

// ---------------------------------------------------------------------------
// Hysterese + Anti-Nerv-Kontingent (Spec §4: «Umsortieren nur bei Δrang > 0.08
// UND Anti-Nerv-Wache (darfUmordnen), max 1 Umsortierung pro Phasenwechsel
// bzw. Sitzungsminute»)
// ---------------------------------------------------------------------------

/** Ab dieser Rang-Differenz gilt eine Neu-Berechnung überhaupt erst als
 *  «wirklich anders» — kleines Nutzungsrauschen (ein einzelner Klick mehr)
 *  darf die Reihenfolge NICHT bei jedem Tastendruck neu würfeln. */
export const HYSTERESE_SCHWELLE = 0.08;

/** Ist der Rang-Unterschied zwischen zwei Berechnungen für DIESES Werkzeug
 *  gross genug, um überhaupt als Kandidat für eine Umsortierung zu zählen? */
export function ueberschreitetHysterese(alterRang: number, neuerRang: number): boolean {
  return Math.abs(neuerRang - alterRang) > HYSTERESE_SCHWELLE;
}

/** Vergleicht zwei Rang-Sätze über dieselbe Werkzeug-Menge: liefert `true`,
 *  sobald MINDESTENS ein Werkzeug die Hysterese-Schwelle überschreitet (dann
 *  lohnt sich eine Neusortierung überhaupt) — reine Prüfung, entscheidet noch
 *  NICHT, ob sie auch erlaubt ist (das ist `darfUmordnen`, getrennt, weil die
 *  Erlaubnis von Zeit/Phase abhängt, die Grösse des Unterschieds nicht). */
export function hatSignifikanteVerschiebung(
  alteRaenge: Record<ToolId, number>,
  neueRaenge: Record<ToolId, number>,
  toolIds: readonly ToolId[],
): boolean {
  return toolIds.some((t) => ueberschreitetHysterese(alteRaenge[t] ?? 0, neueRaenge[t] ?? 0));
}

/** Zeitlicher/phasenbezogener Kontingent-Zustand — vom Aufrufer (React-Hook
 *  in OrbitStart.tsx) zwischen Aufrufen gehalten (kein Modul-Singleton: jeder
 *  Hub-Ausschnitt/Test bekommt seinen eigenen Zustand). */
export interface UmordnungsKontingent {
  /** SIA-Teilphase beim letzten ERLAUBTEN (oder allerersten) Aufruf. */
  letztePhase: SiaPhase | null;
  /** Sitzungsminute (`Math.floor(ms / 60000)`) der letzten TATSÄCHLICHEN
   *  Umsortierung; `null` = noch nie umsortiert. */
  letzteUmordnungMinute: number | null;
}

export function anfangsKontingent(): UmordnungsKontingent {
  return { letztePhase: null, letzteUmordnungMinute: null };
}

/** ms → Sitzungsminute (ganzzahlig, gerundet ab). Eigene, benannte Funktion
 *  statt der rohen `Math.floor(ms/60000)`-Formel an jeder Aufrufstelle —
 *  einzige Quelle für "was eine Sitzungsminute ist" (Unit-Test deckt Grenzen). */
export function sitzungsMinute(jetztMs: number): number {
  return Math.floor(jetztMs / 60_000);
}

/**
 * Anti-Nerv-Wache dieses Streams (Spec §4) — NICHT dieselbe Funktion wie
 * `oberflaeche-adaption-kern.ts`s `darfUmordnen(aktionLaeuft)` (s. Kopf-
 * kommentar). Ein Phasenwechsel gibt IMMER ein frisches Kontingent (die
 * Reihenfolge SOLL sich beim bewussten Phasenwechsel anpassen dürfen); ohne
 * Phasenwechsel darf höchstens einmal pro Sitzungsminute umsortiert werden.
 */
export function darfUmordnen(kontingent: UmordnungsKontingent, aktuellePhase: SiaPhase, jetztMs: number): boolean {
  const phasenwechsel = kontingent.letztePhase !== null && kontingent.letztePhase !== aktuellePhase;
  if (phasenwechsel) return true;
  if (kontingent.letzteUmordnungMinute === null) return true;
  return sitzungsMinute(jetztMs) > kontingent.letzteUmordnungMinute;
}

/** Kontingent NACH einer tatsächlich vollzogenen Umsortierung — reine
 *  Funktion (kein Mutieren des übergebenen Zustands), Aufrufer speichert das
 *  Ergebnis selbst (React-State/-Ref). */
export function kontingentNachUmordnung(aktuellePhase: SiaPhase, jetztMs: number): UmordnungsKontingent {
  return { letztePhase: aktuellePhase, letzteUmordnungMinute: sitzungsMinute(jetztMs) };
}

/**
 * Kontingent NACH einem Zyklus, in dem eine Umsortierung NICHT vollzogen
 * wurde (weder wegen fehlender Hysterese noch wegen des Kontingents) — hält
 * `letztePhase` aktuell, DAMIT ein späterer echter Phasenwechsel erkannt wird
 * (ohne dieses Nachführen bliebe `letztePhase` auf dem allerersten Wert
 * stehen und jeder weitere Phasenwechsel sähe wie der erste aus).
 */
export function kontingentOhneUmordnung(kontingent: UmordnungsKontingent, aktuellePhase: SiaPhase): UmordnungsKontingent {
  return { ...kontingent, letztePhase: aktuellePhase };
}

/** Ergebnis eines vollständigen Umordnungs-Zyklus (`naechsteReihenfolge`). */
export interface UmordnungsErgebnis {
  reihenfolge: ToolId[];
  raenge: Record<ToolId, number>;
  umgeordnet: boolean;
  kontingent: UmordnungsKontingent;
}

/**
 * EIN Zyklus des kompletten Ablaufs (Rang neu berechnen → Hysterese prüfen →
 * Anti-Nerv-Kontingent prüfen → ggf. neu sortieren) — die Funktion, die
 * `OrbitStart.tsx`/ein Hook direkt aufruft, statt die Einzelbausteine oben
 * selbst zu verdrahten. Bei `alteReihenfolge.length === 0` (erster Aufruf)
 * wird IMMER sortiert (kein «Umordnen» im eigentlichen Sinn — es gibt noch
 * keine Reihenfolge, die stabil bleiben könnte).
 *
 * WICHTIG (Vergleichsbasis der Hysterese): `raenge` im Ergebnis ist die
 * Grundlage für den NÄCHSTEN Aufruf (`alteRaenge`) — solange NICHT umgeordnet
 * wurde, bleibt das die zuletzt TATSÄCHLICH ANGEZEIGTE Rang-Momentaufnahme
 * (`alteRaenge` unverändert durchgereicht), NICHT die frisch berechnete. Ein
 * Vergleich gegen die frische Berechnung würde nach dem ERSTEN blockierten
 * Zyklus sofort auf "keine weitere Änderung" zurückfallen (Delta zu sich
 * selbst ist immer 0) und so echten, über mehrere Zyklen akkumulierten Drift
 * verschlucken, bevor das Anti-Nerv-Kontingent ihn je zulassen könnte.
 */
export function naechsteReihenfolge(params: {
  toolIds: readonly ToolId[];
  siaPhase: SiaPhase;
  nutzung: NutzungsProfil;
  alteReihenfolge: readonly ToolId[];
  alteRaenge: Record<ToolId, number> | null;
  kontingent: UmordnungsKontingent;
  jetztMs: number;
}): UmordnungsErgebnis {
  const { toolIds, siaPhase, nutzung, alteReihenfolge, alteRaenge, kontingent, jetztMs } = params;
  const neueRaenge = raenge(siaPhase, nutzung, toolIds);

  const ersterAufruf = alteReihenfolge.length === 0 || alteRaenge === null;
  const signifikant = ersterAufruf || hatSignifikanteVerschiebung(alteRaenge, neueRaenge, toolIds);
  const erlaubt = ersterAufruf || darfUmordnen(kontingent, siaPhase, jetztMs);

  if (!signifikant || !erlaubt) {
    return {
      reihenfolge: [...alteReihenfolge],
      // Angezeigte Basis bleibt stehen (s. Kopfkommentar) — nur beim
      // allerersten Aufruf gibt es noch keine, dann zählt die frische.
      raenge: alteRaenge ?? neueRaenge,
      umgeordnet: false,
      kontingent: kontingentOhneUmordnung(kontingent, siaPhase),
    };
  }

  return {
    reihenfolge: sortiereNachRang(toolIds, neueRaenge),
    raenge: neueRaenge,
    umgeordnet: true,
    kontingent: kontingentNachUmordnung(siaPhase, jetztMs),
  };
}
