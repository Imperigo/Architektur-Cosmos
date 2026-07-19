// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { History, KosmoDoc } from '@kosmo/kernel';
import { useProject } from '../src/state/project-store';
import { useLaufRuntime } from '../src/state/lauf-runtime';
import type { LaufPlan } from '@kosmo/ai';

/**
 * v0.8.5 PA3 «Autopilot-Kern» (`docs/V085-SPEZ.md` §3 E4, C-8/C-9/C-10) —
 * `lauf-runtime.ts` gegen den ECHTEN `useProject`-Store (kein Mock von
 * `runCommand`): jeder Test prüft, dass ein Lauf tatsächlich über
 * `runCommand` ins Doc schreibt (Sanktion 3 V085-SPEZ §6) und dass jeder
 * Schritt eine EIGENE Undo-Gruppe hinterlässt (E4).
 *
 * v0.8.8 PA5 «Autopilot-Fortsetzung + Runner-Härtung» (`docs/V088-SPEZ.md`
 * §2 D4, §3 E4) — die Flake-URSACHE dieser Datei war der Doppel-Start-Test
 * unten («ein zweiter starte()-Aufruf waehrend "laeuft" wird ignoriert»):
 * er awaitete nicht, die geleckten Makrotask-Schritte seines Runners liefen
 * im Hintergrund weiter und konnten in Docs SPÄTERER Tests DIESER Datei
 * schreiben (Vitest isoliert nur DATEIÜBERGREIFEND, nicht innerhalb einer
 * Datei). Der `afterEach`-Drain unten (abbrechen + zuruecksetzen + mehrfach
 * `warten(0)`) räumt das nach JEDEM Test auf — und der neue Generations-
 * Guard in `lauf-runtime.ts` sorgt zusätzlich dafür, dass ein bereits
 * abgelöster Runner selbst OHNE Drain nichts mehr schreiben könnte (s. die
 * eigene Testgruppe «Generations-Guard» weiter unten).
 */

function frischesDoc(): void {
  useProject.setState({
    doc: new KosmoDoc(),
    history: new History(),
    journal: [],
    revision: 0,
    activeStoreyId: null,
    selection: [],
    meshEditId: null,
  });
}

beforeEach(() => {
  frischesDoc();
  useLaufRuntime.getState().zuruecksetzen();
});

afterEach(async () => {
  // Härtung (D4/C-7): egal was der Test angestossen hat — abbrechen() stoppt
  // jeden noch offenen Runner VOR dessen nächstem Schritt, zuruecksetzen()
  // erhöht die Generation (macht jeden verbliebenen Callback zum No-Op), und
  // die mehrfachen `warten(0)` lassen alle noch schwebenden Makrotasks
  // (Yield-Ketten, D4-Leck-Muster) vollständig abklingen, BEVOR der nächste
  // Test beginnt.
  useLaufRuntime.getState().abbrechen();
  useLaufRuntime.getState().zuruecksetzen();
  for (let i = 0; i < 20; i++) {
    await warten(0);
  }
});

function warten(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * v0.8.8 PA5 (Testdatei-Härtung, D4/C-7) — pollt statt eine FESTE Dauer zu
 * schlafen: wartet, bis `status` nicht mehr `'laeuft'` ist (also einen der
 * vier Endzustände erreicht hat). Ein festes `warten(10)` reichte unter
 * CPU-Last (paralleler Workspace-Testlauf) gelegentlich NICHT — jeder
 * Schritt braucht einen echten Macrotask-Yield UND einen echten
 * `runCommand`-Aufruf, und unter Last dauert ein `setTimeout(0)` manchmal
 * länger als die fest verdrahteten 10ms. Bricht nach `timeoutMs` ehrlich
 * mit einem Fehler ab (kein endloses Hängen bei einem echten Bug) statt
 * einen falschen Zwischenzustand ('laeuft') als Testergebnis durchzulassen.
 */
async function wartenBisFertig(timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (useLaufRuntime.getState().status === 'laeuft') {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`wartenBisFertig(): Lauf steht nach ${timeoutMs}ms immer noch auf 'laeuft'.`);
    }
    await warten(5);
  }
}

function geschossPlan(anzahl: number): LaufPlan {
  return {
    titel: 'Geschosse anlegen',
    schritte: Array.from({ length: anzahl }, (_, i) => ({
      commandId: 'design.geschossErstellen',
      params: { name: `Geschoss ${i}`, index: i, elevation: i * 3000 },
      begruendung: `Geschoss ${i} für den Rohbau`,
    })),
  };
}

describe('lauf-runtime — C-10: kein Auto-Start', () => {
  it('der Store ist ohne jeden Aufruf leer — Import allein legt keinen Lauf an', () => {
    expect(useLaufRuntime.getState().plan).toBeNull();
    expect(useLaufRuntime.getState().schritte).toEqual([]);
    expect(useLaufRuntime.getState().status).toBe('offen');
  });
});

describe('lauf-runtime — starte() Happy Path (echter runCommand-Weg)', () => {
  it('führt alle Schritte über runCommand aus und schreibt wirklich ins Doc', async () => {
    useLaufRuntime.getState().starte(geschossPlan(2));
    await wartenBisFertig();

    const state = useLaufRuntime.getState();
    expect(state.status).toBe('fertig');
    expect(state.schritte.map((s) => s.status)).toEqual(['ok', 'ok']);
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(2);
  });

  it('jeder Schritt hinterlässt eine EIGENE Undo-Gruppe (nicht eine gemeinsame)', async () => {
    useLaufRuntime.getState().starte(geschossPlan(3));
    await wartenBisFertig();

    expect(useProject.getState().history.depth).toBe(3);
    // Undo nur EINES Schritts rollt nur EIN Geschoss zurück.
    useProject.getState().undo();
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(2);
    useProject.getState().undo();
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(1);
    useProject.getState().undo();
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(0);
  });

  it('journalt jeden Schritt mit actor "kosmo"', async () => {
    useLaufRuntime.getState().starte(geschossPlan(1));
    await wartenBisFertig();
    const letzter = useProject.getState().journal.at(-1);
    expect(letzter?.actor).toBe('kosmo');
    expect(letzter?.commandId).toBe('design.geschossErstellen');
  });
});

describe('lauf-runtime — Fehler-Stopp (E4: ehrlich, kein Weiterlaufen)', () => {
  it('stoppt beim ungültigen Schritt, Rest bleibt offen, kein Geist-Undo-Eintrag', async () => {
    const plan: LaufPlan = {
      titel: 'Fehlerhafter Lauf',
      schritte: [
        { commandId: 'design.geschossErstellen', params: { name: 'EG', index: 0, elevation: 0 }, begruendung: 'EG zuerst' },
        // elevation fehlt bewusst — zod lehnt ab, execute() wirft CommandError.
        { commandId: 'design.geschossErstellen', params: { name: 'Kaputt', index: 1 }, begruendung: 'absichtlich ungültig' },
        { commandId: 'design.geschossErstellen', params: { name: '2.OG', index: 2, elevation: 6000 }, begruendung: 'wird nie erreicht' },
      ],
    };
    useLaufRuntime.getState().starte(plan);
    await wartenBisFertig();

    const state = useLaufRuntime.getState();
    expect(state.status).toBe('fehler');
    expect(state.schritte[0]?.status).toBe('ok');
    expect(state.schritte[1]?.status).toBe('fehler');
    expect(state.schritte[1]?.fehler).toBeTruthy();
    expect(state.schritte[2]?.status).toBe('offen');
    // Nur Schritt 1 schrieb ins Doc — Schritt 3 lief NIE.
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(1);
    // Der gescheiterte Schritt hinterlässt KEINE leere Undo-Gruppe.
    expect(useProject.getState().history.depth).toBe(1);
  });
});

describe('lauf-runtime — Abbruch', () => {
  it('abbrechen() waehrend des Laufs stoppt vor dem nächsten Schritt (C-11-Yield: sync-Abbruch greift vor Schritt 0)', async () => {
    useLaufRuntime.getState().starte(geschossPlan(3));
    // Seit dem C-11-Fix (v0.8.6, Macrotask-Yield VOR jedem Schritt in
    // `lauf-runner.ts`) hat bei einem SYNCHRONEN Abbruch direkt nach
    // starte() noch KEIN Schritt ausgeführt — das Doc bleibt unberührt.
    // (Der Abbruch mitten im Lauf, nach echten Schritten, ist im
    // Runner-Unit-Test «C-11 … echtes Zeitfenster» und im E2E-Klick-Test
    // `autopilot-kern.spec.ts` bewiesen.)
    useLaufRuntime.getState().abbrechen();
    await wartenBisFertig();

    const state = useLaufRuntime.getState();
    expect(state.status).toBe('abgebrochen');
    expect(state.schritte[0]?.status).toBe('offen');
    expect(state.schritte[1]?.status).toBe('offen');
    expect(state.schritte[2]?.status).toBe('offen');
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(0);
    expect(useProject.getState().history.depth).toBe(0);
  });

  it('abbrechen() ohne aktiven Lauf ist ein No-Op', () => {
    expect(() => useLaufRuntime.getState().abbrechen()).not.toThrow();
    expect(useLaufRuntime.getState().status).toBe('offen');
  });
});

describe('lauf-runtime — Doppel-Start-Schutz', () => {
  it('ein zweiter starte()-Aufruf waehrend "laeuft" wird ignoriert', async () => {
    useLaufRuntime.getState().starte(geschossPlan(3));
    // Synchron NOCH VOR dem ersten Resume (Status ist jetzt entweder 'laeuft'
    // oder direkt schon fortgeschritten) — ein zweiter starte()-Aufruf mit
    // einem KOMPLETT anderen Plan darf den ersten laufenden Lauf nicht
    // ersetzen.
    const ersterPlan = useLaufRuntime.getState().plan;
    useLaufRuntime.getState().starte(geschossPlan(1));
    expect(useLaufRuntime.getState().plan).toBe(ersterPlan);

    // D4-Härtung (v0.8.8): dieser Test war früher die FLAKE-URSACHE — beide
    // `starte()`-Aufrufe oben stossen eine schwebende Makrotask-Yield-Kette
    // an, die (unawaited) über das Testende hinaus weiterlief und in Docs
    // SPÄTERER Tests derselben Datei schrieb. Jetzt sauber abgeschlossen,
    // BEVOR der Test endet — zusätzlich zum globalen `afterEach`-Drain.
    await wartenBisFertig();
    expect(useLaufRuntime.getState().status).toBe('fertig');
  });
});

describe('lauf-runtime — zuruecksetzen()', () => {
  it('räumt den Store nach einem abgeschlossenen Lauf auf', async () => {
    useLaufRuntime.getState().starte(geschossPlan(1));
    await wartenBisFertig();
    useLaufRuntime.getState().zuruecksetzen();

    const state = useLaufRuntime.getState();
    expect(state.plan).toBeNull();
    expect(state.schritte).toEqual([]);
    expect(state.status).toBe('offen');
    expect(state.runner).toBeNull();
  });
});

describe('lauf-runtime — @ref-Auflösung VOR dem Runner (E4/C-13, `docs/V086-SPEZ.md` §3)', () => {
  it('löst @ref:storey:<name> gegen eine Entity auf, die ein FRÜHERER Schritt DESSELBEN Laufs gerade erst erzeugt hat', async () => {
    // Selbst-referenzierender Plan — exakt das Muster der drei kuratierten
    // Bibliotheks-Drehbücher (`wissen/training/eval/kosmo-laufplaene/
    // grundriss-rohbau.json`): Schritt 2 referenziert das in Schritt 1
    // erzeugte Geschoss über `@ref:storey:<name>`, dessen ID erst zur
    // Laufzeit entsteht.
    const plan: LaufPlan = {
      titel: 'Selbst-referenzierender Lauf',
      schritte: [
        {
          commandId: 'design.geschossErstellen',
          params: { name: 'Rohbau EG', index: 0, elevation: 0, height: 3000 },
          begruendung: 'Erst das Geschoss.',
        },
        {
          commandId: 'design.zoneErstellen',
          params: {
            storeyId: '@ref:storey:Rohbau EG',
            outline: [
              { x: 0, y: 0 },
              { x: 4000, y: 0 },
              { x: 4000, y: 4000 },
              { x: 0, y: 4000 },
            ],
            name: 'Zone A',
          },
          begruendung: 'Zone im gerade erzeugten Geschoss.',
        },
      ],
    };
    useLaufRuntime.getState().starte(plan);
    await wartenBisFertig();

    const state = useLaufRuntime.getState();
    expect(state.status).toBe('fertig');
    expect(state.schritte.map((s) => s.status)).toEqual(['ok', 'ok']);
    const storeys = useProject.getState().doc.byKind('storey');
    const zonen = useProject.getState().doc.byKind('zone') as { storeyId: string }[];
    expect(storeys).toHaveLength(1);
    expect(zonen).toHaveLength(1);
    expect(zonen[0]!.storeyId).toBe(storeys[0]!.id);
  });

  it('ein Plan mit einer unbekannten @ref-Referenz stoppt ehrlich mit einem verständlichen Fehler (kein stiller Absturz)', async () => {
    const plan: LaufPlan = {
      titel: 'Kaputte Referenz',
      schritte: [
        {
          commandId: 'design.zoneErstellen',
          params: {
            storeyId: '@ref:storey:Existiert Nicht',
            outline: [
              { x: 0, y: 0 },
              { x: 1000, y: 0 },
              { x: 1000, y: 1000 },
            ],
            name: 'Zone',
          },
          begruendung: 'Referenziert ein nie erzeugtes Geschoss.',
        },
      ],
    };
    useLaufRuntime.getState().starte(plan);
    await wartenBisFertig();

    const state = useLaufRuntime.getState();
    expect(state.status).toBe('fehler');
    expect(state.schritte[0]?.status).toBe('fehler');
    expect(state.schritte[0]?.fehler).toMatch(/@ref:storey:Existiert Nicht/);
    expect(useProject.getState().doc.byKind('zone')).toHaveLength(0);
  });

  it('ein Plan ganz ohne @ref-Platzhalter läuft unverändert durch (Auflösung ist wirkungslos)', async () => {
    useLaufRuntime.getState().starte(geschossPlan(1));
    await wartenBisFertig();
    expect(useLaufRuntime.getState().status).toBe('fertig');
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(1);
  });
});

describe('lauf-runtime — Testhook window.__kosmoLauf', () => {
  it('startet einen Lauf über den Fensterhaken, wie es eine E2E-Kampagne täte', async () => {
    const hook = (window as unknown as {
      __kosmoLauf: { starte: (p: LaufPlan) => void; zustand: () => { status: string } };
    }).__kosmoLauf;
    expect(hook).toBeDefined();
    hook.starte(geschossPlan(1));
    await wartenBisFertig();
    expect(hook.zustand().status).toBe('fertig');
  });
});

/**
 * v0.8.8 PA5 (D4/E4, `docs/V088-SPEZ.md` §2 D4, §3 E4, §6 Sanktion 4, C-7)
 * — der GENERATIONS-GUARD: STALE-WRITE-BEWEIS. Ein Runner, dessen Lauf
 * durch `zuruecksetzen()`/einen neuen `starte()` abgelöst wurde, schreibt
 * NICHTS mehr — weder in den Store noch (über `runCommand`) ins Doc — auch
 * wenn seine `.then()`-Kette im Hintergrund noch weiterläuft.
 */
describe('lauf-runtime — Generations-Guard (D4/E4, v0.8.8 PA5): Stale-Runner-Write wird ignoriert', () => {
  it('starte() → SOFORT zuruecksetzen() (ohne zu warten) → der alte Runner schreibt spaeter weder in den Store noch ins Doc', async () => {
    useLaufRuntime.getState().starte(geschossPlan(3));
    // zuruecksetzen() OHNE zuvor zu warten: der alte Runner hat noch KEINEN
    // einzigen Schritt ausgeführt (sein erster Macrotask-Yield ist noch
    // nicht einmal gefeuert) — genau das D4-Leck-Muster, nur jetzt bewusst
    // provoziert statt versehentlich.
    useLaufRuntime.getState().zuruecksetzen();
    const sofortDanach = useLaufRuntime.getState();
    expect(sofortDanach.plan).toBeNull();
    expect(sofortDanach.status).toBe('offen');

    // Genug Zeit für alle drei Schritte des ALTEN Runners, falls der Guard
    // NICHT griffe (jeder Schritt bräuchte nur einen Macrotask + einen
    // synchronen `runCommand`-Aufruf).
    await warten(50);

    const danach = useLaufRuntime.getState();
    // Der Store blieb der LEERE neue Kontext — keine Schritte, kein Plan.
    expect(danach.plan).toBeNull();
    expect(danach.schritte).toEqual([]);
    expect(danach.status).toBe('offen');
    // Der Beweis, der zählt: das Doc des neuen Kontexts bleibt leer — der
    // alte Runner kam NIE bis zu `runCommand` durch (Generations-Guard in
    // `baueFuehreAus` wirft VOR jedem `runCommand`-Aufruf).
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(0);
    expect(useProject.getState().history.depth).toBe(0);
  });

  it('starte() → SOFORT ein NEUER starte() nach zuruecksetzen(): nur der AKTIVE (neue) Runner schreibt durch', async () => {
    useLaufRuntime.getState().starte(geschossPlan(3)); // wird gleich abgelöst, BEVOR ein Schritt lief
    useLaufRuntime.getState().zuruecksetzen();
    useLaufRuntime.getState().starte(geschossPlan(2)); // der AKTIVE Lauf dieser Generation
    await warten(50);

    const state = useLaufRuntime.getState();
    expect(state.status).toBe('fertig');
    expect(state.schritte).toHaveLength(2);
    expect(state.schritte.every((s) => s.status === 'ok')).toBe(true);
    // GENAU 2 Geschosse (aus dem AKTIVEN 2er-Plan) — der abgelöste 3er-Plan
    // schrieb NICHTS (kein "5 Geschosse"-Leck aus beiden Läufen zusammen).
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(2);
    expect(useProject.getState().history.depth).toBe(2);
  });

  it('starte() → warten(0) (ein Schritt lief bereits) → zuruecksetzen(): der bereits geschriebene Schritt bleibt (kein rückwirkendes Löschen), aber KEIN weiterer Schritt folgt', async () => {
    useLaufRuntime.getState().starte(geschossPlan(3));
    await warten(0); // C-11-Yield: der Runner ist mitten in Schritt 0 (oder schon fertig damit)
    useLaufRuntime.getState().zuruecksetzen();
    const nachReset = useLaufRuntime.getState();
    expect(nachReset.plan).toBeNull();

    const geschosseNachReset = useProject.getState().doc.byKind('storey').length;
    // Höchstens der EINE Schritt, der schon vor dem Reset begonnen haben
    // könnte — NIE mehr (der Generations-Guard verhindert Schritt 1/2).
    expect(geschosseNachReset).toBeLessThanOrEqual(1);

    await warten(50); // dem alten Runner reichlich Zeit geben, falls der Guard versagen würde
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(geschosseNachReset);
    expect(useLaufRuntime.getState().plan).toBeNull(); // Store weiterhin unberührt
  });
});

/**
 * v0.8.8 PA5 «Autopilot-Fortsetzung» (`docs/V088-SPEZ.md` §3 E4, §6
 * Sanktion 4, C-6) — `fortsetzen()`/`wiederholen(index)` gegen den ECHTEN
 * `useProject`-Store. Der Plan ist bewusst STATISCH (`lauf-plan.ts`) — ein
 * Schritt, der wegen fehlender Parameter scheitert (z.B. `elevation`
 * fehlt), würde bei identischen Params IMMER wieder scheitern. Der
 * tragfähige Weg (genau wie im `LaufRunner`-Unit-Test): ein Schritt
 * scheitert, weil er eine `@ref`-Entity braucht, die noch nicht existiert —
 * die Voraussetzung wird MANUELL (über `runCommand`, wie ein Handgriff des
 * Architekten) hergestellt, dann gelingt die Wiederholung/Fortsetzung, weil
 * `baueFuehreAus` die @ref-Auflösung JE SCHRITT frisch gegen den
 * AKTUELLEN Live-Doc laufen lässt (C-13, s. Kopfkommentar oben).
 */
function zonenPlanBrauchtEg(zweiteZoneAuch: boolean): LaufPlan {
  const zoneSchritt = (name: string) => ({
    commandId: 'design.zoneErstellen',
    params: {
      storeyId: '@ref:storey:EG',
      outline: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 4000 },
        { x: 0, y: 4000 },
      ],
      name,
    },
    begruendung: `Braucht ein Geschoss "EG", das dieser Plan selbst NICHT anlegt`,
  });
  return {
    titel: 'Zonen, die ein extern anzulegendes "EG" brauchen',
    schritte: [
      {
        commandId: 'design.geschossErstellen',
        params: { name: 'Anderswo', index: 1, elevation: 3000 },
        begruendung: 'Ein Geschoss, das NICHT "EG" heisst',
      },
      zoneSchritt('Zone A'),
      ...(zweiteZoneAuch ? [zoneSchritt('Zone B')] : []),
    ],
  };
}

function legeEgAn(): void {
  useProject.getState().runCommand('design.geschossErstellen', { name: 'EG', index: 0, elevation: 0 }, { actor: 'architekt' });
}

describe('lauf-runtime — wiederholen(index) (v0.8.8 PA5, E4, C-6)', () => {
  it('wiederholt GENAU den fehlgeschlagenen Schritt; nach Herstellen der Voraussetzung gelingt er, Gesamtstatus wird fertig', async () => {
    const plan = zonenPlanBrauchtEg(false); // nur EINE Zone -> Schritt 1 ist der letzte
    useLaufRuntime.getState().starte(plan);
    await wartenBisFertig();

    let state = useLaufRuntime.getState();
    expect(state.status).toBe('fehler');
    expect(state.schritte[0]?.status).toBe('ok');
    expect(state.schritte[1]?.status).toBe('fehler');
    expect(state.schritte[1]?.fehler).toMatch(/@ref:storey:EG/);
    expect(useProject.getState().doc.byKind('zone')).toHaveLength(0);

    legeEgAn(); // Voraussetzung im Doc herstellen — wie ein Handgriff des Architekten

    useLaufRuntime.getState().wiederholen(1);
    await wartenBisFertig();

    state = useLaufRuntime.getState();
    expect(state.status).toBe('fertig');
    expect(state.schritte.map((s) => s.status)).toEqual(['ok', 'ok']);
    expect(useProject.getState().doc.byKind('zone')).toHaveLength(1);
    // EIN Undo je Schritt: Geschoss "Anderswo" + Geschoss "EG" (Architekt) + Zone = 3.
    expect(useProject.getState().history.depth).toBe(3);
  });

  it('wiederholen() ist ein No-Op ausserhalb Fehler-/Abbruch-Zustand (Sanktion 4) — kein Doppel-Vollzug eines bereits ok-Schritts', async () => {
    useLaufRuntime.getState().starte(geschossPlan(1));
    await wartenBisFertig();
    expect(useLaufRuntime.getState().status).toBe('fertig');

    useLaufRuntime.getState().wiederholen(0);
    await wartenBisFertig();

    expect(useLaufRuntime.getState().status).toBe('fertig');
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(1); // NICHT 2
  });

  it('wiederholen() ohne aktiven Runner ist ein No-Op', () => {
    expect(() => useLaufRuntime.getState().wiederholen(0)).not.toThrow();
    expect(useLaufRuntime.getState().status).toBe('offen');
  });
});

describe('lauf-runtime — fortsetzen() (v0.8.8 PA5, E4, C-6)', () => {
  it('setzt ab dem ersten nicht-ok-Schritt fort und führt die verbleibenden Schritte aus (EIN Undo je Schritt)', async () => {
    const plan = zonenPlanBrauchtEg(true); // ZWEI Zonen brauchen "EG"
    useLaufRuntime.getState().starte(plan);
    await wartenBisFertig();

    let state = useLaufRuntime.getState();
    expect(state.status).toBe('fehler');
    expect(state.schritte.map((s) => s.status)).toEqual(['ok', 'fehler', 'offen']);

    legeEgAn();

    useLaufRuntime.getState().fortsetzen();
    await wartenBisFertig();

    state = useLaufRuntime.getState();
    expect(state.status).toBe('fertig');
    expect(state.schritte.map((s) => s.status)).toEqual(['ok', 'ok', 'ok']);
    expect(useProject.getState().doc.byKind('zone')).toHaveLength(2);
    // EIN Undo je Schritt: "Anderswo" + "EG" (Architekt) + Zone A + Zone B = 4.
    expect(useProject.getState().history.depth).toBe(4);
  });

  it('fortsetzen() nach einem Abbruch VOR jedem Schritt führt den kompletten Plan genau einmal aus (kein Doppel-Vollzug)', async () => {
    useLaufRuntime.getState().starte(geschossPlan(3));
    // Synchroner Abbruch VOR dem ersten Yield (C-11) — kein Schritt lief.
    useLaufRuntime.getState().abbrechen();
    await wartenBisFertig();
    expect(useLaufRuntime.getState().status).toBe('abgebrochen');
    expect(useLaufRuntime.getState().schritte.every((s) => s.status === 'offen')).toBe(true);
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(0);

    useLaufRuntime.getState().fortsetzen();
    await wartenBisFertig();

    const state = useLaufRuntime.getState();
    expect(state.status).toBe('fertig');
    expect(state.schritte.every((s) => s.status === 'ok')).toBe(true);
    // GENAU 3 Geschosse — jeder der 3 Schritte lief GENAU EINMAL.
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(3);
    expect(useProject.getState().history.depth).toBe(3);
  });

  it('fortsetzen() ist ein No-Op ausserhalb Fehler-/Abbruch-Zustand (Sanktion 4)', async () => {
    useLaufRuntime.getState().starte(geschossPlan(1));
    await wartenBisFertig();
    expect(useLaufRuntime.getState().status).toBe('fertig');

    useLaufRuntime.getState().fortsetzen();
    await wartenBisFertig();

    expect(useLaufRuntime.getState().status).toBe('fertig');
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(1); // kein zweiter Lauf
  });

  it('fortsetzen() ohne aktiven Runner ist ein No-Op', () => {
    expect(() => useLaufRuntime.getState().fortsetzen()).not.toThrow();
    expect(useLaufRuntime.getState().status).toBe('offen');
  });
});
