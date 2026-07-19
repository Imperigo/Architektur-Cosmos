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
// Mitglied). Modulauflösung von `@kosmo/kernel`/`@kosmo/ai` innerhalb der
// importierten Quelldateien folgt deren eigenem Ablageort, nicht dem dieses
// Skripts.
import { KosmoDoc, allCommands, execute, getCommand, type Entity } from '../../../../kosmo-orbit/packages/kosmo-kernel/src/index';
import { loeseLaufPlanRefs, pruefeLaufPlan, type LaufPlan } from '../../../../kosmo-orbit/packages/kosmo-ai/src/index';

const HIER = dirname(fileURLToPath(import.meta.url));

interface Drehbuch {
  datei: string;
  /** Ehrliche Kennzahl-Assertion NACH vollständigem Durchlauf — wirft bei Abweichung. */
  pruefeErgebnis: (doc: KosmoDoc) => void;
}

interface NamedEntityArtig {
  id: string;
  name?: string;
  nodes?: { id: string; typ: string }[];
}

/** Nur für die `pruefeErgebnis`-Assertionen unten (kein Ref-Bezug) —
 * die eigentliche @ref-Platzhalter-Auflösung lebt jetzt in `@kosmo/ai`
 * (`loeseLaufPlanRefs`, v0.8.6/PB1 E4: «eine Wahrheit», s. dortiger
 * Kopfkommentar). */
function alleVomKind(doc: KosmoDoc, kind: string): NamedEntityArtig[] {
  return doc.byKind(kind as Entity['kind']) as unknown as NamedEntityArtig[];
}

/**
 * v0.8.6/PB1 (E4, `docs/V086-SPEZ.md` §3): die @ref-Auflösung selbst kommt
 * jetzt aus `@kosmo/ai#loeseLaufPlanRefs` — PROGRESSIV, JE SCHRITT frisch
 * gegen den bereits fortgeschrittenen `doc` aufgerufen (ein Ein-Schritt-
 * „Plan" je Schleifendurchlauf), weil die drei Drehbücher hier bewusst
 * SELBSTSTÄNDIG lauffähig sind (spätere Schritte referenzieren Entities, die
 * frühere Schritte DESSELBEN Laufs gerade erst erzeugt haben) — unverändertes
 * Verhalten gegenüber der vormals hier lokalen `loeseWertAuf`/
 * `findeEindeutig`-Kopie, s. `@kosmo/ai/src/lauf-refs.ts`-Kopfkommentar.
 */
function fuehrePlanAus(plan: LaufPlan): KosmoDoc {
  const doc = new KosmoDoc();
  for (const schritt of plan.schritte) {
    const aufgeloest = loeseLaufPlanRefs({ titel: plan.titel, schritte: [schritt] }, doc).schritte[0]!;
    execute(doc, aufgeloest.commandId, aufgeloest.params, { actor: 'kosmodev' });
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
