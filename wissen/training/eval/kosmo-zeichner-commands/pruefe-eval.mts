#!/usr/bin/env -S npx tsx
/**
 * Eval-Suite-Prüfer für den Adapter `kosmo-zeichner-commands` (v0.8.4/PD2,
 * `docs/V084-SPEZ.md` D14/C-23).
 *
 * ANDERS als das Vorbild `../kosmo-zeichner-grundriss/pruefe-eval.mts` (das
 * einen echten Kernel-GENERATOR referenzprüft): für "Nutzerwunsch → Tool-Call"
 * gibt es weder einen deterministischen Kernel-Algorithmus noch ein
 * trainiertes Modell (`../../REGISTRY.md`: HomeStation-Stand
 * "nicht trainiert"). Das Skript je Prompt IST hier die Referenz — von Hand
 * gegen die echten Command-Titel/-Beschreibungen aus
 * `packages/kosmo-kernel/src/commands/*.ts` formuliert (`prompts.json`).
 *
 * Was dieser Prüfer WIRKLICH beweist (ehrlich, s. `README.md`):
 *   1. jede erwartete `commandId` ist noch ein reales Kosmo-Werkzeug
 *      (`commandTools()`) — eine Umbenennung/Entfernung fällt sofort auf;
 *   2. die erwarteten Parameter bestehen die ECHTE, aktuelle zod-Validierung
 *      des Commands (derselbe `validateToolCall()`-Weg wie ein echtes Modell
 *      durchliefe);
 *   3. der volle `ChatSession`-Zugweg (Systemprompt/Persona/Kontext-Defaults/
 *      Diff-Karten-Gate) läuft für jeden Fall fehlerfrei durch — abgespielt
 *      über den ECHTEN `ScriptedProvider` (`@kosmo/ai`), nicht über einen
 *      Kurzschluss-Aufruf von `validateToolCall()` allein;
 *   4. ein Ablehn-Fall (Skript-Zug ohne Tool-Aufruf) erzeugt tatsächlich NULL
 *      `onProposal`-Meldungen — der reale `toolCalls.length === 0`-Zweig in
 *      `chat.ts#turn()`.
 *
 * Das ist ein PLUMBING-/Integrations-Beweis gegen den Datensatz-/Schema-Weg
 * mit einem deterministischen Mock-Provider — KEIN Modell-Eval (es gibt noch
 * keinen HomeStation-Checkpoint für diesen Adapter). Ein künftiger
 * Kandidaten-Modus (echte LoRA-Ausgabe statt Skript) ist hier bewusst NICHT
 * gebaut — anders als beim Grundriss-Vorbild hat "Nutzerwunsch → Tool-Call"
 * keine geometrische Kennzahl, gegen die sich eine externe Antwort strukturell
 * prüfen liesse, ohne selbst wieder nur das Schema zu re-implementieren.
 *
 * Exit-Code 0 nur wenn ALLE Prompts bestehen, sonst 1 mit einer Tabelle
 * der Fehlschläge UND der Quote je Kategorie.
 *
 * v0.8.6/PA4 (E8 «Eval-LaufPlan-Format», D9, `docs/V086-SPEZ.md`): NEU
 * `erwartung.typ: 'laufplan'` — die Erwartung nennt eine ganze
 * Schritt-Folge (`[{ commandId, params? }]`) statt eines einzelnen
 * Tool-Aufrufs. Das ist die naheliegende Erweiterung des bestehenden
 * `'command'`-Wegs, NICHT der `lauf_planen`-Weg aus E4 (`docs/V086-SPEZ.md`
 * §3): `lauf_planen` ist ein eigenes Nicht-Command-Tool in `packages/
 * kosmo-ai` (PB1, Tag 2) und existiert zum Zeitpunkt dieses Pakets noch
 * NICHT — dieser Prüfer darf `kosmo-ai` laut Auftrag nicht ändern. Der
 * LaufPlan-Fall nutzt darum GENAU denselben ScriptedProvider/ChatSession-Weg
 * wie die Ein-Zug-Fälle, aber mit MEHREREN `toolCalls` in EINEM Zug
 * (`SkriptZug.toolCalls`, `scripted.ts`: "mehrere = ein Paket (eine
 * Diff-Karten-Kette)") — `ChatSession#turn()` meldet dafür bereits heute
 * mehrere `onProposal`s in Aufrufreihenfolge (chat.ts, `schreibend`-Schleife,
 * `paket`-Metadatum). Der Prüfer vergleicht die resultierende
 * Proposal-Sequenz gegen die erwartete `commandId`-Folge + die genannten
 * Kernparameter (Teilmengen-Vergleich je Schritt, `enthaeltErwartete`, wie
 * beim Ein-Zug-Fall). Das beweist denselben Plumbing-Weg wie beim
 * Ein-Zug-Fall — NUR für eine ganze Schrittfolge statt eines Schritts. Was
 * es NICHT beweist (Ehrlichkeit, s. README.md-Nachtrag): keine Ausführung
 * gegen einen echten `KosmoDoc` (das leistet weiterhin ausschliesslich
 * `../kosmo-laufplaene/pruefe-laufplaene.mts`), und keinen Beweis, dass ein
 * künftiges `lauf_planen`-Tool-Ergebnis exakt in dieses Schema passt (das
 * ist Sache von PB1/E4, sobald das Tool existiert).
 *
 * v0.8.7/PA3 (E7 «Eval: lauf_planen-Vorschlagsformat», D8, `docs/V087-SPEZ.md`
 * §3 E7, §6 Sanktion 4): der D9-Nachtrag oben ist jetzt eingelöst — `lauf_planen`
 * (E4, v0.8.6/PB1) existiert seither wirklich (`packages/kosmo-ai/src/tools.ts`
 * `LAUF_PLANEN_TOOL_NAME`/`laufPlanTool`/`validateLaufPlanCall`, verdrahtet in
 * `chat.ts#turn()`). NEU `erwartung.typ: 'lauf-vorschlag'` (positiv) UND
 * `'lauf-vorschlag-abgelehnt'` (Negativfall) — ANDERS als `'laufplan'` oben
 * (simuliert einen Plan über MEHRERE echte Command-Tool-Aufrufe im selben
 * Zug) prüft dieser Fall den ECHTEN `lauf_planen`-Weg: das Skript enthält
 * EINEN einzigen Tool-Aufruf `{name: LAUF_PLANEN_TOOL_NAME, args: {titel,
 * schritte: [...]}}`, den `ChatSession#turn()` als EIGENEN `LaufVorschlag`
 * behandelt (`chat.ts:386-421`), NIE als `schreibend`/`onProposal`. Der
 * Prüfer registriert zusätzlich `onLaufVorschlag` bei der `ChatSession`
 * (`spieleAb`) und prüft für `'lauf-vorschlag'`: (a) genau EIN
 * `LaufVorschlag` feuert, (b) `plan.titel` + die Schrittfolge
 * (commandId-Sequenz + Kernparameter als Teilmenge, dieselbe
 * `enthaeltErwartete`-Logik wie beim `'laufplan'`-Fall) entsprechen der
 * Erwartung, (c) KEIN `onProposal` feuert (Sanktion 4: «Eval-Zug, der
 * onProposal auslöst oder Commands ausführt = ungültig» — ein Vorschlag ist
 * keine Ausführung), (d) der vom Prüfer selbst gehaltene `KosmoDoc` bleibt
 * unverändert (`revision === 0`, keine Entities) — kein Command lief. Für
 * `'lauf-vorschlag-abgelehnt'` (eine ERFUNDENE commandId nach dem
 * `design.dasGibtEsNicht`-Muster IM Plan): `ChatSession` weist unbekannte
 * `commandId`s VOR jeder Karte ab (`bekannteCommandIds`, C-12-Fund v0.8.6,
 * `chat.ts:403-417`) — erwartet wird KEIN `LaufVorschlag`, KEIN
 * `onProposal`, und ein Tool-FEHLER-Ergebnis in der Session-Historie, das
 * den erwarteten Fehlertext-Ausschnitt (z.B. «unbekannte commandId»)
 * enthält. Dateikreis dieses Pakets bleibt exklusiv `wissen/training/eval/**`
 * — `packages/kosmo-ai` wird nur GELESEN, nichts dort wurde angefasst.
 *
 * v0.8.8/PA3 (E8 «Eval-Ausbau: Mehr-Zug + Byte-Diff + Negativfälle»,
 * `docs/V088-SPEZ.md` §3 E8, §6 Sanktion 9, §7 C-12): DREI additive
 * Ausbauten, bestehende Ein-Zug-Prompts bleiben byte-identisch lesbar.
 *
 * (1) NEU `erwartung`-freie Prompts mit `kategorie: 'mehrzug'` und einer
 * `zuege`-Liste (`PromptMehrzug`/`MehrZugTurn` unten) — mehrere
 * Nutzerwunsch/Erwartung-Paare, JEDES als eigener `SkriptZug`
 * (`skriptFuer` baut jetzt optional eine ganze Zugfolge statt eines
 * einzigen Zugs), gespielt über MEHRERE `session.send()`-Aufrufe DERSELBEN
 * `ChatSession` (`spieleAbMehrzug`). **H-37-Grenze (Sanktion 9, bindend):**
 * ein `SzenarioSkript` bleibt STATISCH (`scripted.ts`-Kopfkommentar) — die
 * Parameter von Zug N+1 stehen zur AUTORENZEIT in `prompts.json`, NIE
 * abgeleitet aus der tatsächlichen, zur Laufzeit vom Kernel vergebenen ID
 * einer in Zug N vorgeschlagenen Entity. Referenzen über Folge-Züge laufen
 * darum AUSSCHLIESSLICH über den literalen `@ref:kind:name`-String (dieselbe
 * Schreibweise wie `lauf-refs.ts#loeseWertAuf`, Kinds `storey`/`aufbau`/
 * `sheet`/`graph`) — dieser Prüfer LÖST diese Strings NIE auf (kein Aufruf
 * von `loeseLaufPlanRefs`/`loeseWertAuf`), er beweist nur, dass der literale
 * Platzhalter unverändert durch den ScriptedProvider→ChatSession→Proposal-Weg
 * läuft (derselbe `enthaeltErwartete`-Teilmengenvergleich wie bei jedem
 * anderen Parameter). Zwischen zwei Zügen ruft `spieleAbMehrzug`
 * `session.resolveApplied()`/`resolveLaufAbgelehnt()` für JEDEN offenen
 * Vorschlag des GERADE gespielten Zugs — das ist KEIN simulierter
 * Command-Vollzug (kein `doc.apply()`, keine Kernel-Ausführung, der
 * übergebene `resultSummary` ist eine erfundene Eval-Quittierung): es
 * dient EINZIG dazu, dem `ScriptedProvider` intern zu signalisieren „dieser
 * Zug ist fertig" (die „Folge-Turn NACH Tool-Resultaten"-Verzweigung in
 * `scripted.ts`), damit sein `zugIndex` auf den NÄCHSTEN Zug weiterzählt.
 * Der Byte-Diff (Punkt 2) beweist das für jeden Mehr-Zug-Lauf: `doc.toJSON()`
 * ist vor Zug 1 und nach dem letzten Zug identisch. Ehrliche Grenze: ein
 * Mehr-Zug-Turn deckt hier nur `erwartung.typ` `'command'`/`'ablehnung'`/
 * `'laufplan'` ab (`pruefeZugErwartung` wirft für alles andere bewusst statt
 * still falsch zu prüfen) — echte Mehrschritt-AUSFÜHRUNG mit @ref-Auflösung
 * gegen einen fortschreitenden Live-Doc bleibt exklusiv `../kosmo-laufplaene/
 * pruefe-laufplaene.mts`.
 *
 * (2) `docUnveraendert` ist jetzt ein ECHTER Byte-Diff (ROADMAP-498): statt
 * der bisherigen Heuristik `doc.revision === 0 && doc.entities.size === 0`
 * vergleicht `spieleAb`/`spieleAbMehrzug` `JSON.stringify(doc.toJSON())` VOR
 * dem ersten und NACH dem letzten Zug — gilt jetzt für JEDEN Fall (nicht nur
 * `lauf-vorschlag`/`lauf-vorschlag-abgelehnt`), auch wenn nur diese beiden
 * (plus die neuen `command-fehler`/`mehrzug`-Zweige) das Feld tatsächlich in
 * ihrem Bestehen/Scheitern auswerten.
 *
 * (3) Zwei neue Negativfälle: (a) `cmd-44` — ein `lauf_planen`-Plan mit ZWEI
 * verschiedenen erfundenen commandIds, eine davon zweimal im Plan wiederholt
 * — beweist, dass `chat.ts`s bestehende `[...new Set(unbekannt)]`-Dedup
 * (C-12-Fund v0.8.6, unverändert) BEIDE Namen nennt und KEINEN davon
 * wiederholt (`erwartung.dedupFragmente`, neues optionales Feld auf
 * `lauf-vorschlag-abgelehnt`). (b) `cmd-45` — NEU `erwartung.typ:
 * 'command-fehler'` (`PromptCommandFehler`): ein ECHTER Tool-Aufruf, den
 * `validateToolCall()` ablehnt, BEVOR er zur Diff-Karte wird (KEIN
 * `onProposal`, Doc bleibt Byte-gleich) — hier `design.eigenschaftSetzen`
 * mit `feld: 'rotationGrad'` auf einer `furniture`-Entity. **Ehrlicher
 * Stand (Live-Sondierung 19.07.2026 gegen DIESEN Worktree-HEAD):**
 * `editableFields` (`design.ts:702-723`) kennt `rotationGrad` noch NICHT
 * (das ist PA1-088/E2, paralleles Paket) — der Fall prüft darum HEUTE den
 * generischen Ablehnungsweg „unbekanntes Feld" (`feld: Invalid option:
 * expected one of …`, zod-enum-Fehler VOR jeder kind-spezifischen Prüfung).
 * Sobald PA1-088/E2 landet und `rotationGrad` ein bekanntes Feld wird, prüft
 * derselbe Aufruf stattdessen `eigenschaftSetzen`s WERT-Validierung
 * (`'schräg'` ist keine gültige Zahl) — `erwartung.enthaeltFehlertext` muss
 * dann nachgeführt werden (s. `notiz`-Feld bei `cmd-45` in `prompts.json`).
 *
 * Aufruf:
 *   npx tsx wissen/training/eval/kosmo-zeichner-commands/pruefe-eval.mts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Relativer Import statt `@kosmo/*`: diese Datei liegt unter `wissen/`
// (Geschwisterverzeichnis von `kosmo-orbit/`, kein npm-Workspace-Mitglied,
// s. Kopfkommentar des Grundriss-Vorbilds) — Modulauflösung von `@kosmo/kernel`
// INNERHALB von `kosmo-ai/src/tools.ts` funktioniert trotzdem, weil sie vom
// tatsächlichen Ablageort der Quelldatei ausgeht (unter `kosmo-orbit/`, wo
// die Workspace-Symlinks in `node_modules/@kosmo/*` liegen) — nicht vom
// Ablageort DIESES Skripts.
import { KosmoDoc } from '../../../../kosmo-orbit/packages/kosmo-kernel/src/index';
import {
  ChatSession,
  LAUF_PLANEN_TOOL_NAME,
  ScriptedProvider,
  commandTools,
  toolNameFor,
  type ChatMessage,
  type LaufVorschlag,
  type Proposal,
  type SzenarioSkript,
} from '../../../../kosmo-orbit/packages/kosmo-ai/src/index';

const HIER = dirname(fileURLToPath(import.meta.url));

/** E8 (v0.8.8/PA3): die einzelnen `erwartung`-Formen als eigene Typen —
 * VORHER inline in jedem `Prompt*`-Interface dupliziert, jetzt geteilt, damit
 * `MehrZugTurn` (NEU, s. unten) dieselben Formen je Zug wiederverwenden kann,
 * ohne die bestehenden `Prompt*`-Interfaces (und damit die bestehende
 * `prompts.json`-Lesbarkeit) zu ändern — reine Typ-Extraktion, keine
 * Feld-Änderung an einer bestehenden Form. */
interface ErwartungCommand {
  typ: 'command';
  commandId: string;
  params: Record<string, unknown>;
}
interface ErwartungAblehnung {
  typ: 'ablehnung';
}

interface PromptCommand {
  id: string;
  kategorie: string;
  nutzerwunsch: string;
  kosmoText: string;
  erwartung: ErwartungCommand;
}

interface PromptAblehnung {
  id: string;
  kategorie: 'ablehnung';
  nutzerwunsch: string;
  kosmoText: string;
  erwartung: ErwartungAblehnung;
}

/** EIN erwarteter Schritt eines LaufPlans — `params` optional (ein Schritt
 * ohne genannte Parameter gilt als bestanden, sobald die commandId + die
 * Position in der Sequenz stimmen; Teilmengen-Vergleich wie beim Ein-Zug-Fall).
 * `begruendung` optional (E7, v0.8.7/PA3): nur der `'lauf-vorschlag'`/
 * `'lauf-vorschlag-abgelehnt'`-Weg braucht sie überhaupt (Pflichtfeld im
 * echten `laufPlanSchema`) — fehlt sie in `prompts.json`, synthetisiert
 * `baueLaufPlanSchritte` unten eine generische; der Vergleich selbst prüft
 * `begruendung` NICHT (wie ein vom Schema ergänzter Command-Default). */
interface LaufPlanSchrittErwartung {
  commandId: string;
  params?: Record<string, unknown>;
  begruendung?: string;
}

interface ErwartungLaufplan {
  typ: 'laufplan';
  schritte: LaufPlanSchrittErwartung[];
}
interface ErwartungLaufVorschlag {
  typ: 'lauf-vorschlag';
  titel: string;
  schritte: LaufPlanSchrittErwartung[];
}
/** E8 (v0.8.8/PA3, Negativfall Dedup): `dedupFragmente` optional/additiv —
 * jedes Fragment muss im Tool-FEHLER-Text GENAU EINMAL vorkommen, auch wenn
 * die zugrundeliegende erfundene commandId MEHRFACH im Plan steht (beweist
 * `chat.ts`s bestehende `[...new Set(unbekannt)]`-Dedup, C-12-Fund v0.8.6,
 * unverändert). Fehlt das Feld, bleibt das Verhalten wie bei `cmd-41`
 * (v0.8.7/PA3) — nur `enthaeltFehlertext` wird geprüft. */
interface ErwartungLaufVorschlagAbgelehnt {
  typ: 'lauf-vorschlag-abgelehnt';
  titel: string;
  schritte: LaufPlanSchrittErwartung[];
  enthaeltFehlertext: string;
  dedupFragmente?: string[];
}
/** E8 (v0.8.8/PA3, Negativfall E2-Anker): ein ECHTER Tool-Aufruf, den
 * `validateToolCall()` ablehnt, BEVOR er zur Diff-Karte wird — anders als
 * `'ablehnung'` (Skript hat GAR KEINEN Tool-Aufruf, Kosmo würde nachfragen)
 * ruft dieser Fall das Werkzeug tatsächlich auf; anders als
 * `'lauf-vorschlag-abgelehnt'` ist es ein normaler Command-Tool-Aufruf
 * (kein `lauf_planen`), die Ablehnung passiert in `validateToolCall()`
 * (zod-Schema), nicht in der `bekannteCommandIds`-Prüfung. */
interface ErwartungCommandFehler {
  typ: 'command-fehler';
  commandId: string;
  params: Record<string, unknown>;
  enthaeltFehlertext: string;
}

/** E8 (v0.8.6/PA4, D9): eine ganze Schritt-Folge statt eines einzelnen
 * Tool-Aufrufs — s. Kopfkommentar für die Grenze ggü. dem `lauf_planen`-Weg (E4). */
interface PromptLaufplan {
  id: string;
  kategorie: 'laufplan';
  nutzerwunsch: string;
  kosmoText: string;
  erwartung: ErwartungLaufplan;
}

/** E7 (v0.8.7/PA3, D8, `docs/V087-SPEZ.md` §3): der ECHTE `lauf_planen`-Weg —
 * EIN Tool-Aufruf, dessen Argumente den GANZEN Plan (Titel + Schrittliste)
 * tragen. `titel` wird zusätzlich zur Schrittfolge verglichen (`plan.titel`
 * aus dem gemeldeten `LaufVorschlag`). */
interface PromptLaufVorschlag {
  id: string;
  kategorie: 'lauf-vorschlag';
  nutzerwunsch: string;
  kosmoText: string;
  erwartung: ErwartungLaufVorschlag;
}

/** E7-Negativfall (v0.8.7/PA3): der Plan trägt (mindestens) eine ERFUNDENE
 * commandId nach dem `design.dasGibtEsNicht`-Muster — `ChatSession` muss sie
 * VOR jeder Karte abweisen (`bekannteCommandIds`, C-12-Fund v0.8.6). Anders
 * als bei `'ablehnung'` (Skript hat GAR KEINEN Tool-Aufruf) ruft dieser Fall
 * `lauf_planen` sehr wohl auf — die Ablehnung passiert INNERHALB der
 * ChatSession, nicht schon im Skript. `enthaeltFehlertext` ist der erwartete
 * Ausschnitt der Tool-FEHLER-Meldung (z.B. «unbekannte commandId»). */
interface PromptLaufVorschlagAbgelehnt {
  id: string;
  kategorie: 'lauf-vorschlag-abgelehnt';
  nutzerwunsch: string;
  kosmoText: string;
  erwartung: ErwartungLaufVorschlagAbgelehnt;
}

/** E8 (v0.8.8/PA3, Negativfall E2-Anker, s. Kopfkommentar für den ehrlichen
 * PA1-Nachführungs-Vermerk). `notiz` ist rein dokumentarisch (fliesst in
 * keine Prüf-Logik ein) — hier für den «Erwartung ändert sich nach PA1-088/
 * E2»-Hinweis genutzt. */
interface PromptCommandFehler {
  id: string;
  kategorie: 'command-fehler';
  nutzerwunsch: string;
  kosmoText: string;
  erwartung: ErwartungCommandFehler;
  notiz?: string;
}

/** E8 (v0.8.8/PA3, Mehr-Zug): EIN Zug innerhalb eines Mehr-Zug-Prompts —
 * wiederverwendet dieselben Erwartungsformen wie ein Ein-Zug-Prompt. Nur
 * `command`/`ablehnung`/`laufplan` werden je Zug tatsächlich geprüft
 * (`pruefeZugErwartung` unten wirft für alles andere bewusst statt still
 * falsch zu prüfen — s. Kopfkommentar). */
interface MehrZugTurn {
  nutzerwunsch: string;
  kosmoText: string;
  erwartung: ErwartungCommand | ErwartungAblehnung | ErwartungLaufplan | ErwartungLaufVorschlag | ErwartungLaufVorschlagAbgelehnt;
}

/** E8 (v0.8.8/PA3, D-, `docs/V088-SPEZ.md` §3 E8): eine ganze Zugfolge STATT
 * eines einzelnen `nutzerwunsch`/`erwartung`-Paars — additiv (kein
 * bestehendes `Prompt*`-Interface verliert oder ändert ein Feld). Referenzen
 * über Züge hinweg AUSSCHLIESSLICH via `@ref:kind:name` (s. Kopfkommentar,
 * Sanktion 9) — nie ein rohes `entityId`, das aus einem früheren Zug
 * „zurückgelesen" würde. */
interface PromptMehrzug {
  id: string;
  kategorie: 'mehrzug';
  zuege: MehrZugTurn[];
}

type Prompt =
  | PromptCommand
  | PromptAblehnung
  | PromptLaufplan
  | PromptLaufVorschlag
  | PromptLaufVorschlagAbgelehnt
  | PromptCommandFehler
  | PromptMehrzug;

interface PromptsDatei {
  adapter: string;
  beschreibung: string;
  kriterien_legende: Record<string, string>;
  prompts: Prompt[];
}

interface Befund {
  id: string;
  kategorie: string;
  ok: boolean;
  begruendung: string;
}

/**
 * Partieller Tiefenvergleich: JEDER Schlüssel/Wert aus `erwartet` muss in
 * `tatsaechlich` mit demselben Wert vorkommen — `tatsaechlich` darf
 * ZUSÄTZLICHE Schlüssel tragen (z.B. ein vom zod-Schema angewandter Default
 * wie `alignment: 'zentrum'`, den ein Prompt bewusst nicht selbst nennt).
 * Arrays müssen exakt gleich lang sein und elementweise matchen (unsere
 * Array-Felder — outline/punkte/sheetIds — sind in `prompts.json` immer
 * VOLLSTÄNDIG angegeben, kein Default ergänzt dort je ein Element).
 */
function enthaeltErwartete(erwartet: unknown, tatsaechlich: unknown): boolean {
  if (erwartet === null || typeof erwartet !== 'object') {
    return JSON.stringify(erwartet) === JSON.stringify(tatsaechlich);
  }
  if (Array.isArray(erwartet)) {
    if (!Array.isArray(tatsaechlich) || erwartet.length !== tatsaechlich.length) return false;
    return erwartet.every((e, i) => enthaeltErwartete(e, tatsaechlich[i]));
  }
  if (typeof tatsaechlich !== 'object' || tatsaechlich === null) return false;
  return Object.entries(erwartet as Record<string, unknown>).every(([k, v]) =>
    enthaeltErwartete(v, (tatsaechlich as Record<string, unknown>)[k]),
  );
}

/** E7 (v0.8.7/PA3): baut die `lauf_planen`-Schritt-Nutzlast aus einer
 * Erwartung — `begruendung` ist im echten `laufPlanSchema` Pflicht, wird vom
 * Vergleich in `werteAus` aber nicht geprüft (s. `LaufPlanSchrittErwartung`). */
function baueLaufPlanSchritte(
  schritte: LaufPlanSchrittErwartung[],
): Array<{ commandId: string; params: unknown; begruendung: string }> {
  return schritte.map((s, i) => ({
    commandId: s.commandId,
    params: s.params ?? {},
    begruendung: s.begruendung ?? `Schritt ${i + 1}: ${s.commandId}`,
  }));
}

/** E8 (v0.8.8/PA3): baut die `toolCalls` EINES Zugs aus einer Erwartungsform
 * — herausgezogen aus `skriptFuer` (vormals inline), damit sowohl ein
 * Ein-Zug-`Prompt` als auch JEDER einzelne `MehrZugTurn` (NEU) denselben Weg
 * nehmen. `command`/`command-fehler`: genau EIN Tool-Aufruf (bei
 * `command-fehler` bewusst ein Aufruf, den `validateToolCall()` ablehnen
 * SOLL — der Aufruf selbst unterscheidet sich nicht von `command`);
 * `laufplan`: MEHRERE Tool-Aufrufe IM SELBEN Zug (ein Paket/eine
 * Diff-Karten-Kette, `scripted.ts` — `SkriptZug.toolCalls`), einer je
 * erwartetem Schritt, in Sequenz; `lauf-vorschlag`/`lauf-vorschlag-abgelehnt`
 * (E7, v0.8.7/PA3): EIN Tool-Aufruf ans echte `lauf_planen`-Werkzeug, dessen
 * Argumente den GANZEN Plan tragen; `ablehnung`: KEIN Tool-Aufruf (Kosmo
 * würde nachfragen/ehrlich absagen). */
function toolCallsFuerErwartung(
  erwartung: ErwartungCommand | ErwartungAblehnung | ErwartungLaufplan | ErwartungLaufVorschlag | ErwartungLaufVorschlagAbgelehnt | ErwartungCommandFehler,
): Array<{ name: string; args: Record<string, unknown> }> {
  if (erwartung.typ === 'command' || erwartung.typ === 'command-fehler') {
    return [{ name: toolNameFor(erwartung.commandId), args: erwartung.params }];
  }
  if (erwartung.typ === 'laufplan') {
    return erwartung.schritte.map((s) => ({ name: toolNameFor(s.commandId), args: s.params ?? {} }));
  }
  if (erwartung.typ === 'lauf-vorschlag' || erwartung.typ === 'lauf-vorschlag-abgelehnt') {
    return [
      {
        name: LAUF_PLANEN_TOOL_NAME,
        args: { titel: erwartung.titel, schritte: baueLaufPlanSchritte(erwartung.schritte) },
      },
    ];
  }
  // 'ablehnung'
  return [];
}

/** Baut aus EINEM Prompt ein Skript für den ScriptedProvider — ein Ein-Zug-
 * `Prompt` (`command`/`ablehnung`/`laufplan`/`lauf-vorschlag`/
 * `lauf-vorschlag-abgelehnt`/`command-fehler`) wird zu GENAU EINEM `SkriptZug`
 * (unverändert ggü. vor E8); ein `PromptMehrzug` (E8, v0.8.8/PA3, NEU) wird
 * zu MEHREREN `SkriptZug`s, einem je `zuege`-Eintrag — die `'zuege' in p`-
 * Prüfung diskriminiert strukturell statt über `kategorie` (die bei den
 * bestehenden `Prompt*`-Formen bewusst ein loses `string` bleibt, s. o.). */
function skriptFuer(p: Prompt): SzenarioSkript {
  if ('zuege' in p) {
    return {
      id: p.id,
      zuege: p.zuege.map((z) => ({
        nutzerErwartung: z.nutzerwunsch,
        antwortText: z.kosmoText,
        toolCalls: toolCallsFuerErwartung(z.erwartung),
      })),
    };
  }
  return {
    id: p.id,
    zuege: [{ nutzerErwartung: p.nutzerwunsch, antwortText: p.kosmoText, toolCalls: toolCallsFuerErwartung(p.erwartung) }],
  };
}

/** Fährt EINEN Ein-Zug-Prompt durch die echte ChatSession (ScriptedProvider-
 * Weg, exakt das Muster aus `packages/kosmo-ai/test/scripted.test.ts`) und
 * liefert die tatsächlich gemeldeten Vorschläge + einen etwaigen Fehlertext.
 * NICHT für `PromptMehrzug` (s. `spieleAbMehrzug` unten, braucht mehrere
 * `session.send()`-Aufrufe derselben Session).
 *
 * E7 (v0.8.7/PA3) erweitert die Rückgabe um `laufVorschlaege` (der
 * `onLaufVorschlag`-Beobachter, s. Kopfkommentar) und `historie` (Session-
 * Nachrichten inkl. der `role: 'tool'`-FEHLER-Meldungen, für den
 * Negativfall). E8 (v0.8.8/PA3, ROADMAP-498): `docUnveraendert` ist jetzt ein
 * ECHTER Byte-Diff (`JSON.stringify(doc.toJSON())` vor/nach `session.send()`)
 * statt der bisherigen `revision === 0 && entities.size === 0`-Heuristik —
 * derselbe Beweis, aber ohne Kenntnis der internen `KosmoDoc`-Felder
 * vorauszusetzen (ein künftiges internes Refactoring von `revision`/
 * `entities` bräche diese Prüfung sonst still). */
async function spieleAb(p: Exclude<Prompt, PromptMehrzug>): Promise<{
  proposals: Proposal[];
  laufVorschlaege: LaufVorschlag[];
  fehler: string;
  text: string;
  historie: readonly ChatMessage[];
  docUnveraendert: boolean;
}> {
  const doc = new KosmoDoc();
  const vorher = JSON.stringify(doc.toJSON());
  const skript = skriptFuer(p);
  const provider = new ScriptedProvider(p.id, { [p.id]: skript });
  const proposals: Proposal[] = [];
  const laufVorschlaege: LaufVorschlag[] = [];
  let fehler = '';
  let text = '';
  const session = new ChatSession(provider, doc, {
    onText: (d) => (text += d),
    onProposal: (prop) => proposals.push(prop),
    onBusy: () => {},
    onError: (e) => (fehler = e),
    onLaufVorschlag: (v) => laufVorschlaege.push(v),
  });
  await session.send(p.nutzerwunsch);
  const nachher = JSON.stringify(doc.toJSON());
  return {
    proposals,
    laufVorschlaege,
    fehler,
    text,
    historie: session.history,
    docUnveraendert: vorher === nachher,
  };
}

/** E8 (v0.8.8/PA3, Mehr-Zug): prüft EINEN Zug-Ergebnis gegen seine Erwartung
 * — dieselbe Vergleichslogik wie die entsprechenden Zweige in `werteAus`
 * unten, aber wiederverwendbar je Zug eines `PromptMehrzug`. Nur
 * `command`/`ablehnung`/`laufplan` sind unterstützt (s. Kopfkommentar/
 * `MehrZugTurn`) — für alles andere wirft diese Funktion bewusst, statt still
 * eine falsche/unvollständige Prüfung vorzutäuschen. Liefert `null` bei
 * Erfolg, sonst einen Begründungstext. */
function pruefeZugErwartung(
  erwartung: MehrZugTurn['erwartung'],
  ergebnis: { proposals: Proposal[]; laufVorschlaege: LaufVorschlag[] },
): string | null {
  if (erwartung.typ === 'command') {
    if (ergebnis.proposals.length !== 1) {
      return `erwartet: genau 1 Vorschlag, erhalten: ${ergebnis.proposals.length} (zod-Validierung des erwarteten Tool-Calls ist vermutlich fehlgeschlagen)`;
    }
    const prop = ergebnis.proposals[0]!;
    if (prop.commandId !== erwartung.commandId) {
      return `erwartete commandId «${erwartung.commandId}», erhalten «${prop.commandId}»`;
    }
    if (!enthaeltErwartete(erwartung.params, prop.params)) {
      return `Parameter weichen ab — erwartet (Teilmenge): ${JSON.stringify(erwartung.params)}, erhalten: ${JSON.stringify(prop.params)}`;
    }
    return null;
  }
  if (erwartung.typ === 'ablehnung') {
    if (ergebnis.proposals.length !== 0) {
      return `erwartet: KEIN Vorschlag (Ablehn-Zug), erhalten: ${ergebnis.proposals.length} Vorschlag/Vorschläge`;
    }
    return null;
  }
  if (erwartung.typ === 'laufplan') {
    if (ergebnis.proposals.length !== erwartung.schritte.length) {
      return `erwartet: LaufPlan mit ${erwartung.schritte.length} Schritt(en), erhalten: ${ergebnis.proposals.length} Vorschlag/Vorschläge`;
    }
    for (let i = 0; i < erwartung.schritte.length; i++) {
      const erwartet = erwartung.schritte[i]!;
      const prop = ergebnis.proposals[i]!;
      if (prop.commandId !== erwartet.commandId) {
        return `Schritt ${i + 1}: erwartete commandId «${erwartet.commandId}», erhalten «${prop.commandId}» (Sequenz muss stimmen)`;
      }
      if (erwartet.params !== undefined && !enthaeltErwartete(erwartet.params, prop.params)) {
        return `Schritt ${i + 1} (${erwartet.commandId}): Parameter weichen ab — erwartet (Teilmenge): ${JSON.stringify(erwartet.params)}, erhalten: ${JSON.stringify(prop.params)}`;
      }
    }
    return null;
  }
  throw new Error(
    `Mehr-Zug-Prüfer: erwartung.typ «${erwartung.typ}» wird innerhalb eines Mehr-Zug-Turns (noch) nicht geprüft — nur command/ablehnung/laufplan sind unterstützt (s. Kopfkommentar).`,
  );
}

/** E8 (v0.8.8/PA3, Mehr-Zug): fährt einen `PromptMehrzug` als Folge ECHTER
 * `session.send()`-Aufrufe DERSELBEN `ChatSession` — jeder Zug bekommt sein
 * eigenes `{ proposals, laufVorschlaege }`-Zwischenergebnis (die globalen
 * `onProposal`/`onLaufVorschlag`-Listen werden je Zug per Index-Offset
 * aufgeteilt). **Sanktion 9 / H-37 (bindend, s. Kopfkommentar):** zwischen
 * zwei Zügen löst diese Funktion JEDEN offenen Vorschlag/LaufVorschlag des
 * GERADE gespielten Zugs auf — AUSSCHLIESSLICH damit der `ScriptedProvider`
 * seinen `zugIndex` weiterzählt (`resolveApplied`/`resolveLaufAbgelehnt`
 * hängen dafür lediglich eine `role: 'tool'`-Quittierung an; KEINER von
 * beiden führt selbst einen Kernel-Command aus, `doc.apply()` wird an KEINER
 * Stelle dieser Funktion gerufen). Der Byte-Diff (`docUnveraendert`) beweist
 * das: `doc.toJSON()` vor Zug 1 muss `doc.toJSON()` nach dem letzten Zug
 * exakt entsprechen. */
async function spieleAbMehrzug(p: PromptMehrzug): Promise<{
  turnErgebnisse: Array<{ proposals: Proposal[]; laufVorschlaege: LaufVorschlag[] }>;
  fehler: string;
  docUnveraendert: boolean;
}> {
  const doc = new KosmoDoc();
  const vorher = JSON.stringify(doc.toJSON());
  const skript = skriptFuer(p);
  const provider = new ScriptedProvider(p.id, { [p.id]: skript });
  const alleProposals: Proposal[] = [];
  const alleLaufVorschlaege: LaufVorschlag[] = [];
  let fehler = '';
  const session = new ChatSession(provider, doc, {
    onText: () => {},
    onProposal: (prop) => alleProposals.push(prop),
    onBusy: () => {},
    onError: (e) => (fehler = e),
    onLaufVorschlag: (v) => alleLaufVorschlaege.push(v),
  });

  const turnErgebnisse: Array<{ proposals: Proposal[]; laufVorschlaege: LaufVorschlag[] }> = [];
  for (const zug of p.zuege) {
    const vorProposals = alleProposals.length;
    const vorLauf = alleLaufVorschlaege.length;
    await session.send(zug.nutzerwunsch);
    const neueProposals = alleProposals.slice(vorProposals);
    const neueLauf = alleLaufVorschlaege.slice(vorLauf);
    turnErgebnisse.push({ proposals: neueProposals, laufVorschlaege: neueLauf });
    // Nur die Buchhaltung des ScriptedProviders weiterzählen (s. Funktions-
    // kommentar) — NIE ein echter Kernel-Command-Vollzug. Ein abgelehnter
    // LaufVorschlag (bekannteCommandIds-Fehler) räumt sich bereits INNERHALB
    // von `session.send()` selbst weg (kein `pendingLauf`-Eintrag entsteht),
    // taucht hier also gar nicht erst auf.
    for (const prop of neueProposals) {
      await session.resolveApplied(prop.callId, `Eval-Quittierung (kein echter Vollzug): ${prop.summary}`);
    }
    for (const lauf of neueLauf) {
      await session.resolveLaufAbgelehnt(lauf.callId, 'Eval-Quittierung (kein echter Lauf-Start)');
    }
  }

  const nachher = JSON.stringify(doc.toJSON());
  return { turnErgebnisse, fehler, docUnveraendert: vorher === nachher };
}

/** E8 (v0.8.8/PA3, Mehr-Zug): wertet EINEN `PromptMehrzug` komplett aus —
 * jeder Zug wird gegen seine eigene Erwartung geprüft (`pruefeZugErwartung`),
 * zusätzlich muss der Byte-Diff über die GESAMTE Zugfolge unverändert
 * bleiben (Sanktion 9: kein Zug führt einen Command wirklich aus). */
async function werteAusMehrzug(p: PromptMehrzug): Promise<Befund> {
  for (let i = 0; i < p.zuege.length; i++) {
    const erwartung = p.zuege[i]!.erwartung;
    const commandIds = erwartung.typ === 'command' ? [erwartung.commandId] : erwartung.typ === 'laufplan' ? erwartung.schritte.map((s) => s.commandId) : [];
    const unbekannt = commandIds.filter((id) => !TOOLNAMEN_LIVE.has(toolNameFor(id)));
    if (unbekannt.length > 0) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `Zug ${i + 1}: Werkzeug(e) ${unbekannt.map((id) => `«${toolNameFor(id)}»`).join(', ')} sind keine aktuellen Kosmo-Werkzeuge mehr`,
      };
    }
  }
  const { turnErgebnisse, fehler, docUnveraendert } = await spieleAbMehrzug(p);
  if (fehler) {
    return { id: p.id, kategorie: p.kategorie, ok: false, begruendung: `ChatSession meldete einen Fehler: ${fehler}` };
  }
  if (turnErgebnisse.length !== p.zuege.length) {
    return {
      id: p.id,
      kategorie: p.kategorie,
      ok: false,
      begruendung: `erwartet: ${p.zuege.length} gespielte Züge, erhalten: ${turnErgebnisse.length} Zug-Ergebnisse`,
    };
  }
  for (let i = 0; i < p.zuege.length; i++) {
    const fehlerText = pruefeZugErwartung(p.zuege[i]!.erwartung, turnErgebnisse[i]!);
    if (fehlerText) {
      return { id: p.id, kategorie: p.kategorie, ok: false, begruendung: `Zug ${i + 1}: ${fehlerText}` };
    }
  }
  if (!docUnveraendert) {
    return {
      id: p.id,
      kategorie: p.kategorie,
      ok: false,
      begruendung: `Doc wurde über die Mehr-Zug-Folge verändert (Byte-Diff) — kein Zug darf einen Command wirklich ausführen (Sanktion 9)`,
    };
  }
  return {
    id: p.id,
    kategorie: p.kategorie,
    ok: true,
    begruendung: `Treffer: ${p.zuege.length} Züge korrekt (@ref-Referenzen unverändert durchgereicht), Doc über die ganze Folge Byte-gleich`,
  };
}

const TOOLNAMEN_LIVE = new Set(commandTools().map((t) => t.name));

async function werteAus(p: Prompt): Promise<Befund> {
  // E8 (v0.8.8/PA3, Mehr-Zug): eigener Auswertungsweg — `PromptMehrzug` hat
  // KEIN `erwartung`-Feld (sondern `zuege`), die strukturelle `in`-Prüfung
  // diskriminiert das sauber (s. `skriptFuer`-Kommentar).
  if ('zuege' in p) return werteAusMehrzug(p);

  if (p.erwartung.typ === 'command') {
    const toolName = toolNameFor(p.erwartung.commandId);
    if (!TOOLNAMEN_LIVE.has(toolName)) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `Werkzeug «${toolName}» ist kein aktuelles Kosmo-Werkzeug mehr (commandTools() kennt es nicht — Command umbenannt/entfernt?)`,
      };
    }
    const { proposals, fehler } = await spieleAb(p);
    if (fehler) {
      return { id: p.id, kategorie: p.kategorie, ok: false, begruendung: `ChatSession meldete einen Fehler: ${fehler}` };
    }
    if (proposals.length !== 1) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `erwartet: genau 1 Vorschlag, erhalten: ${proposals.length} (zod-Validierung des erwarteten Tool-Calls ist vermutlich fehlgeschlagen — geprüft gegen das ECHTE Schema)`,
      };
    }
    const prop = proposals[0]!;
    if (prop.commandId !== p.erwartung.commandId) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `erwartete commandId «${p.erwartung.commandId}», erhalten «${prop.commandId}»`,
      };
    }
    if (!enthaeltErwartete(p.erwartung.params, prop.params)) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `Parameter weichen ab — erwartet (Teilmenge): ${JSON.stringify(p.erwartung.params)}, erhalten: ${JSON.stringify(prop.params)}`,
      };
    }
    return {
      id: p.id,
      kategorie: p.kategorie,
      ok: true,
      begruendung: `Treffer: ${p.erwartung.commandId} — 1 Vorschlag, zod-valide Parameter (${prop.summary})`,
    };
  }

  if (p.erwartung.typ === 'laufplan') {
    const unbekannt = p.erwartung.schritte.filter((s) => !TOOLNAMEN_LIVE.has(toolNameFor(s.commandId)));
    if (unbekannt.length > 0) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `Werkzeug(e) ${unbekannt.map((s) => `«${toolNameFor(s.commandId)}»`).join(', ')} sind keine aktuellen Kosmo-Werkzeuge mehr (commandTools() kennt sie nicht — Command(s) umbenannt/entfernt?)`,
      };
    }
    const { proposals, fehler } = await spieleAb(p);
    if (fehler) {
      return { id: p.id, kategorie: p.kategorie, ok: false, begruendung: `ChatSession meldete einen Fehler: ${fehler}` };
    }
    const erwarteteSchritte = p.erwartung.schritte;
    if (proposals.length !== erwarteteSchritte.length) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `erwartet: LaufPlan mit ${erwarteteSchritte.length} Schritt(en), erhalten: ${proposals.length} Vorschlag/Vorschläge (zod-Validierung eines Schritts vermutlich fehlgeschlagen — geprüft gegen das ECHTE Schema je Command)`,
      };
    }
    for (let i = 0; i < erwarteteSchritte.length; i++) {
      const erwartet = erwarteteSchritte[i]!;
      const prop = proposals[i]!;
      if (prop.commandId !== erwartet.commandId) {
        return {
          id: p.id,
          kategorie: p.kategorie,
          ok: false,
          begruendung: `Schritt ${i + 1}: erwartete commandId «${erwartet.commandId}», erhalten «${prop.commandId}» (Sequenz muss stimmen)`,
        };
      }
      if (erwartet.params !== undefined && !enthaeltErwartete(erwartet.params, prop.params)) {
        return {
          id: p.id,
          kategorie: p.kategorie,
          ok: false,
          begruendung: `Schritt ${i + 1} (${erwartet.commandId}): Parameter weichen ab — erwartet (Teilmenge): ${JSON.stringify(erwartet.params)}, erhalten: ${JSON.stringify(prop.params)}`,
        };
      }
    }
    // Ehrliche Zusatz-Kontrolle (kein separates Prüf-Kriterium, aber ein
    // starkes Indiz für "echter Plan statt zufällig gleich vieler Einzelzüge"):
    // `ChatSession#turn()` setzt bei >1 schreibendem Tool-Call im selben Zug
    // ein `paket`-Metadatum mit `groesse === schreibend.length` (chat.ts) —
    // bei genau EINEM Schritt bleibt `paket` bewusst `undefined` (kein
    // Ein-Schritt-"Paket").
    const paketOk =
      proposals.length === 1
        ? proposals[0]!.paket === undefined
        : proposals.every((pr) => pr.paket?.groesse === proposals.length);
    if (!paketOk) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `LaufPlan-Schritte kamen nicht als EINE Aktionskette an (paket-Metadatum unstimmig) — erhalten: ${JSON.stringify(proposals.map((pr) => pr.paket))}`,
      };
    }
    return {
      id: p.id,
      kategorie: p.kategorie,
      ok: true,
      begruendung: `Treffer: LaufPlan mit ${erwarteteSchritte.length} Schritt(en) (${erwarteteSchritte.map((s) => s.commandId).join(' → ')}), Sequenz + zod-valide Kernparameter, als EINE Aktionskette gemeldet`,
    };
  }

  if (p.erwartung.typ === 'lauf-vorschlag') {
    // E7 (v0.8.7/PA3): wie beim laufplan-Fall zuerst die Registry prüfen —
    // eine erfundene/umbenannte commandId im POSITIVEN Fall wäre ein Fehler
    // in prompts.json, kein Prüfziel dieses Zweigs (das prüft der eigene
    // 'lauf-vorschlag-abgelehnt'-Zweig unten).
    const unbekannt = p.erwartung.schritte.filter((s) => !TOOLNAMEN_LIVE.has(toolNameFor(s.commandId)));
    if (unbekannt.length > 0) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `Werkzeug(e) ${unbekannt.map((s) => `«${toolNameFor(s.commandId)}»`).join(', ')} sind keine aktuellen Kosmo-Werkzeuge mehr (commandTools() kennt sie nicht — Command(s) umbenannt/entfernt?)`,
      };
    }
    const { proposals, laufVorschlaege, fehler, docUnveraendert } = await spieleAb(p);
    if (fehler) {
      return { id: p.id, kategorie: p.kategorie, ok: false, begruendung: `ChatSession meldete einen Fehler: ${fehler}` };
    }
    // (a) genau EIN LaufVorschlag feuert.
    if (laufVorschlaege.length !== 1) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `erwartet: genau 1 LaufVorschlag (onLaufVorschlag), erhalten: ${laufVorschlaege.length} (zod-Validierung des lauf_planen-Aufrufs oder die bekannteCommandIds-Prüfung ist vermutlich fehlgeschlagen — geprüft gegen das ECHTE laufPlanSchema)`,
      };
    }
    // (c) KEIN onProposal feuert (Sanktion 4: Vorschlag ≠ Ausführung).
    if (proposals.length !== 0) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `Sanktion 4 verletzt: ${proposals.length} onProposal(s) feuerten zusätzlich zum LaufVorschlag — ein lauf_planen-Aufruf darf NIE als Diff-Karte/Ausführung durchgehen`,
      };
    }
    // (b) plan.titel + Schrittfolge (commandId-Sequenz + Kernparameter-Teilmenge).
    const plan = laufVorschlaege[0]!.plan;
    if (plan.titel !== p.erwartung.titel) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `erwarteter Plan-Titel «${p.erwartung.titel}», erhalten «${plan.titel}»`,
      };
    }
    if (plan.schritte.length !== p.erwartung.schritte.length) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `erwartet: ${p.erwartung.schritte.length} Plan-Schritt(e), erhalten: ${plan.schritte.length}`,
      };
    }
    for (let i = 0; i < p.erwartung.schritte.length; i++) {
      const erwartet = p.erwartung.schritte[i]!;
      const tatsaechlich = plan.schritte[i]!;
      if (tatsaechlich.commandId !== erwartet.commandId) {
        return {
          id: p.id,
          kategorie: p.kategorie,
          ok: false,
          begruendung: `Schritt ${i + 1}: erwartete commandId «${erwartet.commandId}», erhalten «${tatsaechlich.commandId}» (Sequenz muss stimmen)`,
        };
      }
      if (erwartet.params !== undefined && !enthaeltErwartete(erwartet.params, tatsaechlich.params)) {
        return {
          id: p.id,
          kategorie: p.kategorie,
          ok: false,
          begruendung: `Schritt ${i + 1} (${erwartet.commandId}): Parameter weichen ab — erwartet (Teilmenge): ${JSON.stringify(erwartet.params)}, erhalten: ${JSON.stringify(tatsaechlich.params)}`,
        };
      }
    }
    // (d) kein Command lief — der Prüfer hält selbst einen KosmoDoc (spieleAb),
    // E8 (v0.8.8/PA3, ROADMAP-498): jetzt ein echter Byte-Diff (s. spieleAb).
    if (!docUnveraendert) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `Doc wurde verändert (Byte-Diff) — ein LaufVorschlag darf NIE selbst einen Command ausführen`,
      };
    }
    return {
      id: p.id,
      kategorie: p.kategorie,
      ok: true,
      begruendung: `Treffer: LaufVorschlag «${plan.titel}» mit ${plan.schritte.length} Schritt(en) (${plan.schritte.map((s) => s.commandId).join(' → ')}), KEIN onProposal, Doc unverändert`,
    };
  }

  if (p.erwartung.typ === 'lauf-vorschlag-abgelehnt') {
    // Negativfall (E7): das Skript RUFT lauf_planen auf (anders als
    // 'ablehnung', wo das Skript gar keinen Tool-Aufruf hat) — die Ablehnung
    // passiert INNERHALB der ChatSession (bekannteCommandIds, chat.ts).
    const { proposals, laufVorschlaege, fehler, historie, docUnveraendert } = await spieleAb(p);
    if (fehler) {
      return { id: p.id, kategorie: p.kategorie, ok: false, begruendung: `ChatSession meldete einen Fehler: ${fehler}` };
    }
    if (laufVorschlaege.length !== 0) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `erwartet: KEIN LaufVorschlag (erfundene commandId muss VOR der Karte abgewiesen werden), erhalten: ${laufVorschlaege.length}`,
      };
    }
    if (proposals.length !== 0) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `erwartet: KEIN onProposal, erhalten: ${proposals.length}`,
      };
    }
    const fehlermeldungen = historie
      .filter((m) => m.role === 'tool' && m.content.startsWith('FEHLER:'))
      .map((m) => m.content)
      .join(' | ');
    if (!fehlermeldungen.includes(p.erwartung.enthaeltFehlertext)) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `erwartetes Tool-FEHLER-Fragment «${p.erwartung.enthaeltFehlertext}» nicht gefunden — tatsächliche Tool-FEHLER-Meldung(en): ${fehlermeldungen || '(keine)'}`,
      };
    }
    // E8 (v0.8.8/PA3, Negativfall Dedup): optional — je Fragment GENAU EIN
    // Vorkommen, auch wenn die erfundene commandId mehrfach im Plan steht
    // (beweist `chat.ts`s `[...new Set(unbekannt)]`-Dedup, C-12-Fund v0.8.6).
    if (p.erwartung.dedupFragmente) {
      for (const fragment of p.erwartung.dedupFragmente) {
        const vorkommen = fragment ? fehlermeldungen.split(fragment).length - 1 : 0;
        if (vorkommen !== 1) {
          return {
            id: p.id,
            kategorie: p.kategorie,
            ok: false,
            begruendung: `Dedup-Erwartung verletzt: «${fragment}» kommt ${vorkommen}× im Tool-FEHLER vor statt genau 1× — tatsächliche Meldung(en): ${fehlermeldungen}`,
          };
        }
      }
    }
    if (!docUnveraendert) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `Doc wurde verändert (Byte-Diff) — ein abgewiesener lauf_planen-Aufruf darf keinen Command ausführen`,
      };
    }
    return {
      id: p.id,
      kategorie: p.kategorie,
      ok: true,
      begruendung: `Treffer: erfundene commandId(s) korrekt VOR jeder Karte abgewiesen (Tool-FEHLER enthält «${p.erwartung.enthaeltFehlertext}»${p.erwartung.dedupFragmente ? `, dedupliziert: ${p.erwartung.dedupFragmente.join(', ')}` : ''}), kein LaufVorschlag, kein onProposal`,
    };
  }

  if (p.erwartung.typ === 'command-fehler') {
    // E8 (v0.8.8/PA3, Negativfall E2-Anker): ECHTER Tool-Aufruf, den
    // `validateToolCall()` ablehnen MUSS, bevor er zur Diff-Karte wird — s.
    // Kopfkommentar für den ehrlichen PA1-Nachführungs-Vermerk.
    const toolName = toolNameFor(p.erwartung.commandId);
    if (!TOOLNAMEN_LIVE.has(toolName)) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `Werkzeug «${toolName}» ist kein aktuelles Kosmo-Werkzeug mehr (commandTools() kennt es nicht — Command umbenannt/entfernt?)`,
      };
    }
    const { proposals, fehler, historie, docUnveraendert } = await spieleAb(p);
    if (fehler) {
      return { id: p.id, kategorie: p.kategorie, ok: false, begruendung: `ChatSession meldete einen Fehler: ${fehler}` };
    }
    if (proposals.length !== 0) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `erwartet: KEIN onProposal (der Aufruf soll VOR der Karte scheitern), erhalten: ${proposals.length}`,
      };
    }
    const fehlermeldungen = historie
      .filter((m) => m.role === 'tool' && m.content.startsWith('FEHLER:'))
      .map((m) => m.content)
      .join(' | ');
    if (!fehlermeldungen.includes(p.erwartung.enthaeltFehlertext)) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `erwartetes Tool-FEHLER-Fragment «${p.erwartung.enthaeltFehlertext}» nicht gefunden — tatsächliche Tool-FEHLER-Meldung(en): ${fehlermeldungen || '(keine)'}`,
      };
    }
    if (!docUnveraendert) {
      return {
        id: p.id,
        kategorie: p.kategorie,
        ok: false,
        begruendung: `Doc wurde verändert (Byte-Diff) — ein abgelehnter Tool-Aufruf darf keinen Command ausführen`,
      };
    }
    return {
      id: p.id,
      kategorie: p.kategorie,
      ok: true,
      begruendung: `Treffer: Aufruf korrekt VOR jeder Karte abgewiesen (Tool-FEHLER enthält «${p.erwartung.enthaeltFehlertext}»), kein onProposal, Doc unverändert`,
    };
  }

  // Ablehn-Fall: Skript hat KEINEN Tool-Aufruf — ChatSession darf NULL
  // Vorschläge melden (der reale `toolCalls.length === 0`-Zweig in `turn()`).
  const { proposals, fehler } = await spieleAb(p);
  if (fehler) {
    return { id: p.id, kategorie: p.kategorie, ok: false, begruendung: `ChatSession meldete einen Fehler: ${fehler}` };
  }
  if (proposals.length !== 0) {
    return {
      id: p.id,
      kategorie: p.kategorie,
      ok: false,
      begruendung: `erwartet: KEIN Vorschlag (Ablehn-Fall), erhalten: ${proposals.length} Vorschlag/Vorschläge`,
    };
  }
  return { id: p.id, kategorie: p.kategorie, ok: true, begruendung: 'Treffer: kein Tool-Aufruf, wie bei einer ehrlichen Rückfrage/Absage erwartet' };
}

// ── Hauptlauf ──────────────────────────────────────────────────────────────

const datei = JSON.parse(readFileSync(resolve(HIER, 'prompts.json'), 'utf8')) as PromptsDatei;

const befunde: Befund[] = [];
for (const p of datei.prompts) {
  befunde.push(await werteAus(p));
}

console.log(`Eval-Suite ${datei.adapter} — Modus: Selbstcheck (ScriptedProvider durch die echte ChatSession)\n`);
let nOk = 0;
for (const b of befunde) {
  console.log(`${b.ok ? 'OK  ' : 'FAIL'}  ${b.id.padEnd(34)} ${b.begruendung}`);
  if (b.ok) nOk++;
}

// Quote je Kategorie (Reihenfolge = erstes Auftreten in prompts.json).
const kategorien: string[] = [];
for (const p of datei.prompts) if (!kategorien.includes(p.kategorie)) kategorien.push(p.kategorie);
const klassen = kategorien.map((k) => {
  const zeilen = befunde.filter((b) => b.kategorie === k);
  return { kategorie: k, bestanden: zeilen.filter((b) => b.ok).length, von: zeilen.length };
});

console.log('\nQuote je Klasse:');
for (const k of klassen) {
  console.log(`  ${k.kategorie.padEnd(12)} ${k.bestanden}/${k.von}`);
}
console.log(`\n${nOk}/${befunde.length} bestanden.`);

// eval-ergebnis.json — eingecheckt, deterministisch (kein Date.now im
// Ergebnispfad ausser dem reinen Zeitstempel-Feld `erzeugt_um` — Pass/Fail
// selbst hängt an keiner Uhrzeit).
const ergebnis = {
  adapter: datei.adapter,
  modus: 'Selbstcheck (ScriptedProvider durch die echte ChatSession)',
  erzeugt_um: new Date().toISOString(),
  gesamt: { bestanden: nOk, von: befunde.length },
  klassen,
  befunde,
};
writeFileSync(resolve(HIER, 'eval-ergebnis.json'), JSON.stringify(ergebnis, null, 2) + '\n', 'utf8');
console.log(`\neval-ergebnis.json geschrieben (${resolve(HIER, 'eval-ergebnis.json')}).`);

process.exit(nOk === befunde.length ? 0 : 1);
