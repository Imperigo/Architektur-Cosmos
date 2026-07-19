// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
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

function warten(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    await warten(10);

    const state = useLaufRuntime.getState();
    expect(state.status).toBe('fertig');
    expect(state.schritte.map((s) => s.status)).toEqual(['ok', 'ok']);
    expect(useProject.getState().doc.byKind('storey')).toHaveLength(2);
  });

  it('jeder Schritt hinterlässt eine EIGENE Undo-Gruppe (nicht eine gemeinsame)', async () => {
    useLaufRuntime.getState().starte(geschossPlan(3));
    await warten(10);

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
    await warten(10);
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
    await warten(10);

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
    await warten(10);

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
  it('ein zweiter starte()-Aufruf waehrend "laeuft" wird ignoriert', () => {
    useLaufRuntime.getState().starte(geschossPlan(3));
    // Synchron NOCH VOR dem ersten Resume (Status ist jetzt entweder 'laeuft'
    // oder direkt schon fortgeschritten) — ein zweiter starte()-Aufruf mit
    // einem KOMPLETT anderen Plan darf den ersten laufenden Lauf nicht
    // ersetzen.
    const ersterPlan = useLaufRuntime.getState().plan;
    useLaufRuntime.getState().starte(geschossPlan(1));
    expect(useLaufRuntime.getState().plan).toBe(ersterPlan);
  });
});

describe('lauf-runtime — zuruecksetzen()', () => {
  it('räumt den Store nach einem abgeschlossenen Lauf auf', async () => {
    useLaufRuntime.getState().starte(geschossPlan(1));
    await warten(10);
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
    await warten(10);

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
    await warten(10);

    const state = useLaufRuntime.getState();
    expect(state.status).toBe('fehler');
    expect(state.schritte[0]?.status).toBe('fehler');
    expect(state.schritte[0]?.fehler).toMatch(/@ref:storey:Existiert Nicht/);
    expect(useProject.getState().doc.byKind('zone')).toHaveLength(0);
  });

  it('ein Plan ganz ohne @ref-Platzhalter läuft unverändert durch (Auflösung ist wirkungslos)', async () => {
    useLaufRuntime.getState().starte(geschossPlan(1));
    await warten(10);
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
    await warten(10);
    expect(hook.zustand().status).toBe('fertig');
  });
});
