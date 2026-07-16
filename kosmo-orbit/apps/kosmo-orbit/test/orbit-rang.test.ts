import { beforeEach, describe, expect, it } from 'vitest';
import {
  ALLE_TOOL_IDS,
  BASE,
  HYSTERESE_SCHWELLE,
  anfangsKontingent,
  darfUmordnen,
  hatSignifikanteVerschiebung,
  kontingentNachUmordnung,
  kontingentOhneUmordnung,
  naechsteReihenfolge,
  norm,
  raenge,
  sia112Gruppe,
  sitzungsMinute,
  sortiereNachRang,
  tierFuerPosition,
  toolNutzung,
  ueberschreitetHysterese,
  type ToolId,
  type UmordnungsKontingent,
} from '../src/state/orbit-rang';
import type { NutzungsProfil } from '../src/state/oberflaeche-adaption-kern';
import type { SiaPhase } from '@kosmo/kernel';

/**
 * V0.7.2 W2-C — `docs/V072-VISUELLES-UPDATE-SPEZ.md` §4 «Phasen & Ordnung»:
 * BASE-Normierung, Rang-Formel, Hysterese/Anti-Nerv (als Zeitreihen-Test,
 * s. unten). Reine Arithmetik, kein DOM/React.
 */

function leeresProfil(): NutzungsProfil {
  return { zaehler: {}, zuletzt: {} };
}

function profilMit(werte: Partial<Record<ToolId, number>>): NutzungsProfil {
  const zaehler: Record<string, number> = {};
  for (const [id, wert] of Object.entries(werte)) zaehler[`orbit:${id}`] = wert!;
  return { zaehler, zuletzt: {} };
}

describe('sia112Gruppe — SIA-Teilphase → 1..5 (Spec §4)', () => {
  it('deckt alle 8 SiaPhase-Werte exakt nach der Spec-Tabelle ab', () => {
    const erwartet: Record<SiaPhase, number> = {
      strategie: 1,
      wettbewerb: 2,
      vorprojekt: 3,
      bauprojekt: 3,
      bewilligung: 3,
      ausschreibung: 4,
      ausfuehrung: 5,
      abnahme: 5,
    };
    for (const [phase, gruppe] of Object.entries(erwartet) as [SiaPhase, number][]) {
      expect(sia112Gruppe(phase)).toBe(gruppe);
    }
  });
});

describe('BASE-Matrix — 5 Zeilen, wörtlich aus Spec §4', () => {
  it('hat genau 5 Zeilen (eine je SIA-112-Gruppe)', () => {
    expect(BASE).toHaveLength(5);
  });

  it('Zeile 1 (strategie/Gruppe 1): prepare/data/chat dominieren (spec-treu)', () => {
    const zeile = BASE[0]!;
    expect(zeile.prepare).toBe(46);
    expect(zeile.data).toBe(38);
    expect(zeile.chat).toBe(30);
    expect(zeile.prepare).toBeGreaterThan(zeile.viz);
  });

  it('jede Zeile trägt alle 8 ToolIds', () => {
    for (const zeile of BASE) {
      for (const t of ALLE_TOOL_IDS) expect(typeof zeile[t]).toBe('number');
    }
  });
});

describe('norm — Max-Normierung, skaleninvariant', () => {
  it('normiert auf [0,1], Maximum wird zu 1', () => {
    const n = norm({ prepare: 10, data: 5, chat: 0, publish: 0, pipeline: 0, draw: 0, connect: 0, viz: 0 });
    expect(n.prepare).toBe(1);
    expect(n.data).toBe(0.5);
    expect(n.chat).toBe(0);
  });

  it('All-Null-Eingabe liefert überall 0 (kein NaN durch Division/0)', () => {
    const n = norm({ prepare: 0, data: 0, chat: 0, publish: 0, pipeline: 0, draw: 0, connect: 0, viz: 0 });
    for (const t of ALLE_TOOL_IDS) expect(n[t]).toBe(0);
  });

  it('ist skaleninvariant: norm(x) === norm(x·6) — die «6-min-Gewicht»-Bemerkung braucht keine Umrechnung', () => {
    const roh = { prepare: 3, data: 1, chat: 0, publish: 0, pipeline: 0, draw: 0, connect: 0, viz: 0 };
    const skaliert = Object.fromEntries(Object.entries(roh).map(([k, v]) => [k, v * 6])) as Record<ToolId, number>;
    expect(norm(roh)).toEqual(norm(skaliert));
  });
});

describe('raenge/toolNutzung — Rang-Formel 0.6·norm(BASE) + 0.4·norm(nutzung7T)', () => {
  it('ohne jede Nutzung entscheidet die BASE-Matrix allein', () => {
    const r = raenge('strategie', leeresProfil());
    // prepare hat in Zeile 1 den höchsten BASE-Wert (46) UND keine Nutzung —
    // muss also auch den höchsten Rang tragen.
    const bestes = sortiereNachRang(ALLE_TOOL_IDS, r)[0];
    expect(bestes).toBe('prepare');
  });

  it('starke Nutzung kann ein BASE-schwaches Werkzeug nach vorn heben', () => {
    // 'connect' ist in Zeile 1 das schwächste BASE-Werkzeug (6) — mit
    // MAXIMALER Nutzung (alle Klicks auf connect) übernimmt der
    // Nutzungsanteil (0.4 Gewicht) genug, um es zumindest über die anderen
    // ungenutzten Low-BASE-Werkzeuge zu heben.
    const nutzungProConnect = profilMit({ connect: 20 });
    const r = raenge('strategie', nutzungProConnect);
    expect(r.connect).toBeGreaterThan(r.viz); // viz: BASE 4, keine Nutzung
  });

  it('toolNutzung liest 0 für nie genutzte Werkzeuge', () => {
    expect(toolNutzung('viz', leeresProfil())).toBe(0);
    expect(toolNutzung('draw', profilMit({ draw: 3 }))).toBe(3);
  });
});

describe('sortiereNachRang — absteigend, stabil bei Gleichstand', () => {
  it('sortiert absteigend', () => {
    const raengeWert: Record<ToolId, number> = {
      prepare: 0.2,
      data: 0.9,
      chat: 0.5,
      publish: 0,
      pipeline: 0,
      draw: 0,
      connect: 0,
      viz: 0,
    };
    expect(sortiereNachRang(['prepare', 'data', 'chat'], raengeWert)).toEqual(['data', 'chat', 'prepare']);
  });

  it('bleibt bei exaktem Gleichstand in Eingabereihenfolge (stabiler Sort)', () => {
    const raengeWert: Record<ToolId, number> = {
      prepare: 0.5,
      data: 0.5,
      chat: 0,
      publish: 0,
      pipeline: 0,
      draw: 0,
      connect: 0,
      viz: 0,
    };
    expect(sortiereNachRang(['prepare', 'data'], raengeWert)).toEqual(['prepare', 'data']);
  });
});

describe('tierFuerPosition — Grössen-Tiers (Positions-Grenzen; Pixelgrössen je Konsument, s. `TIER_GROESSE`)', () => {
  it('Positionen 0-2 = innen (Top-3), 3-5 = mitte, ab 6 = aussen', () => {
    expect(tierFuerPosition(0)).toBe('innen');
    expect(tierFuerPosition(1)).toBe('innen');
    expect(tierFuerPosition(2)).toBe('innen');
    expect(tierFuerPosition(3)).toBe('mitte');
    expect(tierFuerPosition(5)).toBe('mitte');
    expect(tierFuerPosition(6)).toBe('aussen');
    expect(tierFuerPosition(7)).toBe('aussen');
  });
});

describe('ueberschreitetHysterese / hatSignifikanteVerschiebung — Δ > 0.08', () => {
  it('genau an der Schwelle (0.08) zählt NICHT als signifikant (strikt >)', () => {
    expect(ueberschreitetHysterese(0, HYSTERESE_SCHWELLE)).toBe(false);
  });

  it('knapp über der Schwelle zählt als signifikant', () => {
    expect(ueberschreitetHysterese(0, HYSTERESE_SCHWELLE + 0.001)).toBe(true);
  });

  it('hatSignifikanteVerschiebung: true sobald EIN Werkzeug die Schwelle reisst', () => {
    const alt: Record<ToolId, number> = { prepare: 0.5, data: 0.5, chat: 0, publish: 0, pipeline: 0, draw: 0, connect: 0, viz: 0 };
    const neuKlein: Record<ToolId, number> = { ...alt, prepare: 0.52 };
    const neuGross: Record<ToolId, number> = { ...alt, prepare: 0.7 };
    expect(hatSignifikanteVerschiebung(alt, neuKlein, ['prepare', 'data'])).toBe(false);
    expect(hatSignifikanteVerschiebung(alt, neuGross, ['prepare', 'data'])).toBe(true);
  });
});

describe('darfUmordnen — Anti-Nerv-Kontingent (max 1 je Phasenwechsel/Sitzungsminute)', () => {
  it('erlaubt IMMER beim allerersten Aufruf (letztePhase === null)', () => {
    expect(darfUmordnen(anfangsKontingent(), 'wettbewerb', 0)).toBe(true);
  });

  it('erlaubt IMMER bei einem echten Phasenwechsel, egal wie kurz zuvor schon umsortiert wurde', () => {
    const k = kontingentNachUmordnung('wettbewerb', 0);
    expect(darfUmordnen(k, 'bauprojekt', 100)).toBe(true);
  });

  it('blockiert eine zweite Umsortierung in DERSELBEN Sitzungsminute ohne Phasenwechsel', () => {
    const k = kontingentNachUmordnung('wettbewerb', 0);
    expect(darfUmordnen(k, 'wettbewerb', 30_000)).toBe(false); // 30s später, gleiche Minute
  });

  it('erlaubt wieder, sobald eine neue Sitzungsminute beginnt', () => {
    const k = kontingentNachUmordnung('wettbewerb', 0);
    expect(darfUmordnen(k, 'wettbewerb', 61_000)).toBe(true); // Minute 0 → Minute 1
  });
});

describe('sitzungsMinute', () => {
  it('rundet ms auf ganze Minuten ab', () => {
    expect(sitzungsMinute(0)).toBe(0);
    expect(sitzungsMinute(59_999)).toBe(0);
    expect(sitzungsMinute(60_000)).toBe(1);
  });
});

describe('naechsteReihenfolge — Zeitreihen-Test (Hysterese + Anti-Nerv über mehrere Zyklen)', () => {
  const toolIds: readonly ToolId[] = ['prepare', 'data', 'chat', 'publish'];

  it('t0: erster Aufruf sortiert immer, unabhängig vom Kontingent', () => {
    const ergebnis = naechsteReihenfolge({
      toolIds,
      siaPhase: 'strategie',
      nutzung: leeresProfil(),
      alteReihenfolge: [],
      alteRaenge: null,
      kontingent: anfangsKontingent(),
      jetztMs: 0,
    });
    expect(ergebnis.umgeordnet).toBe(true);
    expect(ergebnis.reihenfolge[0]).toBe('prepare'); // BASE-Sieger Zeile 1, keine Nutzung
  });

  /**
   * Eine durchgehende Zeitreihe (t0..t3, EIN gemeinsamer Nutzungs-/Kontingent-
   * Faden) über bereits ETABLIERTE Nutzung (nicht bei 0 startend) — reali-
   * stischer als Einzelklicks auf ein leeres Profil: ein erster Klick auf ein
   * bis dahin ungenutztes Werkzeug springt bei der Max-Normierung IMMER von 0
   * auf 1 (kein Rauschen möglich, das ist Eigenschaft der Normierung selbst,
   * s. `norm`-Tests oben) — die Hysterese soll ECHTES Rauschen UM eine
   * bestehende Nutzungsverteilung herum abfangen, nicht den allerersten
   * Datenpunkt.
   */
  it('Zeitreihe t0→t3: etablierte Basis, marginale Änderung (t1) bleibt stumm, starke Änderung wird erst nach dem Anti-Nerv-Fenster übernommen (t2→t3)', () => {
    const basisNutzung = profilMit({ prepare: 2, data: 20, chat: 18, publish: 5 });

    // t0 (Minute 0): erster Aufruf, etablierte Basis-Nutzung bevorzugt data
    // trotz stärkerem BASE-Wert von prepare (0.6·BASE + 0.4·Nutzung).
    const t0 = naechsteReihenfolge({
      toolIds,
      siaPhase: 'strategie',
      nutzung: basisNutzung,
      alteReihenfolge: [],
      alteRaenge: null,
      kontingent: anfangsKontingent(),
      jetztMs: 0,
    });
    expect(t0.umgeordnet).toBe(true);
    expect(t0.reihenfolge).toEqual(['data', 'chat', 'prepare', 'publish']);

    // t1 (+30s, marginal +1 Klick auf 'data', bereits stärkstes Werkzeug):
    // die Norm-Verschiebung bleibt für ALLE Werkzeuge unter 0.08 — keine
    // Umsortierung, die angezeigte Basis bleibt exakt t0s Rang-Momentaufnahme
    // (Vergleichsgrundlage für den NÄCHSTEN Zyklus, s. Kopfkommentar der
    // Funktion).
    const t1 = naechsteReihenfolge({
      toolIds,
      siaPhase: 'strategie',
      nutzung: profilMit({ prepare: 2, data: 21, chat: 18, publish: 5 }),
      alteReihenfolge: t0.reihenfolge,
      alteRaenge: t0.raenge,
      kontingent: t0.kontingent,
      jetztMs: 30_000,
    });
    expect(t1.umgeordnet).toBe(false);
    expect(t1.reihenfolge).toEqual(t0.reihenfolge);
    expect(t1.raenge).toEqual(t0.raenge); // Basis unverändert durchgereicht

    // t2 (+5s NACH t0 in Sitzungsminute 0, starke Verschiebung — 'prepare'
    // wird plötzlich stark genutzt): die Hysterese reisst klar (Δ≫0.08 bei
    // mehreren Werkzeugen), aber t0 hat das Kontingent der Minute 0 bereits
    // verbraucht (erster Aufruf zählt als Umsortierung) — Anti-Nerv-Wache
    // blockiert TROTZDEM.
    const starkeNutzung = profilMit({ prepare: 100, data: 21, chat: 18, publish: 5 });
    const t2 = naechsteReihenfolge({
      toolIds,
      siaPhase: 'strategie',
      nutzung: starkeNutzung,
      alteReihenfolge: t1.reihenfolge,
      alteRaenge: t1.raenge,
      kontingent: t1.kontingent,
      jetztMs: 5_000,
    });
    const frischerRang = raenge('strategie', starkeNutzung, toolIds);
    expect(hatSignifikanteVerschiebung(t0.raenge, frischerRang, toolIds)).toBe(true);
    expect(t2.umgeordnet).toBe(false);
    expect(t2.reihenfolge).toEqual(t0.reihenfolge);
    expect(t2.raenge).toEqual(t0.raenge); // Basis bleibt weiter t0 — NICHT stillschweigend verschluckt

    // t3 (Sitzungsminute 1, IDENTISCHE starke Nutzung wie t2): das Anti-Nerv-
    // Fenster ist jetzt frei — dieselbe längst gerissene Hysterese darf sich
    // endlich durchsetzen.
    const t3 = naechsteReihenfolge({
      toolIds,
      siaPhase: 'strategie',
      nutzung: starkeNutzung,
      alteReihenfolge: t2.reihenfolge,
      alteRaenge: t2.raenge,
      kontingent: t2.kontingent,
      jetztMs: 61_000,
    });
    expect(t3.umgeordnet).toBe(true);
    expect(t3.reihenfolge).not.toEqual(t0.reihenfolge);
    expect(t3.reihenfolge[0]).toBe('prepare'); // jetzt sowohl BASE- als auch Nutzungs-Sieger
  });

  it('echter Phasenwechsel schlägt das Anti-Nerv-Kontingent SOFORT, auch in derselben Sitzungsminute', () => {
    const basisNutzung = profilMit({ prepare: 2, data: 20, chat: 18, publish: 5 });
    const t0 = naechsteReihenfolge({
      toolIds,
      siaPhase: 'strategie',
      nutzung: basisNutzung,
      alteReihenfolge: [],
      alteRaenge: null,
      kontingent: anfangsKontingent(),
      jetztMs: 0,
    });

    // Gleiche Nutzung, aber Wechsel in die Ausschreibungs-Phase (SIA-112-
    // Gruppe 4 — publish dominiert dort die BASE-Zeile) — NUR 1s später,
    // dieselbe Sitzungsminute wie t0.
    const t1 = naechsteReihenfolge({
      toolIds,
      siaPhase: 'ausschreibung',
      nutzung: basisNutzung,
      alteReihenfolge: t0.reihenfolge,
      alteRaenge: t0.raenge,
      kontingent: t0.kontingent,
      jetztMs: 1_000,
    });
    expect(t1.umgeordnet).toBe(true);
    expect(t1.reihenfolge).not.toEqual(t0.reihenfolge);
    expect(t1.kontingent.letztePhase).toBe('ausschreibung');
  });
});

describe('kontingentOhneUmordnung — führt letztePhase nach, ohne das Zeitfenster zu verbrauchen', () => {
  it('ein späterer echter Phasenwechsel wird trotz einer Zwischen-Nicht-Umsortierung erkannt', () => {
    const k0 = kontingentNachUmordnung('wettbewerb', 0);
    const kZwischenstand = kontingentOhneUmordnung(k0, 'wettbewerb'); // keine Umsortierung, gleiche Phase
    expect(darfUmordnen(kZwischenstand, 'bauprojekt', 1_000)).toBe(true); // jetzt echter Wechsel
  });
});

describe('Setup-Hygiene', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('profilMit-Testhelfer nutzt dieselbe "orbit:"-Konvention wie toolNutzungMelden', () => {
    const profil = profilMit({ draw: 4 });
    expect(profil.zaehler['orbit:draw']).toBe(4);
  });

  it('UmordnungsKontingent-Typ ist strukturell rund-trip-fähig (kein exactOptionalPropertyTypes-Bruch)', () => {
    const k: UmordnungsKontingent = anfangsKontingent();
    expect(k.letztePhase).toBeNull();
    expect(k.letzteUmordnungMinute).toBeNull();
  });
});
