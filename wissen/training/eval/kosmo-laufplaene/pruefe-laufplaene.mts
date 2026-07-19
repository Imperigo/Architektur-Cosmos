#!/usr/bin/env -S npx tsx
/**
 * Prüfer für die Kosmo-Läufe (`LaufPlan`-Drehbücher) unter
 * `wissen/training/eval/kosmo-laufplaene/` (v0.8.5/PB2, `docs/V085-SPEZ.md`
 * §3 E4, C-11/C-12). Vorbild: `../kosmo-zeichner-commands/pruefe-eval.mts`,
 * aber ANDERS: dort wird ein Ein-Zug-«Nutzerwunsch → Tool-Call» geprüft,
 * hier ein ganzer mehrschrittiger `LaufPlan` gegen das reale PA3-Fundament.
 *
 * Drei Prüfungen je Drehbuch, alle drei müssen bestehen:
 *   1. `pruefeLaufPlan()` (`@kosmo/ai`, `lauf-plan.ts`) — strukturell valide
 *      (Titel/Schritte/commandId/begruendung, dasselbe Schema, das
 *      `window.__kosmoLauf.starte()` zur Laufzeit auch sähe).
 *   2. JEDE `commandId` ist ein reales, aktuelles Kernel-Command
 *      (`getCommand()`/`allCommands()` aus `@kosmo/kernel`) — KEINE
 *      erfundene Id (Sanktion 3 des PB2-Auftrags).
 *   3. Der Plan läuft TATSÄCHLICH gegen einen frischen, leeren `KosmoDoc`
 *      durch (`execute()`, derselbe Weg wie `runCommand` in der App) —
 *      inklusive Auflösung der `@ref:...`-Platzhalter (README.md
 *      «Platzhalter-Konvention» — nötig, weil `LaufPlan`-Parameter
 *      statisch sind, IDs aber erst zur Laufzeit entstehen, `model/ids.ts`).
 *      Am Ende prüft je Drehbuch eine kleine, ehrliche Kennzahl-Assertion
 *      (z.B. 4 Wände + 1 Zone im Doc), damit ein leise falsch verdrahteter
 *      Schritt (z.B. eine vertauschte Ecke) nicht nur "lief ohne Fehler"
 *      zählt, sondern auch strukturell das Erwartete erzeugt hat.
 *
 * Exit-Code 0 nur wenn ALLE drei Drehbücher bestehen, sonst 1 mit einer
 * Fehlertabelle.
 *
 * Aufruf:
 *   cd kosmo-orbit
 *   npx tsx ../wissen/training/eval/kosmo-laufplaene/pruefe-laufplaene.mts
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Relativer Import statt `@kosmo/*` — dieselbe Begründung wie im Vorbild
// `../kosmo-zeichner-commands/pruefe-eval.mts`: diese Datei liegt unter
// `wissen/` (Geschwisterverzeichnis von `kosmo-orbit/`, kein npm-Workspace-
// Mitglied). Modulauflösung von `@kosmo/kernel` innerhalb der importierten
// Quelldateien folgt deren eigenem Ablageort, nicht dem dieses Skripts.
import { KosmoDoc, allCommands, execute, getCommand, type Entity } from '../../../../kosmo-orbit/packages/kosmo-kernel/src/index';
import { pruefeLaufPlan, type LaufPlan } from '../../../../kosmo-orbit/packages/kosmo-ai/src/index';

const HIER = dirname(fileURLToPath(import.meta.url));

interface Drehbuch {
  datei: string;
  /** Ehrliche Kennzahl-Assertion NACH vollständigem Durchlauf — wirft bei Abweichung. */
  pruefeErgebnis: (doc: KosmoDoc) => void;
}

// ── Platzhalter-Auflösung (README.md «Platzhalter-Konvention») ─────────────
// Reine Prüf-/Testcode-Logik, KEIN Runner-/Kernel-Umbau — s. README.md.

interface NamedEntityArtig {
  id: string;
  name?: string;
  nodes?: { id: string; typ: string }[];
}

function alleVomKind(doc: KosmoDoc, kind: string): NamedEntityArtig[] {
  return doc.byKind(kind as Entity['kind']) as unknown as NamedEntityArtig[];
}

function findeEindeutig(doc: KosmoDoc, kind: string, name: string): NamedEntityArtig {
  const treffer = alleVomKind(doc, kind).filter((e) => e.name === name);
  if (treffer.length === 0) {
    throw new Error(`@ref:${kind}:${name} — keine Entity dieses Namens im Doc gefunden`);
  }
  if (treffer.length > 1) {
    throw new Error(`@ref:${kind}:${name} — Name ist NICHT eindeutig (${treffer.length} Treffer)`);
  }
  return treffer[0]!;
}

function loeseWertAuf(wert: unknown, doc: KosmoDoc): unknown {
  if (typeof wert === 'string' && wert.startsWith('@ref:')) {
    const rumpf = wert.slice('@ref:'.length);
    const [kindRoh, ...rest] = rumpf.split(':');
    if (kindRoh === 'node') {
      const [graphName, typ] = rest;
      if (!graphName || !typ) throw new Error(`Ungültiger @ref:node-Platzhalter: ${wert}`);
      const graph = findeEindeutig(doc, 'visgraph', graphName);
      const node = (graph.nodes ?? []).find((n) => n.typ === typ);
      if (!node) throw new Error(`@ref:node:${graphName}:${typ} — kein Node dieses Typs im Graphen`);
      return node.id;
    }
    const kindKarte: Record<string, string> = { storey: 'storey', aufbau: 'assembly', sheet: 'sheet', graph: 'visgraph' };
    const kind = kindKarte[kindRoh ?? ''];
    const name = rest.join(':');
    if (!kind || !name) throw new Error(`Unbekannter/unvollständiger Platzhalter: ${wert}`);
    return findeEindeutig(doc, kind, name).id;
  }
  if (Array.isArray(wert)) return wert.map((w) => loeseWertAuf(w, doc));
  if (wert !== null && typeof wert === 'object') {
    return Object.fromEntries(Object.entries(wert as Record<string, unknown>).map(([k, v]) => [k, loeseWertAuf(v, doc)]));
  }
  return wert;
}

function fuehrePlanAus(plan: LaufPlan): KosmoDoc {
  const doc = new KosmoDoc();
  for (const schritt of plan.schritte) {
    const params = loeseWertAuf(schritt.params, doc);
    execute(doc, schritt.commandId, params, { actor: 'kosmodev' });
  }
  return doc;
}

// ── Die drei Drehbücher ──────────────────────────────────────────────────

const drehbuecher: Drehbuch[] = [
  {
    datei: 'grundriss-rohbau.json',
    pruefeErgebnis: (doc) => {
      const storeys = doc.byKind('storey');
      const waende = doc.byKind('wall');
      const zonen = doc.byKind('zone');
      if (storeys.length !== 1) throw new Error(`erwartet 1 Geschoss, gefunden ${storeys.length}`);
      if (waende.length !== 4) throw new Error(`erwartet 4 Wände, gefunden ${waende.length}`);
      if (zonen.length !== 1) throw new Error(`erwartet 1 Zone, gefunden ${zonen.length}`);
    },
  },
  {
    datei: 'vis-demolauf.json',
    pruefeErgebnis: (doc) => {
      const graphen = alleVomKind(doc, 'visgraph');
      if (graphen.length !== 1) throw new Error(`erwartet 1 Render-Graph, gefunden ${graphen.length}`);
      const graph = graphen[0]!;
      if ((graph.nodes ?? []).length !== 6) throw new Error(`erwartet 6 Nodes, gefunden ${(graph.nodes ?? []).length}`);
      const wunsch = doc.settings.visRenderAuftrag;
      if (!wunsch) throw new Error('visRenderAuftrag wurde nicht gesetzt');
      if (wunsch.stimmungPreset !== 'abend') throw new Error(`erwartet stimmungPreset «abend», gefunden «${wunsch.stimmungPreset}»`);
      if (wunsch.backbone !== 'flux2-klein') throw new Error(`erwartet backbone «flux2-klein», gefunden «${wunsch.backbone}»`);
    },
  },
  {
    datei: 'publish-blatt.json',
    pruefeErgebnis: (doc) => {
      const blaetter = doc.byKind('sheet') as { placements: unknown[] }[];
      if (blaetter.length !== 1) throw new Error(`erwartet 1 Blatt, gefunden ${blaetter.length}`);
      if (blaetter[0]!.placements.length !== 2) throw new Error(`erwartet 2 Ansichten, gefunden ${blaetter[0]!.placements.length}`);
    },
  },
];

interface Befund {
  datei: string;
  ok: boolean;
  begruendung: string;
}

const commandIndex = new Set(allCommands().map((c) => c.id));

function pruefeDrehbuch(d: Drehbuch): Befund {
  const roh = JSON.parse(readFileSync(resolve(HIER, d.datei), 'utf8'));

  const ergebnis = pruefeLaufPlan(roh);
  if (!ergebnis.ok) {
    return { datei: d.datei, ok: false, begruendung: `pruefeLaufPlan lehnt ab: ${ergebnis.error}` };
  }
  const plan = ergebnis.plan;

  const unbekannt = plan.schritte.map((s) => s.commandId).filter((id) => !commandIndex.has(id) && !getCommand(id));
  if (unbekannt.length > 0) {
    return {
      datei: d.datei,
      ok: false,
      begruendung: `unbekannte commandId(s) — kein reales Kernel-Command: ${[...new Set(unbekannt)].join(', ')}`,
    };
  }

  try {
    const doc = fuehrePlanAus(plan);
    d.pruefeErgebnis(doc);
  } catch (err) {
    const meldung = err instanceof Error ? err.message : String(err);
    return { datei: d.datei, ok: false, begruendung: `Ausführung/Ergebnis-Prüfung fehlgeschlagen: ${meldung}` };
  }

  return {
    datei: d.datei,
    ok: true,
    begruendung: `«${plan.titel}» — ${plan.schritte.length} Schritte, alle commandIds real, vollständig gegen einen frischen KosmoDoc durchgelaufen, Ergebnis-Kennzahl bestätigt`,
  };
}

console.log('Kosmo-Läufe — Prüfung der 3 Drehbücher (LaufPlan + reale Command-Registry + Ausführung)\n');

const befunde = drehbuecher.map(pruefeDrehbuch);
let nOk = 0;
for (const b of befunde) {
  console.log(`${b.ok ? 'OK  ' : 'FAIL'}  ${b.datei.padEnd(28)} ${b.begruendung}`);
  if (b.ok) nOk++;
}
console.log(`\n${nOk}/${befunde.length} Drehbücher bestanden.`);

process.exit(nOk === befunde.length ? 0 : 1);
