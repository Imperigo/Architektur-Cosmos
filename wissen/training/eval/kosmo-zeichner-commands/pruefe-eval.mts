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
  ScriptedProvider,
  commandTools,
  toolNameFor,
  type Proposal,
  type SzenarioSkript,
} from '../../../../kosmo-orbit/packages/kosmo-ai/src/index';

const HIER = dirname(fileURLToPath(import.meta.url));

interface PromptCommand {
  id: string;
  kategorie: string;
  nutzerwunsch: string;
  kosmoText: string;
  erwartung: { typ: 'command'; commandId: string; params: Record<string, unknown> };
}

interface PromptAblehnung {
  id: string;
  kategorie: 'ablehnung';
  nutzerwunsch: string;
  kosmoText: string;
  erwartung: { typ: 'ablehnung' };
}

/** EIN erwarteter Schritt eines LaufPlans — `params` optional (ein Schritt
 * ohne genannte Parameter gilt als bestanden, sobald die commandId + die
 * Position in der Sequenz stimmen; Teilmengen-Vergleich wie beim Ein-Zug-Fall). */
interface LaufPlanSchrittErwartung {
  commandId: string;
  params?: Record<string, unknown>;
}

/** E8 (v0.8.6/PA4, D9): eine ganze Schritt-Folge statt eines einzelnen
 * Tool-Aufrufs — s. Kopfkommentar für die Grenze ggü. dem `lauf_planen`-Weg (E4). */
interface PromptLaufplan {
  id: string;
  kategorie: 'laufplan';
  nutzerwunsch: string;
  kosmoText: string;
  erwartung: { typ: 'laufplan'; schritte: LaufPlanSchrittErwartung[] };
}

type Prompt = PromptCommand | PromptAblehnung | PromptLaufplan;

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

/** Baut aus EINEM Prompt ein Ein-Zug-Skript für den ScriptedProvider —
 * `command`: genau EIN Tool-Aufruf (die erwartete commandId/Parameter);
 * `laufplan`: MEHRERE Tool-Aufrufe IM SELBEN Zug (ein Paket/eine
 * Diff-Karten-Kette, `scripted.ts` — `SkriptZug.toolCalls`), einer je
 * erwartetem Schritt, in Sequenz; `ablehnung`: KEIN Tool-Aufruf (Kosmo würde
 * nachfragen/ehrlich absagen). */
function skriptFuer(p: Prompt): SzenarioSkript {
  let toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
  if (p.erwartung.typ === 'command') {
    toolCalls = [{ name: toolNameFor(p.erwartung.commandId), args: p.erwartung.params }];
  } else if (p.erwartung.typ === 'laufplan') {
    toolCalls = p.erwartung.schritte.map((s) => ({ name: toolNameFor(s.commandId), args: s.params ?? {} }));
  } else {
    toolCalls = [];
  }
  return {
    id: p.id,
    zuege: [{ nutzerErwartung: p.nutzerwunsch, antwortText: p.kosmoText, toolCalls }],
  };
}

/** Fährt EINEN Prompt durch die echte ChatSession (ScriptedProvider-Weg,
 * exakt das Muster aus `packages/kosmo-ai/test/scripted.test.ts`) und liefert
 * die tatsächlich gemeldeten Vorschläge + einen etwaigen Fehlertext. */
async function spieleAb(p: Prompt): Promise<{ proposals: Proposal[]; fehler: string; text: string }> {
  const doc = new KosmoDoc();
  const skript = skriptFuer(p);
  const provider = new ScriptedProvider(p.id, { [p.id]: skript });
  const proposals: Proposal[] = [];
  let fehler = '';
  let text = '';
  const session = new ChatSession(provider, doc, {
    onText: (d) => (text += d),
    onProposal: (prop) => proposals.push(prop),
    onBusy: () => {},
    onError: (e) => (fehler = e),
  });
  await session.send(p.nutzerwunsch);
  return { proposals, fehler, text };
}

const TOOLNAMEN_LIVE = new Set(commandTools().map((t) => t.name));

async function werteAus(p: Prompt): Promise<Befund> {
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
