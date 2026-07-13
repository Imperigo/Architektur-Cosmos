// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * v0.7.7 Stream B1 — `shell/governance-speicher.ts`: die persistente
 * localStorage-Allowlist hinter der GovernanceGate-Stufe «Für den Job
 * erlauben». Deckt genau die Owner-Anforderung ab: die Erlaubnis überlebt
 * einen Reload (hier simuliert durch einen frischen `import()` nach echtem
 * `localStorage.setItem`/`.getItem`) und endet NUR über einen expliziten
 * Widerruf — nie von selbst.
 *
 * v0.7.8 Welle D (PD2) — ergänzt um die zwei ehrlichen Auto-Wege (s.
 * Kopfkommentar der Quelle): `alleWiderrufen(art)` (art-scoped statt immer
 * beide Arten) und `pruefeAutoWiderruf` (die reine Entscheidung hinter dem
 * Vis-Auto-Widerruf in `Companion.tsx`, hier OHNE React/DOM getestet).
 */

const SPEICHER_KEY = 'kosmo.governance.fuerJob';

beforeEach(() => {
  localStorage.clear();
});

describe('istFuerJobErlaubt / erlaubeFuerJob — Grundverhalten', () => {
  it('ist anfangs für jede Art/ID nicht erlaubt', async () => {
    const { istFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    expect(istFuerJobErlaubt('command', 'wall.add')).toBe(false);
    expect(istFuerJobErlaubt('vis', 'node-1')).toBe(false);
  });

  it('erlaubeFuerJob trägt die ID ein, istFuerJobErlaubt sieht sie sofort', async () => {
    const { istFuerJobErlaubt, erlaubeFuerJob } = await import('../src/shell/governance-speicher');
    erlaubeFuerJob('command', 'wall.add');
    expect(istFuerJobErlaubt('command', 'wall.add')).toBe(true);
    // Andere Art/ID bleibt unberührt.
    expect(istFuerJobErlaubt('vis', 'wall.add')).toBe(false);
    expect(istFuerJobErlaubt('command', 'wall.remove')).toBe(false);
  });

  it('erlaubeFuerJob ist wirkungslos (idempotent), wenn schon erlaubt', async () => {
    const { erlaubeFuerJob, alleFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    erlaubeFuerJob('command', 'wall.add');
    erlaubeFuerJob('command', 'wall.add');
    expect(alleFuerJobErlaubt('command')).toEqual(['wall.add']);
  });

  it('trennt "command" und "vis" strikt, auch bei identischer ID', async () => {
    const { istFuerJobErlaubt, erlaubeFuerJob } = await import('../src/shell/governance-speicher');
    erlaubeFuerJob('command', 'geteilte-id');
    expect(istFuerJobErlaubt('command', 'geteilte-id')).toBe(true);
    expect(istFuerJobErlaubt('vis', 'geteilte-id')).toBe(false);
  });
});

describe('widerrufeFuerJob — der einzige reguläre Weg, wie eine Erlaubnis endet', () => {
  it('entfernt genau die eine ID, andere bleiben erlaubt', async () => {
    const { erlaubeFuerJob, widerrufeFuerJob, istFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    erlaubeFuerJob('command', 'wall.add');
    erlaubeFuerJob('command', 'wall.remove');
    widerrufeFuerJob('command', 'wall.add');
    expect(istFuerJobErlaubt('command', 'wall.add')).toBe(false);
    expect(istFuerJobErlaubt('command', 'wall.remove')).toBe(true);
  });

  it('ist wirkungslos, wenn die ID gar nie erlaubt war', async () => {
    const { widerrufeFuerJob, istFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    expect(() => widerrufeFuerJob('vis', 'node-x')).not.toThrow();
    expect(istFuerJobErlaubt('vis', 'node-x')).toBe(false);
  });
});

describe('alleWiderrufen — räumt beide Arten in einem Zug', () => {
  it('löscht alle command- UND vis-Einträge', async () => {
    const { erlaubeFuerJob, alleWiderrufen, istFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    erlaubeFuerJob('command', 'wall.add');
    erlaubeFuerJob('vis', 'node-1');
    alleWiderrufen();
    expect(istFuerJobErlaubt('command', 'wall.add')).toBe(false);
    expect(istFuerJobErlaubt('vis', 'node-1')).toBe(false);
  });
});

describe('alleFuerJobErlaubt — Liste zum Einlesen beim Mount', () => {
  it('liefert leer, wenn noch nichts erlaubt ist', async () => {
    const { alleFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    expect(alleFuerJobErlaubt('command')).toEqual([]);
  });

  it('liefert alle erlaubten IDs der jeweiligen Art', async () => {
    const { erlaubeFuerJob, alleFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    erlaubeFuerJob('vis', 'node-1');
    erlaubeFuerJob('vis', 'node-2');
    erlaubeFuerJob('command', 'wall.add');
    expect(alleFuerJobErlaubt('vis').slice().sort()).toEqual(['node-1', 'node-2']);
    expect(alleFuerJobErlaubt('command')).toEqual(['wall.add']);
  });
});

describe('Persistenz über einen "Reload" hinweg (Owner-Kernanforderung)', () => {
  it('eine Erlaubnis übersteht einen frischen Modul-Import (simulierter Reload)', async () => {
    const mod1 = await import('../src/shell/governance-speicher');
    mod1.erlaubeFuerJob('vis', 'node-42');

    // Simuliert einen Reload: Modul-Cache umgehen, indem wir NUR über den
    // echten localStorage (der einen Reload überlebt) neu lesen — genau das,
    // was `istFuerJobErlaubt`/`alleFuerJobErlaubt` bei jedem Aufruf frisch
    // aus `localStorage` tun (kein In-Memory-Cache in diesem Modul).
    expect(localStorage.getItem(SPEICHER_KEY)).toContain('node-42');
    expect(mod1.istFuerJobErlaubt('vis', 'node-42')).toBe(true);
    expect(mod1.alleFuerJobErlaubt('vis')).toEqual(['node-42']);
  });

  it('bleibt erlaubt bis zum expliziten Widerruf, NICHT von selbst', async () => {
    const { erlaubeFuerJob, istFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    erlaubeFuerJob('command', 'wall.add');
    // Mehrere weitere Abfragen über "Zeit" (keine TTL/Ablauf im Speicher) —
    // bleibt erlaubt, bis `widerrufeFuerJob`/`alleWiderrufen` aufgerufen wird.
    for (let i = 0; i < 5; i++) {
      expect(istFuerJobErlaubt('command', 'wall.add')).toBe(true);
    }
  });
});

describe('alleWiderrufen(art) — räumt NUR eine Art, wenn angegeben (v0.7.8 Welle D)', () => {
  it('räumt nur "command", "vis" bleibt unberührt', async () => {
    const { erlaubeFuerJob, alleWiderrufen, istFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    erlaubeFuerJob('command', 'wall.add');
    erlaubeFuerJob('vis', 'node-1');
    alleWiderrufen('command');
    expect(istFuerJobErlaubt('command', 'wall.add')).toBe(false);
    expect(istFuerJobErlaubt('vis', 'node-1')).toBe(true);
  });

  it('räumt nur "vis", "command" bleibt unberührt', async () => {
    const { erlaubeFuerJob, alleWiderrufen, istFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    erlaubeFuerJob('command', 'wall.add');
    erlaubeFuerJob('vis', 'node-1');
    alleWiderrufen('vis');
    expect(istFuerJobErlaubt('vis', 'node-1')).toBe(false);
    expect(istFuerJobErlaubt('command', 'wall.add')).toBe(true);
  });

  it('ohne Argument bleibt das bisherige Verhalten (beide Arten)', async () => {
    const { erlaubeFuerJob, alleWiderrufen, istFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    erlaubeFuerJob('command', 'wall.add');
    erlaubeFuerJob('vis', 'node-1');
    alleWiderrufen();
    expect(istFuerJobErlaubt('command', 'wall.add')).toBe(false);
    expect(istFuerJobErlaubt('vis', 'node-1')).toBe(false);
  });
});

describe('pruefeAutoWiderruf — reine Entscheidung für den Vis-Auto-Widerruf (v0.7.8 Welle D/PD2)', () => {
  it('terminal + keine weiteren offenen Läufe → Widerruf', async () => {
    const { pruefeAutoWiderruf } = await import('../src/shell/governance-speicher');
    expect(pruefeAutoWiderruf(true, 'fertig', 0)).toBe(true);
  });

  it('gilt für alle vier Terminalstatus, nicht nur "fertig"', async () => {
    const { pruefeAutoWiderruf } = await import('../src/shell/governance-speicher');
    expect(pruefeAutoWiderruf(true, 'fehler', 0)).toBe(true);
    expect(pruefeAutoWiderruf(true, 'abgebrochen', 0)).toBe(true);
    expect(pruefeAutoWiderruf(true, 'zeitueberschreitung', 0)).toBe(true);
  });

  it('terminal, aber noch ein weiterer offener Lauf auf demselben Knoten → kein Widerruf', async () => {
    const { pruefeAutoWiderruf } = await import('../src/shell/governance-speicher');
    expect(pruefeAutoWiderruf(true, 'fertig', 1)).toBe(false);
  });

  it('offener Status (kein Übergang zu terminal) → kein Widerruf', async () => {
    const { pruefeAutoWiderruf } = await import('../src/shell/governance-speicher');
    expect(pruefeAutoWiderruf(true, 'rendert', 0)).toBe(false);
    expect(pruefeAutoWiderruf(true, 'wartetFreigabe', 0)).toBe(false);
  });

  it('Knoten war gar nicht auf der Allowlist → no-op, egal welcher Status', async () => {
    const { pruefeAutoWiderruf } = await import('../src/shell/governance-speicher');
    expect(pruefeAutoWiderruf(false, 'fertig', 0)).toBe(false);
  });

  it('`weitereOffeneLaeufe` defaultet auf 0 (heutiges Datenmodell: ein Lauf je Knoten)', async () => {
    const { pruefeAutoWiderruf } = await import('../src/shell/governance-speicher');
    expect(pruefeAutoWiderruf(true, 'fertig')).toBe(true);
  });

  it('ist eine reine Funktion — ruft NICHT selbst widerrufeFuerJob auf (kein Effekt auf den Speicher)', async () => {
    const { pruefeAutoWiderruf, erlaubeFuerJob, istFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    erlaubeFuerJob('vis', 'node-9');
    pruefeAutoWiderruf(true, 'fertig', 0);
    // Der Speicher bleibt unverändert — der Aufrufer (Companion.tsx) muss
    // bei `true` selbst `widerrufeFuerJob` aufrufen.
    expect(istFuerJobErlaubt('vis', 'node-9')).toBe(true);
  });
});

describe('Robustheit — kaputtes/fremdes JSON im Speicher-Key', () => {
  it('fällt bei ungültigem JSON auf einen leeren Speicher zurück statt zu werfen', async () => {
    localStorage.setItem(SPEICHER_KEY, '{nicht json');
    const { istFuerJobErlaubt, alleFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    expect(() => istFuerJobErlaubt('command', 'x')).not.toThrow();
    expect(istFuerJobErlaubt('command', 'x')).toBe(false);
    expect(alleFuerJobErlaubt('vis')).toEqual([]);
  });

  it('ignoriert fremdgeformte Werte (z.B. Zahlen statt Strings) statt zu werfen', async () => {
    localStorage.setItem(SPEICHER_KEY, JSON.stringify({ command: [1, 'wall.add'], vis: 'kein-array' }));
    const { istFuerJobErlaubt, alleFuerJobErlaubt } = await import('../src/shell/governance-speicher');
    expect(() => alleFuerJobErlaubt('command')).not.toThrow();
    expect(alleFuerJobErlaubt('vis')).toEqual([]);
    // Gemischtes Array (Zahl + String) wird als Ganzes verworfen (Ehrlichkeit
    // vor Politur — kein Teil-Vertrauen in eine korrupte Struktur).
    expect(istFuerJobErlaubt('command', 'wall.add')).toBe(false);
  });
});
