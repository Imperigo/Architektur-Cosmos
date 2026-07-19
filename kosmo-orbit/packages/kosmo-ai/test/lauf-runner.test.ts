import { describe, expect, it, vi } from 'vitest';
import { LaufRunner, parseLaufPlan, pruefeLaufPlan, type LaufPlan, type LaufSchrittZustand } from '../src';

/**
 * v0.8.5 PA3 «Autopilot-Kern» (`docs/V085-SPEZ.md` §3 E4, C-8) — Unit-Tests
 * für `LaufPlan`/`LaufRunner`. Bewusst KEIN `@kosmo/kernel`-Import: der
 * Runner ist per Entkopplung (Kommentar `lauf-runner.ts`) kernel-frei —
 * `fuehreAus` hier ist immer ein reiner Fake/Spy, nie ein echter `runCommand`.
 */

function planMit(anzahl: number): LaufPlan {
  return {
    titel: 'Test-Lauf',
    schritte: Array.from({ length: anzahl }, (_, i) => ({
      commandId: `design.schritt${i}`,
      params: { index: i },
      begruendung: `Begründung ${i}`,
    })),
  };
}

/** Ein einmal auflösbares Promise — für den «mittendrin abgebrochen»-Test. */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('LaufPlan — Zod-Validierung', () => {
  it('akzeptiert einen validen Plan', () => {
    const ergebnis = pruefeLaufPlan(planMit(2));
    expect(ergebnis.ok).toBe(true);
  });

  it('lehnt einen Plan ohne Titel ab', () => {
    const ergebnis = pruefeLaufPlan({ titel: '', schritte: [{ commandId: 'x', params: {}, begruendung: 'b' }] });
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) expect(ergebnis.error).toMatch(/titel/);
  });

  it('lehnt einen Plan ohne Schritte ab', () => {
    const ergebnis = pruefeLaufPlan({ titel: 'Lauf', schritte: [] });
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) expect(ergebnis.error).toMatch(/schritte/);
  });

  it('lehnt einen Schritt ohne commandId ab', () => {
    const ergebnis = pruefeLaufPlan({ titel: 'Lauf', schritte: [{ commandId: '', params: {}, begruendung: 'b' }] });
    expect(ergebnis.ok).toBe(false);
  });

  it('lehnt einen Schritt ohne begruendung ab', () => {
    const ergebnis = pruefeLaufPlan({ titel: 'Lauf', schritte: [{ commandId: 'x', params: {} }] });
    expect(ergebnis.ok).toBe(false);
  });

  it('lehnt komplett fremdgeformte Eingaben ab (kein Wurf)', () => {
    const ergebnis = pruefeLaufPlan('das ist kein Plan');
    expect(ergebnis.ok).toBe(false);
  });

  it('parseLaufPlan wirft bei ungültiger Eingabe', () => {
    expect(() => parseLaufPlan({ titel: 'x' })).toThrow();
  });

  it('parseLaufPlan liefert den geparsten Plan bei gültiger Eingabe', () => {
    const plan = parseLaufPlan(planMit(1));
    expect(plan.titel).toBe('Test-Lauf');
    expect(plan.schritte).toHaveLength(1);
  });
});

describe('LaufRunner — Happy Path', () => {
  it('führt alle Schritte in Reihenfolge aus und markiert sie ok', async () => {
    const plan = planMit(3);
    const fuehreAus = vi.fn(async (commandId: string) => `erledigt: ${commandId}`);
    const runner = new LaufRunner(plan, fuehreAus);
    await runner.starte();

    expect(runner.schritte.map((s) => s.status)).toEqual(['ok', 'ok', 'ok']);
    expect(runner.schritte.map((s) => s.ergebnis)).toEqual([
      'erledigt: design.schritt0',
      'erledigt: design.schritt1',
      'erledigt: design.schritt2',
    ]);
    expect(runner.gesamtStatus).toBe('fertig');
  });

  it('ruft fuehreAus mit der richtigen commandId und den richtigen params je Schritt auf', async () => {
    const plan = planMit(2);
    const fuehreAus = vi.fn(async () => 'ok');
    const runner = new LaufRunner(plan, fuehreAus);
    await runner.starte();

    expect(fuehreAus).toHaveBeenNthCalledWith(1, 'design.schritt0', { index: 0 });
    expect(fuehreAus).toHaveBeenNthCalledWith(2, 'design.schritt1', { index: 1 });
  });

  it('unterstützt synchrone fuehreAus-Rückgaben (kein Promise-Zwang)', async () => {
    const plan = planMit(1);
    const runner = new LaufRunner(plan, () => 'sofort erledigt');
    await runner.starte();
    expect(runner.schritte[0]).toEqual({ status: 'ok', ergebnis: 'sofort erledigt' });
  });

  it('alle Schritte starten als offen, bevor starte() läuft', () => {
    const plan = planMit(3);
    const runner = new LaufRunner(plan, async () => 'x');
    expect(runner.schritte.every((s) => s.status === 'offen')).toBe(true);
    expect(runner.gesamtStatus).toBe('offen');
  });
});

describe('LaufRunner — Status-Reihenfolge', () => {
  it('meldet für jeden Schritt zuerst laeuft, dann ok — in Plan-Reihenfolge', async () => {
    const plan = planMit(2);
    const beobachtet: string[][] = [];
    const runner = new LaufRunner(plan, async (id) => `x:${id}`, {
      onFortschritt: (schritte) => beobachtet.push(schritte.map((s) => s.status)),
    });
    await runner.starte();

    // Erwartete Sequenz: [laeuft,offen] -> [ok,offen] -> [ok,laeuft] -> [ok,ok]
    expect(beobachtet).toEqual([
      ['laeuft', 'offen'],
      ['ok', 'offen'],
      ['ok', 'laeuft'],
      ['ok', 'ok'],
    ]);
  });

  it('gesamtStatus ist waehrend des Laufs "laeuft"', async () => {
    const d = deferred<string>();
    const plan = planMit(1);
    const runner = new LaufRunner(plan, () => d.promise);
    const lauf = runner.starte();
    // Mikrotask-Yield, damit der erste setStatus('laeuft') greift.
    await Promise.resolve();
    expect(runner.gesamtStatus).toBe('laeuft');
    expect(runner.laeuft).toBe(true);
    d.resolve('fertig');
    await lauf;
    expect(runner.gesamtStatus).toBe('fertig');
    expect(runner.laeuft).toBe(false);
  });
});

describe('LaufRunner — Fehler-Stopp (E4: ehrlich, kein Weiterlaufen)', () => {
  it('stoppt beim ersten Fehler, der Rest bleibt offen', async () => {
    const plan = planMit(3);
    const fuehreAus = vi.fn(async (id: string) => {
      if (id === 'design.schritt1') throw new Error('kaputt');
      return 'ok';
    });
    const runner = new LaufRunner(plan, fuehreAus);
    await runner.starte();

    expect(runner.schritte[0]).toEqual({ status: 'ok', ergebnis: 'ok' });
    expect(runner.schritte[1]).toEqual({ status: 'fehler', fehler: 'kaputt' });
    expect(runner.schritte[2]).toEqual({ status: 'offen' });
    expect(runner.gesamtStatus).toBe('fehler');
    expect(fuehreAus).toHaveBeenCalledTimes(2); // Schritt 3 wurde NIE aufgerufen
  });

  it('fängt auch nicht-Error-Würfe ehrlich als Text ab', async () => {
    const plan = planMit(1);
    const runner = new LaufRunner(plan, () => {
      throw 'einfacher String-Fehler';
    });
    await runner.starte();
    expect(runner.schritte[0]).toEqual({ status: 'fehler', fehler: 'einfacher String-Fehler' });
  });
});

describe('LaufRunner — Abbruch', () => {
  it('C-11 (v0.8.6): abbrechen() im echten Zeitfenster zwischen den Schritt-Yields stoppt den Lauf', async () => {
    const plan = planMit(5);
    const gelaufen: string[] = [];
    const runner = new LaufRunner(plan, (commandId) => {
      gelaufen.push(commandId);
      return 'ok';
    });
    // Start OHNE await, dann einen Macrotask später abbrechen — exakt das
    // Fenster, das der Matrix-Fund verlangte (vorher lief die Schleife über
    // synchrone Commands in EINEM Task durch, ein echter Klick kam nie an).
    const laufPromise = runner.starte();
    await new Promise((r) => setTimeout(r, 0));
    runner.abbrechen();
    await laufPromise;

    expect(runner.gesamtStatus).toBe('abgebrochen');
    expect(gelaufen.length).toBeLessThan(5);
    const stati = runner.schritte.map((s) => s.status);
    expect(stati.filter((st) => st === 'offen').length).toBeGreaterThan(0);
    expect(stati).not.toContain('fehler');
  });

  it('abbrechen() vor dem Start verhindert jeden Schritt', async () => {
    const plan = planMit(2);
    const fuehreAus = vi.fn(async () => 'ok');
    const runner = new LaufRunner(plan, fuehreAus);
    runner.abbrechen();
    await runner.starte();

    expect(fuehreAus).not.toHaveBeenCalled();
    expect(runner.schritte.every((s) => s.status === 'offen')).toBe(true);
    expect(runner.gesamtStatus).toBe('abgebrochen');
    expect(runner.istAbgebrochen).toBe(true);
  });

  it('abbrechen() waehrend Schritt 1 laeuft lässt Schritt 1 ehrlich zu Ende laufen, stoppt aber vor Schritt 2', async () => {
    const d = deferred<string>();
    const plan = planMit(3);
    const fuehreAus = vi.fn((id: string) => (id === 'design.schritt0' ? d.promise : Promise.resolve('ok')));
    const runner = new LaufRunner(plan, fuehreAus);
    const lauf = runner.starte();
    // C-11 (v0.8.6): der Runner yieldet vor jedem Schritt einen Macrotask —
    // ein Microtask reicht nicht mehr, um Schritt 0 auf 'laeuft' zu sehen.
    await new Promise((r) => setTimeout(r, 0)); // Schritt 0 ist jetzt 'laeuft'

    expect(runner.schritte[0]?.status).toBe('laeuft');
    runner.abbrechen();
    d.resolve('schritt 0 fertig');
    await lauf;

    expect(runner.schritte[0]).toEqual({ status: 'ok', ergebnis: 'schritt 0 fertig' });
    expect(runner.schritte[1]).toEqual({ status: 'offen' });
    expect(runner.schritte[2]).toEqual({ status: 'offen' });
    expect(fuehreAus).toHaveBeenCalledTimes(1);
    expect(runner.gesamtStatus).toBe('abgebrochen');
  });

  it('abbrechen() nach vollständigem Lauf ändert nichts mehr am Ergebnis', async () => {
    const plan = planMit(1);
    const runner = new LaufRunner(plan, async () => 'ok');
    await runner.starte();
    runner.abbrechen();
    expect(runner.schritte[0]?.status).toBe('ok');
    expect(runner.gesamtStatus).toBe('fertig');
  });
});

describe('LaufRunner — Einmaligkeit / kein Auto-Start', () => {
  it('ein zweiter starte()-Aufruf ist ein No-Op (kein doppeltes Ausführen)', async () => {
    const plan = planMit(1);
    const fuehreAus = vi.fn(async () => 'ok');
    const runner = new LaufRunner(plan, fuehreAus);
    const ersterLauf = runner.starte();
    const zweiterLauf = runner.starte(); // synchron VOR dem ersten await ausgelöst
    await Promise.all([ersterLauf, zweiterLauf]);

    expect(fuehreAus).toHaveBeenCalledTimes(1);
  });

  it('starte() muss explizit gerufen werden — der Konstruktor führt nichts aus', () => {
    const fuehreAus = vi.fn(async () => 'ok');
    const runner = new LaufRunner(planMit(2), fuehreAus);
    expect(fuehreAus).not.toHaveBeenCalled();
    expect(runner.gesamtStatus).toBe('offen');
    void runner; // Plan existiert, aber nichts lief — C-10-Beweis auf Runner-Ebene.
  });

  it('schritte-Getter liefert eine Kopie — Mutation von aussen berührt den internen Zustand nicht', async () => {
    const plan = planMit(1);
    const runner = new LaufRunner(plan, async () => 'ok');
    await runner.starte();
    const kopie = runner.schritte as LaufSchrittZustand[];
    kopie[0] = { status: 'fehler', fehler: 'manipuliert' };
    expect(runner.schritte[0]?.status).toBe('ok');
  });
});

describe('LaufRunner — fortsetzenAb (v0.8.8 PA5, V088-SPEZ §3 E4, §6 Sanktion 4)', () => {
  it('führt NUR die verbleibenden Schritte ab dem angegebenen Index aus, Rest bis dorthin bleibt unberührt', async () => {
    const plan = planMit(5);
    const fuehreAus = vi.fn(async (id: string) => {
      if (id === 'design.schritt2') throw new Error('kaputt');
      return `erledigt: ${id}`;
    });
    const runner = new LaufRunner(plan, fuehreAus);
    await runner.starte();
    expect(runner.gesamtStatus).toBe('fehler');
    expect(runner.schritte.map((s) => s.status)).toEqual(['ok', 'ok', 'fehler', 'offen', 'offen']);
    fuehreAus.mockClear();

    // "Reparatur" simulieren: derselbe Fake läuft ab jetzt fehlerfrei durch.
    fuehreAus.mockImplementation(async (id: string) => `repariert: ${id}`);
    await runner.fortsetzenAb(2);

    expect(runner.gesamtStatus).toBe('fertig');
    expect(runner.schritte.map((s) => s.status)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok']);
    // Schritt 0/1 liefen NIE erneut — nur die drei verbleibenden (Index 2-4).
    expect(fuehreAus).toHaveBeenCalledTimes(3);
    expect(fuehreAus).toHaveBeenNthCalledWith(1, 'design.schritt2', { index: 2 });
  });

  it('nach einem Abbruch führt fortsetzenAb NUR die noch offenen Schritte aus (kein Doppel-Vollzug)', async () => {
    const plan = planMit(4);
    const gelaufen: string[] = [];
    const runner = new LaufRunner(plan, (id) => {
      gelaufen.push(id);
      return 'ok';
    });
    const lauf = runner.starte();
    await new Promise((r) => setTimeout(r, 0)); // Schritt 0 läuft
    runner.abbrechen();
    await lauf;
    expect(runner.gesamtStatus).toBe('abgebrochen');
    expect(runner.schritte.map((s) => s.status)).toEqual(['ok', 'offen', 'offen', 'offen']);
    gelaufen.length = 0;

    await runner.fortsetzenAb(1);

    expect(runner.gesamtStatus).toBe('fertig');
    expect(runner.schritte.map((s) => s.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
    // GENAU die drei offen gebliebenen Schritte liefen — kein Doppel-Vollzug von Schritt 0.
    expect(gelaufen).toEqual(['design.schritt1', 'design.schritt2', 'design.schritt3']);
  });

  it('bleibt weiterhin unterbrechbar (dieselbe Yield+Abbruch-Mechanik wie starte())', async () => {
    const plan = planMit(5);
    const fuehreAus = vi.fn((id: string) => (id === 'design.schritt1' ? Promise.reject(new Error('x')) : 'ok'));
    const runner = new LaufRunner(plan, fuehreAus);
    await runner.starte();
    expect(runner.gesamtStatus).toBe('fehler');
    fuehreAus.mockClear();
    fuehreAus.mockImplementation(() => 'ok');

    const fortsetzung = runner.fortsetzenAb(1);
    await new Promise((r) => setTimeout(r, 0)); // Schritt 1 (Index 1) läuft jetzt
    runner.abbrechen();
    await fortsetzung;

    expect(runner.gesamtStatus).toBe('abgebrochen');
    const stati = runner.schritte.map((s) => s.status);
    expect(stati[0]).toBe('ok'); // vor dem ursprünglichen Fehler, unberührt
    expect(stati[1]).toBe('ok'); // lief ehrlich zu Ende, bevor der Abbruch griff
    expect(stati.slice(2)).toContain('offen'); // der Rest blieb stehen
  });

  it('wirft, wenn der Runner NICHT in Fehler/Abbruch steht (frisch, noch nie gestartet)', async () => {
    const runner = new LaufRunner(planMit(2), async () => 'ok');
    await expect(runner.fortsetzenAb(0)).rejects.toThrow(/fehler.*abgebrochen|abgebrochen.*fehler/i);
  });

  it('wirft, wenn der Runner bereits fertig ist', async () => {
    const runner = new LaufRunner(planMit(1), async () => 'ok');
    await runner.starte();
    expect(runner.gesamtStatus).toBe('fertig');
    await expect(runner.fortsetzenAb(0)).rejects.toThrow(/fertig/);
  });

  it('wirft, wenn der Runner gerade läuft', async () => {
    const d = deferred<string>();
    const plan = planMit(2);
    const runner = new LaufRunner(plan, () => d.promise);
    const lauf = runner.starte();
    await new Promise((r) => setTimeout(r, 0));
    expect(runner.gesamtStatus).toBe('laeuft');
    await expect(runner.fortsetzenAb(0)).rejects.toThrow();
    d.resolve('fertig');
    await lauf;
  });
});

describe('LaufRunner — wiederholeSchritt (v0.8.8 PA5, V088-SPEZ §3 E4, §6 Sanktion 4)', () => {
  it('wiederholt GENAU einen fehlgeschlagenen Schritt; bei Erfolg wird nur dieser eine Schritt ok', async () => {
    const plan = planMit(3);
    const fuehreAus = vi.fn(async (id: string) => {
      if (id === 'design.schritt1') throw new Error('kaputt');
      return `erledigt: ${id}`;
    });
    const runner = new LaufRunner(plan, fuehreAus);
    await runner.starte();
    expect(runner.schritte.map((s) => s.status)).toEqual(['ok', 'fehler', 'offen']);
    fuehreAus.mockClear();
    fuehreAus.mockImplementation(async (id: string) => `repariert: ${id}`);

    await runner.wiederholeSchritt(1);

    expect(runner.schritte.map((s) => s.status)).toEqual(['ok', 'ok', 'offen']);
    // Schritt 2 blieb unangetastet — GENAU EIN Schritt lief erneut.
    expect(fuehreAus).toHaveBeenCalledTimes(1);
    expect(fuehreAus).toHaveBeenCalledWith('design.schritt1', { index: 1 });
    // Gesamtzustand neu ermittelt: kein 'fehler' mehr im Array, aber Schritt 2
    // noch offen — «angehalten mit Teilergebnis», dieselbe Semantik wie ein
    // regulärer Abbruch (dokumentierter Entscheid, `gesamtStatus`-Kommentar
    // in `lauf-runner.ts`), NICHT 'offen' (das würde «nie begonnen» heissen).
    expect(runner.gesamtStatus).toBe('abgebrochen');
  });

  it('wiederholt einen offen gebliebenen Schritt nach einem Abbruch', async () => {
    const plan = planMit(3);
    const gelaufen: string[] = [];
    const runner = new LaufRunner(plan, (id) => {
      gelaufen.push(id);
      return 'ok';
    });
    const lauf = runner.starte();
    await new Promise((r) => setTimeout(r, 0));
    runner.abbrechen();
    await lauf;
    expect(runner.schritte.map((s) => s.status)).toEqual(['ok', 'offen', 'offen']);
    gelaufen.length = 0;

    await runner.wiederholeSchritt(1);

    expect(runner.schritte[1]?.status).toBe('ok');
    expect(runner.schritte[2]?.status).toBe('offen'); // NUR Schritt 1 lief
    expect(gelaufen).toEqual(['design.schritt1']);
  });

  it('bleibt bei erneutem Scheitern ehrlich fehler — kein stiller Erfolg vorgetäuscht', async () => {
    const plan = planMit(2);
    const runner = new LaufRunner(plan, () => {
      throw new Error('immer noch kaputt');
    });
    await runner.starte();
    expect(runner.schritte[0]).toEqual({ status: 'fehler', fehler: 'immer noch kaputt' });

    await runner.wiederholeSchritt(0);
    expect(runner.schritte[0]).toEqual({ status: 'fehler', fehler: 'immer noch kaputt' });
    expect(runner.gesamtStatus).toBe('fehler');
  });

  it('wirft für einen Index, der bereits ok ist (kein Doppel-Vollzug)', async () => {
    const plan = planMit(2);
    const fuehreAus = vi.fn(async (id: string) => {
      if (id === 'design.schritt1') throw new Error('kaputt');
      return 'ok';
    });
    const runner = new LaufRunner(plan, fuehreAus);
    await runner.starte();
    expect(runner.schritte[0]?.status).toBe('ok');
    fuehreAus.mockClear();

    await expect(runner.wiederholeSchritt(0)).rejects.toThrow(/ok/);
    expect(fuehreAus).not.toHaveBeenCalled(); // der bereits erledigte Schritt 0 lief NICHT erneut
  });

  it('wirft, wenn der Runner NICHT in Fehler/Abbruch steht', async () => {
    const runner = new LaufRunner(planMit(2), async () => 'ok');
    await expect(runner.wiederholeSchritt(0)).rejects.toThrow();
  });

  it('nutzt dieselbe Macrotask-Yield-Mechanik wie starte() — der Schritt ist erst NACH dem Yield "laeuft"', async () => {
    const plan = planMit(1);
    let anzahl = 0;
    const runner = new LaufRunner(plan, () => {
      anzahl++;
      if (anzahl === 1) throw new Error('erst kaputt');
      return 'repariert';
    });
    await runner.starte();
    expect(runner.gesamtStatus).toBe('fehler');

    const wiederholung = runner.wiederholeSchritt(0);
    // Direkt nach dem Aufruf (noch VOR dem Macrotask-Yield) ist der Schritt
    // noch NICHT auf 'laeuft' — derselbe Vertrag wie starte()s erster Schritt.
    expect(runner.schritte[0]?.status).toBe('fehler');
    await wiederholung;
    expect(runner.schritte[0]?.status).toBe('ok');
  });
});
